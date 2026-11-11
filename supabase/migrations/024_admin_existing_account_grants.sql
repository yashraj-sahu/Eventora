-- Admin access lifecycle corrections. Existing Auth identities are granted
-- access atomically without changing passwords or other workspace memberships.

ALTER TABLE public.admin_invitations
  ADD COLUMN IF NOT EXISTS last_resent_at timestamptz;

CREATE OR REPLACE FUNCTION public.audit_admin_invitation_resent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.last_resent_at IS DISTINCT FROM OLD.last_resent_at AND NEW.last_resent_at IS NOT NULL THEN
    INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, reason, after_data)
    VALUES (NULL, 'administrator_invitation_resent', 'admin_invitation', NEW.id::text,
      'Invitee requested a fresh email verification code.',
      jsonb_build_object('email', NEW.email, 'admin_role', NEW.admin_role, 'last_resent_at', NEW.last_resent_at));
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.audit_admin_invitation_resent() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS admin_invitation_resent_audit ON public.admin_invitations;
CREATE TRIGGER admin_invitation_resent_audit
  AFTER UPDATE OF last_resent_at ON public.admin_invitations
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_invitation_resent();

CREATE OR REPLACE FUNCTION public.grant_admin_access(
  p_user_id uuid,
  p_admin_role text,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  target_email text;
  prior_membership jsonb;
  prior_assignment jsonb;
  was_active boolean := false;
BEGIN
  IF NOT public.is_evntora_owner() THEN
    RAISE EXCEPTION 'Platform Owner access required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_user_id = auth.uid()
     OR p_admin_role IS NULL
     OR p_admin_role NOT IN ('super_admin','vendor_moderator','support_admin','finance_admin')
     OR length(trim(coalesce(p_reason, ''))) < 3 OR length(p_reason) > 1000 THEN
    RAISE EXCEPTION 'Invalid administrator grant' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_role_permissions AS role_permission
    JOIN public.admin_permissions AS permission ON permission.permission = role_permission.permission
    WHERE role_permission.admin_role = p_admin_role
  ) THEN
    RAISE EXCEPTION 'The selected administrator role has no configured permissions' USING ERRCODE = '23514';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('admin-user:' || p_user_id::text));

  SELECT lower(u.email) INTO target_email
  FROM auth.users AS u
  WHERE u.id = p_user_id AND u.email_confirmed_at IS NOT NULL;
  IF target_email IS NULL THEN
    RAISE EXCEPTION 'An existing verified account is required' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_roles AS role
    WHERE role.user_id = p_user_id AND role.role = 'platform_owner'
  ) THEN
    RAISE EXCEPTION 'Platform Owner access cannot be changed here' USING ERRCODE = '42501';
  END IF;

  SELECT to_jsonb(role), role.is_active INTO prior_membership, was_active
  FROM public.user_roles AS role
  WHERE role.user_id = p_user_id AND role.role = 'admin'
  FOR UPDATE;
  SELECT to_jsonb(assignment) INTO prior_assignment
  FROM public.admin_role_assignments AS assignment
  WHERE assignment.user_id = p_user_id AND assignment.admin_role = p_admin_role
  FOR UPDATE;

  INSERT INTO public.user_roles(user_id, role, is_active, granted_by)
  VALUES (p_user_id, 'admin', true, auth.uid())
  ON CONFLICT (user_id, role) DO UPDATE
    SET is_active = true, granted_by = EXCLUDED.granted_by;

  -- A suspended administrator is reactivated with the explicitly selected role;
  -- other historical assignments stay revoked. Active admins retain other roles.
  IF NOT coalesce(was_active, false) THEN
    UPDATE public.admin_role_assignments
    SET is_active = false, updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
  INSERT INTO public.admin_role_assignments(user_id, admin_role, is_active, granted_by, updated_at)
  VALUES (p_user_id, p_admin_role, true, auth.uid(), now())
  ON CONFLICT (user_id, admin_role) DO UPDATE
    SET is_active = true, granted_by = EXCLUDED.granted_by, updated_at = now();

  -- A direct grant supersedes any outstanding invitation for this identity.
  UPDATE public.admin_invitations
  SET revoked_at = now()
  WHERE lower(email) = target_email
    AND accepted_at IS NULL AND revoked_at IS NULL AND expired_at IS NULL
    AND expires_at > now();

  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, reason, before_data, after_data)
  VALUES (auth.uid(), 'administrator_access_granted', 'administrator', p_user_id::text,
    trim(p_reason),
    jsonb_build_object('membership', prior_membership, 'assignment', prior_assignment),
    jsonb_build_object('admin_role', p_admin_role, 'membership_active', true));
  PERFORM public.emit_admin_notification('admin_management', 'administrator_role_assigned',
    'Administrator access granted', 'Administrator access was granted by the Platform Owner.',
    'administrator', p_user_id::text,
    'administrator-access-granted:' || p_user_id::text || ':' || p_admin_role || ':' || clock_timestamp()::text);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.grant_admin_access(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_admin_access(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_admin_assignment_reasoned(
  p_user_id uuid,
  p_admin_role text,
  p_active boolean,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE prior jsonb;
BEGIN
  IF NOT public.is_evntora_owner() THEN
    RAISE EXCEPTION 'Platform Owner access required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_user_id = auth.uid() OR p_active IS NULL
     OR p_admin_role IS NULL
     OR p_admin_role NOT IN ('super_admin','vendor_moderator','support_admin','finance_admin')
     OR length(trim(coalesce(p_reason, ''))) < 3 OR length(p_reason) > 1000
     OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'platform_owner') THEN
    RAISE EXCEPTION 'Invalid administrator role change' USING ERRCODE = '22023';
  END IF;
  IF p_active AND NOT EXISTS (
    SELECT 1 FROM public.admin_role_permissions AS role_permission
    JOIN public.admin_permissions AS permission ON permission.permission = role_permission.permission
    WHERE role_permission.admin_role = p_admin_role
  ) THEN
    RAISE EXCEPTION 'The selected administrator role has no configured permissions' USING ERRCODE = '23514';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('admin-user:' || p_user_id::text));
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin' AND is_active) THEN
    RAISE EXCEPTION 'Active administrator membership is required' USING ERRCODE = '42501';
  END IF;
  IF p_active AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'A verified account is required' USING ERRCODE = '42501';
  END IF;
  SELECT to_jsonb(assignment) INTO prior
  FROM public.admin_role_assignments AS assignment
  WHERE user_id = p_user_id AND admin_role = p_admin_role
  FOR UPDATE;
  INSERT INTO public.admin_role_assignments(user_id, admin_role, is_active, granted_by, updated_at)
  VALUES (p_user_id, p_admin_role, p_active, auth.uid(), now())
  ON CONFLICT (user_id, admin_role) DO UPDATE
    SET is_active = EXCLUDED.is_active, granted_by = EXCLUDED.granted_by, updated_at = now();
  IF NOT p_active AND NOT EXISTS (
    SELECT 1 FROM public.admin_role_assignments AS assignment
    WHERE assignment.user_id = p_user_id AND assignment.is_active
  ) THEN
    -- With no active scoped assignment, the identity must no longer pass
    -- legacy admin-role gates that check only user_roles.
    UPDATE public.user_roles SET is_active = false
    WHERE user_id = p_user_id AND role = 'admin';
  END IF;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, reason, before_data, after_data)
  VALUES (auth.uid(), CASE WHEN p_active THEN 'administrator_role_assigned' ELSE 'administrator_role_revoked' END,
    'administrator', p_user_id::text, trim(p_reason), prior,
    jsonb_build_object('admin_role', p_admin_role, 'is_active', p_active));
  PERFORM public.emit_admin_notification('admin_management',
    CASE WHEN p_active THEN 'administrator_role_assigned' ELSE 'administrator_role_revoked' END,
    CASE WHEN p_active THEN 'Administrator role assigned' ELSE 'Administrator role revoked' END,
    'An administrator role assignment changed.', 'administrator', p_user_id::text,
    'administrator-role-change:' || p_user_id::text || ':' || p_admin_role || ':' || p_active::text || ':' || clock_timestamp()::text);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.set_admin_assignment_reasoned(uuid, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_admin_assignment_reasoned(uuid, text, boolean, text) TO authenticated;
REVOKE ALL ON FUNCTION public.set_admin_assignment(uuid, text, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_admin_membership_reasoned(
  p_user_id uuid,
  p_active boolean,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  prior jsonb;
  membership_changed boolean;
BEGIN
  IF NOT public.is_evntora_owner() THEN
    RAISE EXCEPTION 'Platform Owner access required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_user_id = auth.uid() OR p_active IS NULL
     OR length(trim(coalesce(p_reason, ''))) < 3 OR length(p_reason) > 1000
     OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'platform_owner') THEN
    RAISE EXCEPTION 'Invalid administrator membership change' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('admin-user:' || p_user_id::text));
  SELECT to_jsonb(role) INTO prior
  FROM public.user_roles AS role
  WHERE user_id = p_user_id AND role = 'admin'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Administrator membership not found' USING ERRCODE = 'P0002'; END IF;
  IF p_active AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'A verified account is required' USING ERRCODE = '42501';
  END IF;
  IF p_active AND NOT EXISTS (
    SELECT 1 FROM public.admin_role_assignments
    WHERE user_id = p_user_id AND is_active
  ) THEN
    RAISE EXCEPTION 'Assign an authorized admin role before restoring membership' USING ERRCODE = '42501';
  END IF;
  UPDATE public.user_roles SET is_active = p_active WHERE user_id = p_user_id AND role = 'admin';
  membership_changed := FOUND;
  -- Admin membership is the suspension switch. Preserve each role assignment's
  -- active/revoked state so restoration cannot revive a role previously revoked.
  IF NOT p_active THEN
    UPDATE public.admin_invitations SET revoked_at = now()
    WHERE (target_user_id = p_user_id OR lower(email) = (SELECT lower(email) FROM auth.users WHERE id = p_user_id))
      AND accepted_at IS NULL AND revoked_at IS NULL AND expired_at IS NULL AND expires_at > now();
  END IF;
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, reason, before_data, after_data)
  VALUES (auth.uid(), CASE WHEN p_active THEN 'administrator_reactivated' ELSE 'administrator_suspended' END,
    'administrator', p_user_id::text, trim(p_reason), prior, jsonb_build_object('is_active', p_active));
  IF membership_changed THEN
    PERFORM public.emit_admin_notification('admin_management',
      CASE WHEN p_active THEN 'administrator_reactivated' ELSE 'administrator_suspended' END,
      CASE WHEN p_active THEN 'Administrator access restored' ELSE 'Administrator access suspended' END,
      'Administrator access changed by the Platform Owner.', 'administrator', p_user_id::text,
      'administrator-membership-change:' || p_user_id::text || ':' || p_active::text || ':' || clock_timestamp()::text);
  END IF;
  RETURN membership_changed;
END;
$$;
REVOKE ALL ON FUNCTION public.set_admin_membership_reasoned(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_admin_membership_reasoned(uuid, boolean, text) TO authenticated;
REVOKE ALL ON FUNCTION public.set_admin_membership(uuid, boolean) FROM PUBLIC, anon, authenticated;
