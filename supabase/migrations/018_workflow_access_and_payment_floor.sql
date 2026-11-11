-- Phase 6/booking workflow corrections.
-- Apply after migrations 016 and 017. Forward-only and additive.

-- A direct role assignment by the Platform Owner may onboard an existing,
-- email-verified Auth account. Suspended admin memberships stay suspended and
-- must be restored through set_admin_membership explicitly.
CREATE OR REPLACE FUNCTION public.set_admin_assignment(
  p_user_id uuid,
  p_admin_role text,
  p_active boolean
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
  prior_assignment jsonb;
  membership_active boolean;
  membership_found boolean;
  verified_user boolean;
BEGIN
  IF NOT public.is_evntora_owner() THEN
    RAISE EXCEPTION 'Platform Owner access required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_active IS NULL OR p_user_id = auth.uid()
     OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p_user_id AND r.role = 'platform_owner') THEN
    RAISE EXCEPTION 'Platform Owner membership cannot be changed through administrator role assignment' USING ERRCODE = '42501';
  END IF;
  IF p_admin_role IS NULL OR p_admin_role NOT IN ('super_admin','vendor_moderator','support_admin','finance_admin') THEN
    RAISE EXCEPTION 'Invalid administrator role' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = p_user_id AND u.email_confirmed_at IS NOT NULL
  ) INTO verified_user;
  IF p_active AND NOT verified_user THEN
    RAISE EXCEPTION 'A verified Auth account is required' USING ERRCODE = '42501';
  END IF;

  SELECT r.is_active INTO membership_active
  FROM public.user_roles r WHERE r.user_id = p_user_id AND r.role = 'admin' FOR UPDATE;
  membership_found := FOUND;
  IF p_active AND membership_found AND NOT membership_active THEN
    RAISE EXCEPTION 'Administrator membership is suspended; restore access before assigning a role' USING ERRCODE = '55000';
  END IF;
  IF p_active AND NOT membership_found THEN
    INSERT INTO public.user_roles(user_id, role, is_active, granted_by)
    VALUES (p_user_id, 'admin', true, auth.uid())
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  IF p_active THEN
    SELECT r.is_active INTO membership_active
    FROM public.user_roles r WHERE r.user_id = p_user_id AND r.role = 'admin' FOR UPDATE;
    IF NOT FOUND OR NOT membership_active THEN
      RAISE EXCEPTION 'Administrator membership is suspended; restore access before assigning a role' USING ERRCODE = '55000';
    END IF;
  END IF;

  SELECT to_jsonb(a) INTO prior_assignment
  FROM public.admin_role_assignments a
  WHERE a.user_id = p_user_id AND a.admin_role = p_admin_role
  FOR UPDATE;

  INSERT INTO public.admin_role_assignments(user_id, admin_role, is_active, granted_by, updated_at)
  VALUES (p_user_id, p_admin_role, p_active, auth.uid(), now())
  ON CONFLICT (user_id, admin_role) DO UPDATE
    SET is_active = EXCLUDED.is_active, granted_by = EXCLUDED.granted_by, updated_at = now();

  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, before_data, after_data)
  VALUES (
    auth.uid(),
    CASE WHEN p_active THEN 'administrator_role_assigned' ELSE 'administrator_role_revoked' END,
    'administrator', p_user_id::text, prior_assignment,
    jsonb_build_object('admin_role', p_admin_role, 'is_active', p_active)
  );
  PERFORM public.emit_admin_notification(
    'admin_management',
    CASE WHEN p_active THEN 'administrator_role_assigned' ELSE 'administrator_role_revoked' END,
    CASE WHEN p_active THEN 'Administrator role assigned' ELSE 'Administrator role revoked' END,
    'An administrator role assignment changed.', 'administrator', p_user_id::text,
    'admin-role:' || p_user_id::text || ':' || p_admin_role || ':' || p_active::text || ':' || clock_timestamp()::text
  );
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.set_admin_assignment(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_admin_assignment(uuid, text, boolean) TO authenticated;

-- Suspension changes only the authoritative admin membership. Preserve each
-- assigned role's active/revoked state so restoration cannot reactivate roles
-- that the Platform Owner previously revoked.
CREATE OR REPLACE FUNCTION public.set_admin_membership(p_user_id uuid, p_active boolean)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
  changed boolean;
BEGIN
  IF NOT public.is_evntora_owner() THEN
    RAISE EXCEPTION 'Platform Owner access required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_active IS NULL OR p_user_id = auth.uid()
     OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p_user_id AND r.role = 'platform_owner') THEN
    RAISE EXCEPTION 'Platform Owner membership cannot be changed through administrator management' USING ERRCODE = '42501';
  END IF;
  IF p_active AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = p_user_id AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'A verified Auth account is required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.user_roles SET is_active = p_active
  WHERE user_id = p_user_id AND role = 'admin';
  changed := FOUND;
  IF NOT changed THEN
    RAISE EXCEPTION 'Administrator membership not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT p_active THEN
    UPDATE public.admin_invitations SET revoked_at = now()
    WHERE (target_user_id = p_user_id OR lower(email) = (
      SELECT lower(u.email) FROM auth.users u WHERE u.id = p_user_id
    )) AND accepted_at IS NULL AND revoked_at IS NULL AND expired_at IS NULL AND expires_at > now();
  END IF;

  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, after_data)
  VALUES (auth.uid(), CASE WHEN p_active THEN 'administrator_reactivated' ELSE 'administrator_suspended' END,
    'administrator', p_user_id::text, jsonb_build_object('is_active', p_active));
  PERFORM public.emit_admin_notification('admin_management',
    CASE WHEN p_active THEN 'administrator_reactivated' ELSE 'administrator_suspended' END,
    CASE WHEN p_active THEN 'Administrator restored' ELSE 'Administrator suspended' END,
    'Administrator access changed by the Platform Owner.', 'administrator', p_user_id::text,
    'admin-membership:' || p_user_id::text || ':' || p_active::text || ':' || clock_timestamp()::text);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.set_admin_membership(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_admin_membership(uuid, boolean) TO authenticated;

-- Enforce the outstanding required advance at the database boundary for custom
-- payment intents, even if another trusted server caller is added later.
CREATE OR REPLACE FUNCTION public.enforce_partial_payment_advance_floor()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public
AS $$
DECLARE
  booking_total bigint;
  booking_paid bigint;
  booking_advance bigint;
  partial_allowed boolean;
BEGIN
  IF NEW.purpose <> 'partial' THEN
    RETURN NEW;
  END IF;

  SELECT b.total_amount, b.paid_amount, b.advance_amount, b.allow_partial_payments
  INTO booking_total, booking_paid, booking_advance, partial_allowed
  FROM public.bookings b WHERE b.id = NEW.booking_id FOR UPDATE;
  IF NOT FOUND OR NOT partial_allowed THEN
    RAISE EXCEPTION 'Partial payment is not permitted for this booking' USING ERRCODE = '22023';
  END IF;
  IF NEW.amount <= 0 OR NEW.amount > booking_total - booking_paid
     OR NEW.amount < greatest(booking_advance - booking_paid, 1) THEN
    RAISE EXCEPTION 'Partial payment must cover the remaining required advance and cannot exceed the outstanding balance' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS payment_order_intent_partial_advance_floor ON public.payment_order_intents;
CREATE TRIGGER payment_order_intent_partial_advance_floor
BEFORE INSERT OR UPDATE OF booking_id, purpose, amount ON public.payment_order_intents
FOR EACH ROW EXECUTE FUNCTION public.enforce_partial_payment_advance_floor();
REVOKE ALL ON FUNCTION public.enforce_partial_payment_advance_floor() FROM PUBLIC, anon, authenticated;
