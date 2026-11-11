-- Phase 6: scoped admin permissions and persisted admin operations.
-- Additive: preserves user_roles and the Phase 1-5 operational tables.
REVOKE CREATE ON SCHEMA public FROM PUBLIC,anon,authenticated;

CREATE TABLE IF NOT EXISTS public.admin_role_assignments (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_role text NOT NULL CHECK (admin_role IN ('super_admin','vendor_moderator','support_admin','finance_admin')),
  is_active boolean NOT NULL DEFAULT true,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, admin_role)
);
ALTER TABLE public.admin_role_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_role_assignments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_role_assignments TO authenticated;
CREATE POLICY admin_role_assignments_owner_read ON public.admin_role_assignments
  FOR SELECT TO authenticated USING (public.is_evntora_owner());
CREATE POLICY admin_role_assignments_self_read ON public.admin_role_assignments
  FOR SELECT TO authenticated USING (user_id=auth.uid() AND is_active);

CREATE OR REPLACE FUNCTION public.has_admin_permission(p_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_evntora_owner() OR EXISTS (
      SELECT 1 FROM public.admin_role_assignments a
      JOIN public.user_roles r ON r.user_id=a.user_id AND r.role='admin' AND r.is_active
      WHERE a.user_id=auth.uid() AND a.is_active AND CASE a.admin_role
        WHEN 'super_admin' THEN p_permission IN ('vendor_read','vendor_verification','listing_moderation','user_read','user_manage','booking_support','support_read','finance_read','refund_issue','analytics_finance','admin_message')
        WHEN 'vendor_moderator' THEN p_permission IN ('vendor_read','vendor_verification','listing_moderation','admin_message')
        WHEN 'support_admin' THEN p_permission IN ('user_read','booking_support','support_read','admin_message')
        WHEN 'finance_admin' THEN p_permission IN ('finance_read','refund_issue','analytics_finance','admin_message')
        ELSE false END
    )
  )
$$;
REVOKE ALL ON FUNCTION public.has_admin_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_admin_permission(text) TO authenticated, service_role;

ALTER TABLE public.admin_invitations
  ADD COLUMN IF NOT EXISTS admin_role text NOT NULL DEFAULT 'support_admin'
    CHECK (admin_role IN ('super_admin','vendor_moderator','support_admin','finance_admin')),
  ADD COLUMN IF NOT EXISTS expired_at timestamptz;
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  reason text,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx ON public.admin_audit_log(target_type,target_id,created_at DESC);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;
DROP POLICY IF EXISTS admin_audit_owner_read ON public.admin_audit_log;
CREATE POLICY admin_audit_owner_read ON public.admin_audit_log FOR SELECT TO authenticated USING (public.is_evntora_owner());
WITH legacy_admins AS (
  INSERT INTO public.admin_role_assignments(user_id,admin_role,is_active,granted_by)
  SELECT r.user_id,'super_admin',r.is_active,
    coalesce((SELECT owner_role.user_id FROM public.user_roles owner_role WHERE owner_role.role='platform_owner' AND owner_role.is_active ORDER BY owner_role.created_at LIMIT 1),r.granted_by)
  FROM public.user_roles r
  WHERE r.role='admin'
    AND NOT EXISTS(SELECT 1 FROM public.admin_role_assignments a WHERE a.user_id=r.user_id)
  ON CONFLICT(user_id,admin_role) DO NOTHING
  RETURNING user_id,is_active
)
INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,reason,after_data)
SELECT NULL,'legacy_admin_migrated','administrator',user_id::text,
  'Existing administrator access preserved as Super Admin during migration 016.',
  jsonb_build_object('admin_role','super_admin','is_active',is_active)
FROM legacy_admins;
-- Preserve expiry distinctly from administrator revocation, and fail safely if
-- stale rows are expired and older duplicate pending invites are revoked with
-- an audit record before enforcing one valid invitation per email.
WITH expired AS (
  UPDATE public.admin_invitations SET expired_at=expires_at
  WHERE accepted_at IS NULL AND revoked_at IS NULL AND expired_at IS NULL AND expires_at<=now()
  RETURNING id,email,admin_role,expires_at
)
INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,reason,after_data)
SELECT NULL,'administrator_invitation_expired','admin_invitation',id::text,
  'Invitation expiration recorded during migration 016.',
  jsonb_build_object('email',email,'admin_role',admin_role,'expired_at',expires_at)
FROM expired;
DROP INDEX IF EXISTS public.admin_invitations_one_pending_email_idx;
WITH ranked AS (
  SELECT id,email,admin_role,created_at,
    row_number() OVER (PARTITION BY lower(email) ORDER BY created_at DESC,id DESC) AS position
  FROM public.admin_invitations
  WHERE accepted_at IS NULL AND revoked_at IS NULL AND expired_at IS NULL AND expires_at>now()
), revoked AS (
  UPDATE public.admin_invitations i SET revoked_at=now()
  FROM ranked r WHERE r.position>1 AND i.id=r.id
  RETURNING i.id,i.email,i.admin_role
)
INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,reason,after_data)
SELECT NULL,'duplicate_admin_invitation_superseded','admin_invitation',id::text,
  'Older duplicate pending invitation superseded during migration 016.',
  jsonb_build_object('email',email,'admin_role',admin_role,'revoked_by_migration',true)
FROM revoked;
CREATE UNIQUE INDEX IF NOT EXISTS admin_invitations_one_pending_email_idx
  ON public.admin_invitations(lower(email)) WHERE accepted_at IS NULL AND revoked_at IS NULL AND expired_at IS NULL;

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  entity_type text,
  entity_id text,
  dedupe_key text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(recipient_id,dedupe_key)
);
CREATE INDEX IF NOT EXISTS admin_notifications_inbox_idx ON public.admin_notifications(recipient_id,read_at,created_at DESC);
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_notifications TO authenticated;
GRANT UPDATE(read_at) ON public.admin_notifications TO authenticated;
CREATE POLICY admin_notifications_read_own ON public.admin_notifications FOR SELECT TO authenticated
  USING (recipient_id=auth.uid() AND public.has_admin_permission(permission));
CREATE POLICY admin_notifications_mark_own ON public.admin_notifications FOR UPDATE TO authenticated
  USING (recipient_id=auth.uid() AND public.has_admin_permission(permission))
  WITH CHECK (recipient_id=auth.uid() AND public.has_admin_permission(permission));

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  entity_type text,
  entity_id text,
  dedupe_key text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,dedupe_key)
);
CREATE INDEX IF NOT EXISTS user_notifications_inbox_idx ON public.user_notifications(user_id,read_at,created_at DESC);
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_notifications FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.user_notifications TO authenticated;
GRANT UPDATE(read_at) ON public.user_notifications TO authenticated;
CREATE POLICY user_notifications_owner_read ON public.user_notifications FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY user_notifications_owner_update ON public.user_notifications FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE OR REPLACE FUNCTION public.emit_admin_notification(
  p_permission text,p_event_type text,p_title text,p_body text,p_entity_type text,p_entity_id text,p_dedupe_key text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
BEGIN
  INSERT INTO public.admin_notifications(recipient_id,permission,event_type,title,body,entity_type,entity_id,dedupe_key)
  SELECT a.user_id,p_permission,p_event_type,left(p_title,160),left(p_body,1000),p_entity_type,p_entity_id,p_dedupe_key
  FROM public.admin_role_assignments a
  JOIN public.user_roles r ON r.user_id=a.user_id AND r.role='admin' AND r.is_active
  WHERE a.is_active AND CASE a.admin_role
    WHEN 'super_admin' THEN p_permission IN ('vendor_read','vendor_verification','listing_moderation','user_read','user_manage','booking_support','support_read','finance_read','refund_issue','analytics_finance','admin_message')
    WHEN 'vendor_moderator' THEN p_permission IN ('vendor_read','vendor_verification','listing_moderation','admin_message')
    WHEN 'support_admin' THEN p_permission IN ('user_read','booking_support','support_read','admin_message')
    WHEN 'finance_admin' THEN p_permission IN ('finance_read','refund_issue','analytics_finance','admin_message')
    ELSE false END
  ON CONFLICT(recipient_id,dedupe_key) DO NOTHING;
  INSERT INTO public.admin_notifications(recipient_id,permission,event_type,title,body,entity_type,entity_id,dedupe_key)
  SELECT user_id,p_permission,p_event_type,left(p_title,160),left(p_body,1000),p_entity_type,p_entity_id,p_dedupe_key
  FROM public.user_roles WHERE role='platform_owner' AND is_active
  ON CONFLICT(recipient_id,dedupe_key) DO NOTHING;
END $$;

-- Admin messaging tables must exist before functions and triggers reference them.
CREATE TABLE IF NOT EXISTS public.admin_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.admin_conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.admin_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  PRIMARY KEY(conversation_id,user_id)
);
CREATE TABLE IF NOT EXISTS public.admin_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.admin_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_messages_conversation_idx ON public.admin_messages(conversation_id,created_at);
ALTER TABLE public.admin_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_conversations,public.admin_conversation_participants,public.admin_messages FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.admin_conversations TO authenticated;
GRANT SELECT ON public.admin_conversation_participants TO authenticated;
GRANT UPDATE(last_read_at) ON public.admin_conversation_participants TO authenticated;
GRANT SELECT ON public.admin_messages TO authenticated;
CREATE POLICY admin_conversations_participant_read ON public.admin_conversations FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.admin_conversation_participants p WHERE p.conversation_id=id AND p.user_id=auth.uid()) AND public.has_admin_permission('admin_message'));
CREATE POLICY admin_participant_read ON public.admin_conversation_participants FOR SELECT TO authenticated
  USING (user_id=auth.uid() AND public.has_admin_permission('admin_message'));
CREATE POLICY admin_participant_update_read ON public.admin_conversation_participants FOR UPDATE TO authenticated
  USING (user_id=auth.uid() AND public.has_admin_permission('admin_message')) WITH CHECK (user_id=auth.uid() AND public.has_admin_permission('admin_message'));
CREATE POLICY admin_messages_participant_read ON public.admin_messages FOR SELECT TO authenticated
  USING (public.has_admin_permission('admin_message') AND EXISTS(SELECT 1 FROM public.admin_conversation_participants p WHERE p.conversation_id=conversation_id AND p.user_id=auth.uid()));


CREATE OR REPLACE FUNCTION public.create_admin_conversation(p_recipient_id uuid,p_subject text,p_body text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
DECLARE conversation_id uuid;
BEGIN
  IF NOT public.has_admin_permission('admin_message') THEN RAISE EXCEPTION 'Administrator message permission required' USING ERRCODE='42501'; END IF;
  IF p_recipient_id=auth.uid() OR NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p_recipient_id AND r.is_active AND
    (r.role='platform_owner' OR (r.role='admin' AND EXISTS(SELECT 1 FROM public.admin_role_assignments a WHERE a.user_id=p_recipient_id AND a.is_active)))) THEN
    RAISE EXCEPTION 'Recipient is not an active administrator' USING ERRCODE='42501';
  END IF;
  IF length(trim(p_subject)) NOT BETWEEN 1 AND 160 OR length(trim(p_body)) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Invalid message content' USING ERRCODE='22023'; END IF;
  INSERT INTO public.admin_conversations(created_by,subject) VALUES(auth.uid(),trim(p_subject)) RETURNING id INTO conversation_id;
  INSERT INTO public.admin_conversation_participants(conversation_id,user_id) VALUES(conversation_id,auth.uid()),(conversation_id,p_recipient_id);
  INSERT INTO public.admin_messages(conversation_id,sender_id,body) VALUES(conversation_id,auth.uid(),trim(p_body));
  RETURN conversation_id;
END $$;
REVOKE ALL ON FUNCTION public.create_admin_conversation(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_admin_conversation(uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.send_admin_message(p_conversation_id uuid,p_body text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ DECLARE message_id bigint;
BEGIN
  IF NOT public.has_admin_permission('admin_message') OR NOT EXISTS(SELECT 1 FROM public.admin_conversation_participants WHERE conversation_id=p_conversation_id AND user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Conversation access denied' USING ERRCODE='42501';
  END IF;
  IF length(trim(p_body)) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Invalid message content' USING ERRCODE='22023'; END IF;
  INSERT INTO public.admin_messages(conversation_id,sender_id,body) VALUES(p_conversation_id,auth.uid(),trim(p_body)) RETURNING id INTO message_id;
  UPDATE public.admin_conversations SET updated_at=now() WHERE id=p_conversation_id;
  RETURN message_id;
END $$;
REVOKE ALL ON FUNCTION public.send_admin_message(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_admin_message(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_unread_message_count()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ SELECT CASE WHEN public.has_admin_permission('admin_message') THEN count(*) ELSE 0 END FROM public.admin_messages m
  JOIN public.admin_conversation_participants p ON p.conversation_id=m.conversation_id AND p.user_id=auth.uid()
  WHERE m.sender_id<>auth.uid() AND (p.last_read_at IS NULL OR m.created_at>p.last_read_at) $$;
REVOKE ALL ON FUNCTION public.admin_unread_message_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_unread_message_count() TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_admin_message_recipient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
DECLARE recipient uuid;
BEGIN
  FOR recipient IN SELECT user_id FROM public.admin_conversation_participants WHERE conversation_id=NEW.conversation_id AND user_id<>NEW.sender_id LOOP
    INSERT INTO public.admin_notifications(recipient_id,permission,event_type,title,body,entity_type,entity_id,dedupe_key)
      VALUES(recipient,'admin_message','admin_message_received','New admin message','A colleague sent you an administrator message.',
        'admin_conversation',NEW.conversation_id::text,'admin-message:'||NEW.id::text||':'||recipient::text) ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS admin_message_notify_recipient ON public.admin_messages;
CREATE TRIGGER admin_message_notify_recipient AFTER INSERT ON public.admin_messages FOR EACH ROW EXECUTE FUNCTION public.notify_admin_message_recipient();

CREATE OR REPLACE FUNCTION public.audit_admin_invitation_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ BEGIN
  INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,after_data)
    VALUES(NEW.invited_by,'administrator_invited','admin_invitation',NEW.id::text,jsonb_build_object('email',NEW.email,'admin_role',NEW.admin_role));
  PERFORM public.emit_admin_notification('admin_management','administrator_invited','Administrator invited','A new administrator invitation was issued.',
    'admin_invitation',NEW.id::text,'admin-invited:'||NEW.id::text);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS admin_invitation_created_audit ON public.admin_invitations;
CREATE TRIGGER admin_invitation_created_audit AFTER INSERT ON public.admin_invitations FOR EACH ROW EXECUTE FUNCTION public.audit_admin_invitation_created();

CREATE OR REPLACE FUNCTION public.audit_admin_invitation_state()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
DECLARE action_name text; event_name text; notification_title text;
BEGIN
  IF NEW.accepted_at IS DISTINCT FROM OLD.accepted_at AND NEW.accepted_at IS NOT NULL THEN
    action_name:='administrator_invitation_accepted'; event_name:='administrator_invitation_accepted'; notification_title:='Administrator invitation accepted';
  ELSIF NEW.revoked_at IS DISTINCT FROM OLD.revoked_at AND NEW.revoked_at IS NOT NULL THEN
    action_name:='administrator_invitation_revoked'; event_name:='administrator_invitation_revoked'; notification_title:='Administrator invitation revoked';
  ELSIF NEW.expired_at IS DISTINCT FROM OLD.expired_at AND NEW.expired_at IS NOT NULL THEN
    action_name:='administrator_invitation_expired'; event_name:='administrator_invitation_expired'; notification_title:='Administrator invitation expired';
  ELSE
    RETURN NEW;
  END IF;
  INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,after_data)
  VALUES(coalesce(auth.uid(),NEW.invited_by),action_name,'admin_invitation',NEW.id::text,
    jsonb_build_object('email',NEW.email,'admin_role',NEW.admin_role,'accepted_at',NEW.accepted_at,'revoked_at',NEW.revoked_at,'expired_at',NEW.expired_at,'target_user_id',NEW.target_user_id));
  PERFORM public.emit_admin_notification('admin_management',event_name,notification_title,
    'An administrator invitation changed state.','admin_invitation',NEW.id::text,
    'admin-invitation-state:'||NEW.id::text||':'||action_name);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS admin_invitation_state_audit ON public.admin_invitations;
CREATE TRIGGER admin_invitation_state_audit AFTER UPDATE OF accepted_at,revoked_at,expired_at ON public.admin_invitations
FOR EACH ROW EXECUTE FUNCTION public.audit_admin_invitation_state();
REVOKE ALL ON FUNCTION public.emit_admin_notification(text,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.emit_admin_notification(text,text,text,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.notify_admin_on_vendor_document()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ BEGIN
  PERFORM public.emit_admin_notification('vendor_verification','vendor_verification_submitted','Vendor verification submitted',
    'A vendor submitted verification documents for review.','vendor_document',NEW.id::text,'vendor-document:'||NEW.id::text);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS admin_notify_vendor_document ON public.vendor_verification_documents;
CREATE TRIGGER admin_notify_vendor_document AFTER INSERT ON public.vendor_verification_documents
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_vendor_document();

CREATE OR REPLACE FUNCTION public.notify_vendor_verification_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ DECLARE recipient uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
    SELECT user_id INTO recipient FROM public.vendor_profiles WHERE id=NEW.vendor_profile_id;
    IF recipient IS NOT NULL THEN
      INSERT INTO public.user_notifications(user_id,event_type,title,body,entity_type,entity_id,dedupe_key)
      VALUES(recipient,'vendor_verification_'||NEW.status,'Vendor verification '||NEW.status,
        coalesce(NEW.rejection_reason,'Your vendor verification document was reviewed.'),'vendor_document',NEW.id::text,'vendor-document:'||NEW.id::text||':'||NEW.status)
      ON CONFLICT(user_id,dedupe_key) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vendor_verification_decision_notification ON public.vendor_verification_documents;
CREATE TRIGGER vendor_verification_decision_notification AFTER UPDATE OF status ON public.vendor_verification_documents
FOR EACH ROW EXECUTE FUNCTION public.notify_vendor_verification_decision();

CREATE OR REPLACE FUNCTION public.notify_admin_on_vendor_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ BEGIN
  PERFORM public.emit_admin_notification('vendor_verification','vendor_registered','New vendor registration','A new vendor application is awaiting review.',
    'vendor',NEW.id::text,'vendor-registered:'||NEW.id::text);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS admin_notify_vendor_registration ON public.vendor_profiles;
CREATE TRIGGER admin_notify_vendor_registration AFTER INSERT ON public.vendor_profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_vendor_registration();

CREATE OR REPLACE FUNCTION public.audit_and_notify_refund()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
DECLARE recipient uuid;
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,reason,after_data)
      VALUES(NEW.created_by,'refund_reserved','refund',NEW.id::text,NEW.reason,jsonb_build_object('amount',NEW.amount,'status',NEW.status));
    PERFORM public.emit_admin_notification('finance_read','refund_requested','Refund reserved for review','A booking refund was reserved by an authorized administrator.',
      'refund',NEW.id::text,'refund-requested:'||NEW.id::text);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,reason,before_data,after_data)
      VALUES(NEW.created_by,'refund_status_changed','refund',NEW.id::text,NEW.reason,jsonb_build_object('status',OLD.status),jsonb_build_object('status',NEW.status));
    IF NEW.status='failed' THEN PERFORM public.emit_admin_notification('finance_read','refund_failed','Refund processing failed','A refund requires reconciliation.',
      'refund',NEW.id::text,'refund-failed:'||NEW.id::text); END IF;
    SELECT customer_id INTO recipient FROM public.bookings WHERE id=NEW.booking_id;
    IF recipient IS NOT NULL AND NEW.status IN ('processed','failed') THEN
      INSERT INTO public.user_notifications(user_id,event_type,title,body,entity_type,entity_id,dedupe_key)
      VALUES(recipient,'refund_'||NEW.status,'Refund '||NEW.status,'A refund status update is available for your booking.','refund',NEW.id::text,'refund:'||NEW.id::text||':'||NEW.status)
      ON CONFLICT(user_id,dedupe_key) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS refund_admin_audit_notification ON public.refunds;
CREATE TRIGGER refund_admin_audit_notification AFTER INSERT OR UPDATE OF status ON public.refunds
FOR EACH ROW EXECUTE FUNCTION public.audit_and_notify_refund();

CREATE TABLE IF NOT EXISTS public.support_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_role text NOT NULL CHECK(reporter_role IN ('customer','vendor')),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  vendor_profile_id uuid REFERENCES public.vendor_profiles(id) ON DELETE SET NULL,
  subject text NOT NULL CHECK(length(subject) BETWEEN 3 AND 180),
  description text NOT NULL CHECK(length(description) BETWEEN 10 AND 10000),
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_review','resolved','closed')),
  assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_cases_reporter_idx ON public.support_cases(reporter_id,created_at DESC);
CREATE INDEX IF NOT EXISTS support_cases_queue_idx ON public.support_cases(status,created_at DESC);
ALTER TABLE public.support_cases ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON public.support_cases TO authenticated;
GRANT UPDATE(status,assigned_admin_id,resolution,resolved_at,updated_at) ON public.support_cases TO authenticated;
CREATE POLICY support_cases_reporter_read ON public.support_cases FOR SELECT TO authenticated USING(reporter_id=auth.uid());
CREATE POLICY support_cases_reporter_insert ON public.support_cases FOR INSERT TO authenticated WITH CHECK(reporter_id=auth.uid());
CREATE POLICY support_cases_admin_read ON public.support_cases FOR SELECT TO authenticated USING(public.has_admin_permission('support_read'));
CREATE POLICY support_cases_admin_update ON public.support_cases FOR UPDATE TO authenticated USING(public.has_admin_permission('support_read')) WITH CHECK(public.has_admin_permission('support_read'));
CREATE OR REPLACE FUNCTION public.notify_admin_support_case()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ BEGIN
  PERFORM public.emit_admin_notification('support_read','support_case_created','New support case',NEW.subject,'support_case',NEW.id::text,'support-case:'||NEW.id::text);
  RETURN NEW;
END $$;
CREATE TRIGGER support_case_notify_admin AFTER INSERT ON public.support_cases FOR EACH ROW EXECUTE FUNCTION public.notify_admin_support_case();

CREATE OR REPLACE FUNCTION public.notify_admin_on_listing_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ BEGIN
  IF NEW.status IN ('pending_approval','submitted') AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.emit_admin_notification('listing_moderation','listing_submitted','Vendor listing needs review',
      'A vendor listing was submitted or resubmitted for moderation.','vendor_listing',NEW.id::text,'vendor-listing:'||NEW.id::text||':'||NEW.updated_at::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS admin_notify_listing_submission ON public.vendor_listings;
CREATE TRIGGER admin_notify_listing_submission AFTER INSERT OR UPDATE OF status ON public.vendor_listings
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_listing_submission();

CREATE OR REPLACE FUNCTION public.notify_vendor_listing_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
DECLARE recipient uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('published','rejected') THEN
    SELECT vp.user_id INTO recipient FROM public.vendor_profiles vp WHERE vp.id=NEW.vendor_profile_id;
    IF recipient IS NOT NULL THEN
      INSERT INTO public.user_notifications(user_id,event_type,title,body,entity_type,entity_id,dedupe_key)
      VALUES(recipient,'vendor_listing_'||NEW.status,
        CASE WHEN NEW.status='published' THEN 'Listing approved' ELSE 'Listing needs changes' END,
        coalesce(NEW.moderation_note,CASE WHEN NEW.status='published' THEN 'Your listing is now published.' ELSE 'Your listing was not approved. Review it and resubmit.' END),
        'vendor_listing',NEW.id::text,'vendor-listing-decision:'||NEW.id::text||':'||NEW.status||':'||NEW.updated_at::text)
      ON CONFLICT(user_id,dedupe_key) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vendor_listing_decision_notification ON public.vendor_listings;
CREATE TRIGGER vendor_listing_decision_notification AFTER UPDATE OF status ON public.vendor_listings
FOR EACH ROW EXECUTE FUNCTION public.notify_vendor_listing_decision();

CREATE OR REPLACE FUNCTION public.moderate_vendor_listing(p_listing_id uuid,p_action text,p_reason text DEFAULT NULL)
RETURNS public.vendor_listings LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE listing_row public.vendor_listings%ROWTYPE;
BEGIN
  IF NOT (public.is_evntora_admin() OR public.has_admin_permission('listing_moderation')) THEN RAISE EXCEPTION 'Listing moderation permission required' USING ERRCODE='42501'; END IF;
  IF p_listing_id IS NULL OR p_action IS NULL OR p_action NOT IN ('approve','reject') OR length(COALESCE(p_reason,''))>1000 OR (p_action='reject' AND length(trim(COALESCE(p_reason,'')))<3) THEN
    RAISE EXCEPTION 'Invalid listing review decision' USING ERRCODE='22023';
  END IF;
  SELECT * INTO listing_row FROM public.vendor_listings WHERE id=p_listing_id FOR UPDATE;
  IF NOT FOUND OR listing_row.status<>'pending_approval' THEN RAISE EXCEPTION 'Pending listing not found' USING ERRCODE='P0002'; END IF;
  UPDATE public.vendor_listings SET status=CASE WHEN p_action='approve' THEN 'published' ELSE 'rejected' END,
    moderation_note=CASE WHEN p_action='reject' THEN trim(p_reason) ELSE NULL END,reviewed_at=now(),updated_at=now()
    WHERE id=p_listing_id RETURNING * INTO listing_row;
  INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,reason,before_data,after_data)
    VALUES(auth.uid(),'vendor_listing_'||p_action,'vendor_listing',p_listing_id::text,p_reason,
      jsonb_build_object('status','pending_approval'),jsonb_build_object('status',listing_row.status));
  RETURN listing_row;
END $$;
REVOKE ALL ON FUNCTION public.moderate_vendor_listing(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderate_vendor_listing(uuid,text,text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY CHECK (length(key) BETWEEN 1 AND 100),
  value jsonb NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_settings FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.platform_settings TO authenticated;
CREATE POLICY platform_settings_owner_read ON public.platform_settings FOR SELECT TO authenticated USING (public.is_evntora_owner());

CREATE TABLE IF NOT EXISTS public.marketplace_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.marketplace_categories TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.marketplace_categories TO authenticated;
CREATE POLICY marketplace_categories_public_read ON public.marketplace_categories FOR SELECT TO anon,authenticated USING(is_active);
CREATE POLICY marketplace_categories_owner_manage ON public.marketplace_categories FOR ALL TO authenticated
  USING(public.is_evntora_owner()) WITH CHECK(public.is_evntora_owner());
INSERT INTO public.marketplace_categories(name,slug)
SELECT DISTINCT trim(business_category), trim(both '-' from regexp_replace(lower(trim(business_category)),'[^a-z0-9]+','-','g'))
FROM public.vendor_profiles WHERE trim(coalesce(business_category,''))<>''
ON CONFLICT(name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.admin_permissions (permission text PRIMARY KEY,label text NOT NULL,description text NOT NULL);
CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
  admin_role text NOT NULL CHECK(admin_role IN ('super_admin','vendor_moderator','support_admin','finance_admin')),
  permission text NOT NULL REFERENCES public.admin_permissions(permission) ON DELETE CASCADE,
  PRIMARY KEY(admin_role,permission)
);
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.admin_permissions,public.admin_role_permissions TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.admin_role_permissions TO authenticated;
CREATE POLICY admin_permissions_read ON public.admin_permissions FOR SELECT TO authenticated USING(public.has_evntora_role('admin') OR EXISTS(SELECT 1 FROM public.admin_role_assignments a WHERE a.user_id=auth.uid() AND a.is_active));
CREATE POLICY admin_role_permissions_read ON public.admin_role_permissions FOR SELECT TO authenticated USING(public.has_evntora_role('admin') OR EXISTS(SELECT 1 FROM public.admin_role_assignments a WHERE a.user_id=auth.uid() AND a.admin_role=admin_role_permissions.admin_role AND a.is_active));
CREATE POLICY admin_role_permissions_owner_manage ON public.admin_role_permissions FOR ALL TO authenticated USING(public.is_evntora_owner()) WITH CHECK(public.is_evntora_owner());
INSERT INTO public.admin_permissions(permission,label,description) VALUES
  ('vendor_read','View vendors','Read vendor directory and vendor details.'),
  ('vendor_verification','Review verification','Review vendor documents and verification status.'),
  ('listing_moderation','Moderate listings','Review, approve or reject marketplace listings.'),
  ('user_read','View users','Read customer and account support details.'),
  ('user_manage','Manage user access','Suspend or restore customer and vendor workspace access.'),
  ('booking_support','Booking support','View booking details and lifecycle history.'),
  ('support_read','Reviews and support','Read reviews and support queues.'),
  ('finance_read','View finance','Read payments, refunds and financial reporting.'),
  ('refund_issue','Issue refunds','Issue authorized refunds through the existing refund workflow.'),
  ('analytics_finance','Financial analytics','Read financial analytics.'),
  ('admin_message','Admin messages','Participate in internal administrator messages.')
ON CONFLICT(permission) DO UPDATE SET label=excluded.label,description=excluded.description;
INSERT INTO public.admin_role_permissions(admin_role,permission) VALUES
  ('super_admin','vendor_read'),('super_admin','vendor_verification'),('super_admin','listing_moderation'),('super_admin','user_read'),('super_admin','user_manage'),('super_admin','booking_support'),('super_admin','support_read'),('super_admin','finance_read'),('super_admin','refund_issue'),('super_admin','analytics_finance'),('super_admin','admin_message'),
  ('vendor_moderator','vendor_read'),('vendor_moderator','vendor_verification'),('vendor_moderator','listing_moderation'),('vendor_moderator','admin_message'),
  ('support_admin','user_read'),('support_admin','user_manage'),('support_admin','booking_support'),('support_admin','support_read'),('support_admin','admin_message'),
  ('finance_admin','finance_read'),('finance_admin','refund_issue'),('finance_admin','analytics_finance'),('finance_admin','admin_message')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_admin_permission(p_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ SELECT auth.uid() IS NOT NULL AND (public.is_evntora_owner() OR EXISTS(
  SELECT 1 FROM public.admin_role_assignments a JOIN public.user_roles r ON r.user_id=a.user_id AND r.role='admin' AND r.is_active
  JOIN public.admin_role_permissions rp ON rp.admin_role=a.admin_role AND rp.permission=p_permission
  WHERE a.user_id=auth.uid() AND a.is_active)) $$;
CREATE OR REPLACE FUNCTION public.current_admin_permissions()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ SELECT CASE WHEN public.is_evntora_owner() THEN coalesce((SELECT array_agg(permission ORDER BY permission) FROM public.admin_permissions),'{}'::text[])
  ELSE coalesce((SELECT array_agg(DISTINCT rp.permission ORDER BY rp.permission) FROM public.admin_role_assignments a
    JOIN public.user_roles r ON r.user_id=a.user_id AND r.role='admin' AND r.is_active
    JOIN public.admin_role_permissions rp ON rp.admin_role=a.admin_role WHERE a.user_id=auth.uid() AND a.is_active),'{}'::text[]) END $$;
REVOKE ALL ON FUNCTION public.current_admin_permissions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_admin_permissions() TO authenticated;
CREATE OR REPLACE FUNCTION public.emit_admin_notification(
  p_permission text,p_event_type text,p_title text,p_body text,p_entity_type text,p_entity_id text,p_dedupe_key text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  INSERT INTO public.admin_notifications(recipient_id,permission,event_type,title,body,entity_type,entity_id,dedupe_key)
  SELECT a.user_id,p_permission,p_event_type,left(p_title,160),left(p_body,1000),p_entity_type,p_entity_id,p_dedupe_key
  FROM public.admin_role_assignments a JOIN public.user_roles r ON r.user_id=a.user_id AND r.role='admin' AND r.is_active
  JOIN public.admin_role_permissions rp ON rp.admin_role=a.admin_role AND rp.permission=p_permission
  WHERE a.is_active ON CONFLICT(recipient_id,dedupe_key) DO NOTHING;
  INSERT INTO public.admin_notifications(recipient_id,permission,event_type,title,body,entity_type,entity_id,dedupe_key)
  SELECT user_id,p_permission,p_event_type,left(p_title,160),left(p_body,1000),p_entity_type,p_entity_id,p_dedupe_key
  FROM public.user_roles WHERE role='platform_owner' AND is_active ON CONFLICT(recipient_id,dedupe_key) DO NOTHING;
END $$;

-- Revoke broad legacy admin interpretation. Owners retain all existing admin rights;
-- scoped administrators are authorized through explicit permission checks below.
CREATE OR REPLACE FUNCTION public.has_evntora_role(p_role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
  SELECT CASE WHEN p_role='admin' THEN public.is_evntora_owner()
    ELSE EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.is_active AND r.role=p_role) END
$$;
CREATE OR REPLACE FUNCTION public.is_evntora_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ SELECT public.is_evntora_owner() $$;
REVOKE ALL ON FUNCTION public.has_evntora_role(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_evntora_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_evntora_role(text),public.is_evntora_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.has_evntora_role(text),public.is_evntora_admin() TO authenticated,service_role;

-- Harden the legacy owner helper used by all scoped permission checks.
CREATE OR REPLACE FUNCTION public.is_evntora_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.role='platform_owner' AND r.is_active) $$;
REVOKE ALL ON FUNCTION public.is_evntora_owner() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_evntora_owner() TO authenticated,service_role;

-- Existing administrator invitations become scoped. Acceptance still requires
-- the verified, exact invited email and the active Platform Owner who issued it.
CREATE OR REPLACE FUNCTION public.accept_admin_invitation(p_invitation_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
DECLARE current_email text; invited_role text; issuer uuid;
BEGIN
  SELECT lower(email) INTO current_email FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
  IF current_email IS NULL THEN RETURN false; END IF;
  UPDATE public.admin_invitations i SET accepted_at=now(),target_user_id=auth.uid()
  WHERE i.id=p_invitation_id AND lower(i.email)=current_email AND (i.target_user_id IS NULL OR i.target_user_id=auth.uid())
    AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expired_at IS NULL AND i.expires_at>now()
    AND EXISTS(SELECT 1 FROM public.user_roles o WHERE o.user_id=i.invited_by AND o.role='platform_owner' AND o.is_active)
  RETURNING i.admin_role,i.invited_by INTO invited_role,issuer;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.user_roles(user_id,role,granted_by) VALUES(auth.uid(),'admin',issuer)
    ON CONFLICT(user_id,role) DO UPDATE SET is_active=true,granted_by=EXCLUDED.granted_by;
  INSERT INTO public.admin_role_assignments(user_id,admin_role,granted_by) VALUES(auth.uid(),invited_role,issuer)
    ON CONFLICT(user_id,admin_role) DO UPDATE SET is_active=true,granted_by=EXCLUDED.granted_by,updated_at=now();
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.accept_admin_invitation(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.accept_admin_invitation(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_admin_membership(p_user_id uuid,p_active boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
DECLARE changed boolean;
BEGIN
  IF NOT public.is_evntora_owner() THEN RAISE EXCEPTION 'owner access required' USING ERRCODE='42501'; END IF;
  IF p_user_id IS NULL OR p_active IS NULL OR p_user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user_id AND role='platform_owner') THEN
    RAISE EXCEPTION 'Platform Owner membership cannot be changed through administrator management';
  END IF;
  IF p_active AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'A verified Auth account is required'; END IF;
  UPDATE public.user_roles SET is_active=p_active WHERE user_id=p_user_id AND role='admin';
  changed:=FOUND;
  UPDATE public.admin_role_assignments SET is_active=p_active,updated_at=now() WHERE user_id=p_user_id;
  IF NOT p_active THEN
    UPDATE public.admin_invitations SET revoked_at=now() WHERE (target_user_id=p_user_id OR lower(email)=(SELECT lower(email) FROM auth.users WHERE id=p_user_id)) AND accepted_at IS NULL AND revoked_at IS NULL AND expired_at IS NULL AND expires_at>now();
  END IF;
  IF changed THEN INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,after_data)
    VALUES(auth.uid(),CASE WHEN p_active THEN 'administrator_reactivated' ELSE 'administrator_suspended' END,'administrator',p_user_id::text,jsonb_build_object('is_active',p_active)); END IF;
  IF changed THEN PERFORM public.emit_admin_notification('admin_management',CASE WHEN p_active THEN 'administrator_reactivated' ELSE 'administrator_suspended' END,CASE WHEN p_active THEN 'Administrator restored' ELSE 'Administrator suspended' END,'Administrator access changed by the Platform Owner.','administrator',p_user_id::text,'admin-membership:'||p_user_id::text||':'||p_active::text||':'||clock_timestamp()::text); END IF;
  RETURN changed;
END $$;
REVOKE ALL ON FUNCTION public.set_admin_membership(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_admin_membership(uuid,boolean) TO authenticated;

-- Least privilege replaces broad legacy administrator policies. Owner remains the
-- break-glass authority; permission-specific reads are granted to scoped staff.
DROP POLICY IF EXISTS "profiles: admin read all" ON public.profiles;
CREATE POLICY "profiles: scoped admin read" ON public.profiles FOR SELECT TO authenticated USING (public.has_admin_permission('user_read') OR public.has_admin_permission('booking_support') OR public.has_admin_permission('finance_read'));
DROP POLICY IF EXISTS "profiles: admin update all" ON public.profiles;
DROP POLICY IF EXISTS "events: own select" ON public.events;
CREATE POLICY "events: own select" ON public.events FOR SELECT TO authenticated USING ((public.has_evntora_role('customer') AND auth.uid()=user_id) OR public.is_evntora_admin() OR public.has_admin_permission('booking_support'));
DROP POLICY IF EXISTS "events: own update" ON public.events;
DROP POLICY IF EXISTS "events: own delete" ON public.events;
DROP POLICY IF EXISTS "bookings: customer select" ON public.bookings;
CREATE POLICY "bookings: customer select" ON public.bookings FOR SELECT TO authenticated USING (
  (public.has_evntora_role('customer') AND auth.uid()=customer_id) OR
  (public.has_evntora_role('vendor') AND EXISTS(SELECT 1 FROM public.vendor_profiles WHERE id=vendor_profile_id AND user_id=auth.uid())) OR
  public.is_evntora_admin() OR public.has_admin_permission('booking_support') OR public.has_admin_permission('finance_read'));
DROP POLICY IF EXISTS "bookings: customer or vendor update" ON public.bookings;
DROP POLICY IF EXISTS "payments: select policy" ON public.payments;
CREATE POLICY "payments: select policy" ON public.payments FOR SELECT TO authenticated USING (
  (public.has_evntora_role('customer') AND auth.uid()=customer_id) OR
  (public.has_evntora_role('vendor') AND EXISTS(SELECT 1 FROM public.bookings b JOIN public.vendor_profiles vp ON vp.id=b.vendor_profile_id WHERE b.id=booking_id AND vp.user_id=auth.uid())) OR
  public.is_evntora_admin() OR public.has_admin_permission('finance_read') OR public.has_admin_permission('booking_support'));
DROP POLICY IF EXISTS "payments: admin update" ON public.payments;
DROP POLICY IF EXISTS "payment_events: admin select" ON public.payment_events;
CREATE POLICY "payment_events: scoped admin select" ON public.payment_events FOR SELECT TO authenticated USING(public.is_evntora_admin() OR public.has_admin_permission('finance_read'));
DROP POLICY IF EXISTS "refunds: select policy" ON public.refunds;
CREATE POLICY "refunds: select policy" ON public.refunds FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.payments p WHERE p.id=payment_id AND ((public.has_evntora_role('customer') AND p.customer_id=auth.uid()) OR
  (public.has_evntora_role('vendor') AND EXISTS(SELECT 1 FROM public.bookings b JOIN public.vendor_profiles vp ON vp.id=b.vendor_profile_id WHERE b.id=p.booking_id AND vp.user_id=auth.uid())))) OR
  public.is_evntora_admin() OR public.has_admin_permission('finance_read'));

-- Scoped support staff can inspect booking and quotation details, but remain
-- excluded from booking_messages by the participant-only Phase 4 policy.
DROP POLICY IF EXISTS "booking availability: own vendor read" ON public.vendor_availability;
CREATE POLICY "booking availability: own vendor read" ON public.vendor_availability FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=vendor_profile_id AND vp.user_id=auth.uid()) OR
  public.is_evntora_admin() OR public.has_admin_permission('booking_support'));
DROP POLICY IF EXISTS "booking quotations: participants read" ON public.booking_quotations;
CREATE POLICY "booking quotations: participants read" ON public.booking_quotations FOR SELECT TO authenticated USING (
  customer_id=auth.uid() OR EXISTS(SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=vendor_profile_id AND vp.user_id=auth.uid()) OR
  public.is_evntora_admin() OR public.has_admin_permission('booking_support'));
DROP POLICY IF EXISTS "booking quotation items: participants read" ON public.booking_quotation_items;
CREATE POLICY "booking quotation items: participants read" ON public.booking_quotation_items FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.booking_quotations q WHERE q.id=quotation_id AND
    (q.customer_id=auth.uid() OR EXISTS(SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=q.vendor_profile_id AND vp.user_id=auth.uid()) OR public.is_evntora_admin() OR public.has_admin_permission('booking_support'))));
DROP POLICY IF EXISTS "booking status history: participants read" ON public.booking_status_history;
CREATE POLICY "booking status history: participants read" ON public.booking_status_history FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.bookings b WHERE b.id=booking_id AND
    (b.customer_id=auth.uid() OR EXISTS(SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=b.vendor_profile_id AND vp.user_id=auth.uid()) OR public.is_evntora_admin() OR public.has_admin_permission('booking_support'))));

DROP POLICY IF EXISTS "vendor_profiles: admin read all" ON public.vendor_profiles;
CREATE POLICY "vendor_profiles: admin read all" ON public.vendor_profiles FOR SELECT TO authenticated USING(public.is_evntora_admin() OR public.has_admin_permission('vendor_read') OR public.has_admin_permission('vendor_verification') OR public.has_admin_permission('listing_moderation'));
DROP POLICY IF EXISTS "vendor_profiles: admin update all" ON public.vendor_profiles;
DROP POLICY IF EXISTS "vendor_profiles: admin insert" ON public.vendor_profiles;
DROP POLICY IF EXISTS "vendor_services: admin manage" ON public.vendor_services;
CREATE POLICY "vendor_services: admin read" ON public.vendor_services FOR SELECT TO authenticated USING(public.is_evntora_admin() OR public.has_admin_permission('vendor_read'));
DROP POLICY IF EXISTS "vendor_packages: admin manage" ON public.vendor_packages;
CREATE POLICY "vendor_packages: admin read" ON public.vendor_packages FOR SELECT TO authenticated USING(public.is_evntora_admin() OR public.has_admin_permission('vendor_read'));
DROP POLICY IF EXISTS "vendor_portfolio: admin manage" ON public.vendor_portfolio;
CREATE POLICY "vendor_portfolio: admin read" ON public.vendor_portfolio FOR SELECT TO authenticated USING(public.is_evntora_admin() OR public.has_admin_permission('vendor_read'));

DROP POLICY IF EXISTS vendor_listings_admin_manage ON public.vendor_listings;
CREATE POLICY vendor_listings_admin_read ON public.vendor_listings FOR SELECT TO authenticated USING(public.is_evntora_admin() OR public.has_admin_permission('listing_moderation'));
DROP POLICY IF EXISTS vendor_listing_addons_admin_manage ON public.vendor_listing_addons;
CREATE POLICY vendor_listing_addons_admin_read ON public.vendor_listing_addons FOR SELECT TO authenticated USING(public.is_evntora_admin() OR public.has_admin_permission('listing_moderation'));
DROP POLICY IF EXISTS vendor_documents_admin_manage ON public.vendor_verification_documents;
CREATE POLICY vendor_documents_admin_read ON public.vendor_verification_documents FOR SELECT TO authenticated USING(public.is_evntora_admin() OR public.has_admin_permission('vendor_verification'));
DROP POLICY IF EXISTS vendor_documents_admin_update ON public.vendor_verification_documents;
DROP POLICY IF EXISTS vendor_reviews_admin_read ON public.vendor_reviews;
CREATE POLICY vendor_reviews_admin_read ON public.vendor_reviews FOR SELECT TO authenticated USING(public.is_evntora_admin() OR public.has_admin_permission('support_read'));
DROP POLICY IF EXISTS vendor_documents_owner_read_storage ON storage.objects;
CREATE POLICY vendor_documents_owner_read_storage ON storage.objects FOR SELECT TO authenticated USING(bucket_id='vendor-documents' AND ((public.has_evntora_role('vendor') AND EXISTS(SELECT 1 FROM public.vendor_profiles vp WHERE vp.id::text=split_part(name,'/',1) AND vp.user_id=auth.uid())) OR public.is_evntora_admin() OR public.has_admin_permission('vendor_verification')));

CREATE OR REPLACE FUNCTION public.moderate_vendor_profile(p_vendor_profile_id uuid,p_action text,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE prior public.vendor_profiles%ROWTYPE; updated public.vendor_profiles%ROWTYPE;
BEGIN
  IF NOT (public.is_evntora_admin() OR public.has_admin_permission('vendor_verification')) THEN
    RAISE EXCEPTION 'Vendor verification permission required' USING ERRCODE='42501';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('approve','reject','suspend','publish','unpublish') OR length(COALESCE(p_reason,''))>1000 THEN
    RAISE EXCEPTION 'Invalid vendor moderation action' USING ERRCODE='22023';
  END IF;
  IF p_vendor_profile_id IS NULL THEN RAISE EXCEPTION 'Vendor profile is required' USING ERRCODE='22023'; END IF;
  SELECT * INTO prior FROM public.vendor_profiles WHERE id=p_vendor_profile_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vendor profile not found' USING ERRCODE='P0002'; END IF;
  IF p_action='approve' THEN
    UPDATE public.vendor_profiles SET approval_status='approved',is_published=true,updated_at=now() WHERE id=p_vendor_profile_id;
  ELSIF p_action='reject' THEN
    IF length(trim(COALESCE(p_reason,'')))<3 THEN RAISE EXCEPTION 'A rejection reason is required' USING ERRCODE='22023'; END IF;
    UPDATE public.vendor_profiles SET approval_status='rejected',is_published=false,updated_at=now() WHERE id=p_vendor_profile_id;
  ELSIF p_action='publish' THEN
    UPDATE public.vendor_profiles SET is_published=true,updated_at=now() WHERE id=p_vendor_profile_id AND approval_status='approved';
  ELSE
    UPDATE public.vendor_profiles SET is_published=false,updated_at=now() WHERE id=p_vendor_profile_id;
  END IF;
  SELECT * INTO updated FROM public.vendor_profiles WHERE id=p_vendor_profile_id;
  IF p_action='publish' AND NOT updated.is_published THEN RAISE EXCEPTION 'Only approved vendors may be published' USING ERRCODE='23514'; END IF;
  INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,reason,before_data,after_data)
  VALUES(auth.uid(),'vendor_profile_'||p_action,'vendor_profile',p_vendor_profile_id::text,nullif(trim(COALESCE(p_reason,'')),''),
    jsonb_build_object('approval_status',prior.approval_status,'is_published',prior.is_published),
    jsonb_build_object('approval_status',updated.approval_status,'is_published',updated.is_published));
  RETURN jsonb_build_object('id',updated.id,'approval_status',updated.approval_status,'is_published',updated.is_published);
END $$;
REVOKE ALL ON FUNCTION public.moderate_vendor_profile(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.moderate_vendor_profile(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_vendor_document(p_document_id uuid,p_action text,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE prior public.vendor_verification_documents%ROWTYPE; updated public.vendor_verification_documents%ROWTYPE;
BEGIN
  IF NOT (public.is_evntora_admin() OR public.has_admin_permission('vendor_verification')) THEN
    RAISE EXCEPTION 'Vendor verification permission required' USING ERRCODE='42501';
  END IF;
  IF p_document_id IS NULL OR p_action IS NULL OR p_action NOT IN ('approve','reject') OR length(COALESCE(p_reason,''))>1000 THEN
    RAISE EXCEPTION 'Invalid vendor document review action' USING ERRCODE='22023';
  END IF;
  IF p_action='reject' AND length(trim(COALESCE(p_reason,'')))<3 THEN RAISE EXCEPTION 'A rejection reason is required' USING ERRCODE='22023'; END IF;
  SELECT * INTO prior FROM public.vendor_verification_documents WHERE id=p_document_id FOR UPDATE;
  IF NOT FOUND OR prior.status<>'pending' THEN RAISE EXCEPTION 'Pending verification document not found' USING ERRCODE='P0002'; END IF;
  UPDATE public.vendor_verification_documents
    SET status=CASE WHEN p_action='approve' THEN 'approved' ELSE 'rejected' END,
        rejection_reason=CASE WHEN p_action='reject' THEN trim(p_reason) ELSE NULL END,reviewed_at=now()
    WHERE id=p_document_id RETURNING * INTO updated;
  INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,reason,before_data,after_data)
    VALUES(auth.uid(),'vendor_document_'||p_action,'vendor_document',p_document_id::text,
      CASE WHEN p_action='reject' THEN trim(p_reason) ELSE NULL END,
      jsonb_build_object('status',prior.status),jsonb_build_object('status',updated.status,'rejection_reason',updated.rejection_reason));
  RETURN jsonb_build_object('id',updated.id,'vendor_profile_id',updated.vendor_profile_id,'status',updated.status,
    'rejection_reason',updated.rejection_reason,'reviewed_at',updated.reviewed_at);
END $$;
REVOKE ALL ON FUNCTION public.review_vendor_document(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_vendor_document(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_admin_assignment(p_user_id uuid,p_admin_role text,p_active boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
DECLARE prior jsonb; membership_active boolean;
BEGIN
  IF NOT public.is_evntora_owner() THEN RAISE EXCEPTION 'owner access required' USING ERRCODE='42501'; END IF;
  IF p_user_id IS NULL OR p_active IS NULL OR p_user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user_id AND role='platform_owner') THEN
    RAISE EXCEPTION 'Platform Owner membership cannot be changed through administrator management';
  END IF;
  IF p_admin_role IS NULL OR p_admin_role NOT IN ('super_admin','vendor_moderator','support_admin','finance_admin') THEN RAISE EXCEPTION 'Invalid administrator role'; END IF;
  IF p_active AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'A verified Auth account is required'; END IF;
  SELECT is_active INTO membership_active FROM public.user_roles WHERE user_id=p_user_id AND role='admin' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Administrator invitation must be accepted before assigning permissions' USING ERRCODE='P0002'; END IF;
  SELECT to_jsonb(a) INTO prior FROM public.admin_role_assignments a WHERE user_id=p_user_id AND admin_role=p_admin_role FOR UPDATE;
  INSERT INTO public.admin_role_assignments(user_id,admin_role,is_active,granted_by,updated_at)
    VALUES(p_user_id,p_admin_role,p_active,auth.uid(),now())
    ON CONFLICT(user_id,admin_role) DO UPDATE SET is_active=EXCLUDED.is_active,granted_by=EXCLUDED.granted_by,updated_at=now();
  INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,before_data,after_data)
    VALUES(auth.uid(),'administrator_role_'||CASE WHEN p_active THEN 'assigned' ELSE 'revoked' END,'administrator',p_user_id::text,prior,
      jsonb_build_object('admin_role',p_admin_role,'is_active',p_active));
  PERFORM public.emit_admin_notification('admin_management',CASE WHEN p_active THEN 'administrator_role_assigned' ELSE 'administrator_role_revoked' END,CASE WHEN p_active THEN 'Administrator role assigned' ELSE 'Administrator role revoked' END,'An administrator role assignment changed.','administrator',p_user_id::text,'admin-role:'||p_user_id::text||':'||p_admin_role||':'||p_active::text||':'||clock_timestamp()::text);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.set_admin_assignment(uuid,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_admin_assignment(uuid,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_platform_metrics(p_from timestamptz DEFAULT NULL,p_to timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
BEGIN
  IF NOT (public.is_evntora_admin() OR public.has_admin_permission('vendor_read') OR public.has_admin_permission('user_read') OR public.has_admin_permission('booking_support') OR public.has_admin_permission('finance_read') OR public.has_admin_permission('analytics_finance')) THEN
    RAISE EXCEPTION 'Administrator permission required' USING ERRCODE='42501';
  END IF;
  RETURN jsonb_build_object(
    'customers',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('user_read') THEN (SELECT count(*) FROM public.user_roles WHERE role='customer' AND is_active) ELSE NULL END,
    'vendors',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('vendor_read') THEN (SELECT count(*) FROM public.vendor_profiles) ELSE NULL END,
    'verifiedVendors',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('vendor_verification') THEN (SELECT count(*) FROM public.vendor_profiles WHERE approval_status='approved') ELSE NULL END,
    'pendingVerifications',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('vendor_verification') THEN (SELECT count(*) FROM public.vendor_verification_documents WHERE status='pending') ELSE NULL END,
    'activeListings',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('listing_moderation') THEN (SELECT count(*) FROM public.vendor_listings WHERE status='published') ELSE NULL END,
    'pendingListings',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('listing_moderation') THEN (SELECT count(*) FROM public.vendor_listings WHERE status='pending_approval') ELSE NULL END,
    'bookings',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('booking_support') OR public.has_admin_permission('finance_read') THEN (SELECT count(*) FROM public.bookings WHERE (p_from IS NULL OR created_at>=p_from) AND (p_to IS NULL OR created_at<p_to)) ELSE NULL END,
    'pendingBookings',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('booking_support') THEN (SELECT count(*) FROM public.bookings WHERE status IN ('pending_vendor_confirmation','awaiting_payment','awaiting_quotation','quotation_sent','cancellation_requested')) ELSE NULL END,
    'confirmedBookings',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('booking_support') THEN (SELECT count(*) FROM public.bookings WHERE status IN ('confirmed','in_progress')) ELSE NULL END,
    'grossBookingValuePaise',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('finance_read') THEN (SELECT coalesce(sum(total_amount),0) FROM public.bookings WHERE (p_from IS NULL OR created_at>=p_from) AND (p_to IS NULL OR created_at<p_to)) ELSE NULL END,
    'recordedPaymentsPaise',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('finance_read') THEN (SELECT coalesce(sum(amount),0) FROM public.payments WHERE status IN ('captured','partially_refunded','refunded') AND (p_from IS NULL OR created_at>=p_from) AND (p_to IS NULL OR created_at<p_to)) ELSE NULL END,
    'outstandingBalancePaise',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('finance_read') THEN (SELECT coalesce(sum(greatest(total_amount-paid_amount,0)),0) FROM public.bookings WHERE status IN ('pending_vendor_confirmation','awaiting_payment','awaiting_quotation','quotation_sent','confirmed','in_progress') AND (p_from IS NULL OR created_at>=p_from) AND (p_to IS NULL OR created_at<p_to)) ELSE NULL END,
    'refundsPaise',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('finance_read') THEN (SELECT coalesce(sum(amount),0) FROM public.refunds WHERE status IN ('processed','pending') AND (p_from IS NULL OR created_at>=p_from) AND (p_to IS NULL OR created_at<p_to)) ELSE NULL END
  );
END $$;
REVOKE ALL ON FUNCTION public.admin_platform_metrics(timestamptz,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_platform_metrics(timestamptz,timestamptz) TO authenticated;

-- Bounded, database-backed daily series for the admin analytics screen.
-- Sensitive series are null unless the caller has the matching permission.
CREATE OR REPLACE FUNCTION public.admin_platform_trends(p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
DECLARE days integer := greatest(7,least(coalesce(p_days,30),365));
BEGIN
  IF NOT (public.is_evntora_admin() OR public.has_admin_permission('vendor_read') OR public.has_admin_permission('user_read') OR public.has_admin_permission('booking_support') OR public.has_admin_permission('finance_read') OR public.has_admin_permission('analytics_finance')) THEN
    RAISE EXCEPTION 'Administrator permission required' USING ERRCODE='42501';
  END IF;
  RETURN (
    WITH day_series AS (
      SELECT ((now() AT TIME ZONE 'UTC')::date-(days-1)+n)::date AS day
      FROM generate_series(0,days-1) AS g(n)
    )
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'date',d.day::text,
      'customers',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('user_read') THEN (SELECT count(*) FROM public.user_roles r WHERE r.role='customer' AND r.is_active AND (r.created_at AT TIME ZONE 'UTC')::date=d.day) ELSE NULL END,
      'vendors',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('vendor_read') THEN (SELECT count(*) FROM public.vendor_profiles v WHERE (v.created_at AT TIME ZONE 'UTC')::date=d.day) ELSE NULL END,
      'bookings',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('booking_support') THEN (SELECT count(*) FROM public.bookings b WHERE (b.created_at AT TIME ZONE 'UTC')::date=d.day) ELSE NULL END,
      'capturedPaymentsPaise',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('finance_read') THEN (SELECT coalesce(sum(p.amount),0) FROM public.payments p WHERE p.status IN ('captured','partially_refunded','refunded') AND (p.created_at AT TIME ZONE 'UTC')::date=d.day) ELSE NULL END
    ) ORDER BY d.day),'[]'::jsonb)
    FROM day_series d
  );
END $$;
REVOKE ALL ON FUNCTION public.admin_platform_trends(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_platform_trends(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_user_directory(p_search text DEFAULT NULL,p_role text DEFAULT NULL,p_limit integer DEFAULT 25,p_offset integer DEFAULT 0,p_sort text DEFAULT 'created_at',p_direction text DEFAULT 'desc')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
DECLARE search_term text := left(trim(coalesce(p_search,'')),120); page_limit integer := greatest(1,least(coalesce(p_limit,25),100)); page_offset integer := greatest(0,coalesce(p_offset,0));
BEGIN
  IF NOT (public.is_evntora_admin() OR public.has_admin_permission('user_read')) THEN RAISE EXCEPTION 'User read permission required' USING ERRCODE='42501'; END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('customer','vendor','admin','platform_owner') THEN RAISE EXCEPTION 'Invalid role filter' USING ERRCODE='22023'; END IF;
  IF p_sort NOT IN ('full_name','email','created_at') OR p_direction NOT IN ('asc','desc') THEN RAISE EXCEPTION 'Invalid user sort' USING ERRCODE='22023'; END IF;
  RETURN (
    WITH matching AS (
      SELECT p.id,p.full_name,p.email,p.phone,p.created_at,p.updated_at,
        coalesce((SELECT jsonb_agg(jsonb_build_object('role',r.role,'is_active',r.is_active) ORDER BY r.role) FROM public.user_roles r WHERE r.user_id=p.id),'[]'::jsonb) AS roles
      FROM public.profiles p
      WHERE (search_term='' OR p.full_name ILIKE '%'||search_term||'%' OR p.email ILIKE '%'||search_term||'%' OR p.phone ILIKE '%'||search_term||'%' OR p.id::text ILIKE '%'||search_term||'%')
        AND (p_role IS NULL OR EXISTS(SELECT 1 FROM public.user_roles filtered WHERE filtered.user_id=p.id AND filtered.role=p_role))
    )
    SELECT jsonb_build_object('rows',coalesce((SELECT jsonb_agg(to_jsonb(page) ORDER BY
      CASE WHEN p_sort='full_name' AND p_direction='asc' THEN page.full_name END ASC,
      CASE WHEN p_sort='full_name' AND p_direction='desc' THEN page.full_name END DESC,
      CASE WHEN p_sort='email' AND p_direction='asc' THEN page.email END ASC,
      CASE WHEN p_sort='email' AND p_direction='desc' THEN page.email END DESC,
      CASE WHEN p_sort='created_at' AND p_direction='asc' THEN page.created_at END ASC,
      CASE WHEN p_sort='created_at' AND p_direction='desc' THEN page.created_at END DESC,page.id)
      FROM (SELECT * FROM matching ORDER BY
        CASE WHEN p_sort='full_name' AND p_direction='asc' THEN full_name END ASC,
        CASE WHEN p_sort='full_name' AND p_direction='desc' THEN full_name END DESC,
        CASE WHEN p_sort='email' AND p_direction='asc' THEN email END ASC,
        CASE WHEN p_sort='email' AND p_direction='desc' THEN email END DESC,
        CASE WHEN p_sort='created_at' AND p_direction='asc' THEN created_at END ASC,
        CASE WHEN p_sort='created_at' AND p_direction='desc' THEN created_at END DESC,id LIMIT page_limit OFFSET page_offset) page),'[]'::jsonb),'total',(SELECT count(*) FROM matching))
  );
END $$;
REVOKE ALL ON FUNCTION public.admin_user_directory(text,text,integer,integer,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_user_directory(text,text,integer,integer,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_role_active(p_user_id uuid,p_role text,p_active boolean,p_reason text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
DECLARE prior_active boolean; clean_reason text := left(trim(coalesce(p_reason,'')),1000);
BEGIN
  IF NOT (public.is_evntora_admin() OR public.has_admin_permission('user_manage')) THEN RAISE EXCEPTION 'User management permission required' USING ERRCODE='42501'; END IF;
  IF p_role NOT IN ('customer','vendor') OR p_user_id=auth.uid() THEN RAISE EXCEPTION 'Only another customer or vendor membership may be changed' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user_id AND role IN ('admin','platform_owner') AND is_active) THEN RAISE EXCEPTION 'Administrator access must be managed through Admin Management' USING ERRCODE='42501'; END IF;
  IF p_active IS NULL OR (NOT p_active AND length(clean_reason)<3) THEN RAISE EXCEPTION 'A reason is required to suspend workspace access' USING ERRCODE='22023'; END IF;
  SELECT is_active INTO prior_active FROM public.user_roles WHERE user_id=p_user_id AND role=p_role FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User workspace membership not found' USING ERRCODE='P0002'; END IF;
  IF prior_active=p_active THEN RETURN true; END IF;
  UPDATE public.user_roles SET is_active=p_active,granted_by=CASE WHEN p_active THEN auth.uid() ELSE granted_by END WHERE user_id=p_user_id AND role=p_role;
  INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,reason,before_data,after_data)
    VALUES(auth.uid(),CASE WHEN p_active THEN 'user_workspace_reactivated' ELSE 'user_workspace_suspended' END,'user_role',p_user_id::text,CASE WHEN p_active THEN null ELSE clean_reason END,
      jsonb_build_object('role',p_role,'is_active',prior_active),jsonb_build_object('role',p_role,'is_active',p_active));
  INSERT INTO public.user_notifications(user_id,event_type,title,body,entity_type,entity_id,dedupe_key)
    VALUES(p_user_id,CASE WHEN p_active THEN 'workspace_access_restored' ELSE 'workspace_access_suspended' END,
      CASE WHEN p_active THEN 'Workspace access restored' ELSE 'Workspace access suspended' END,
      CASE WHEN p_active THEN 'Your '||p_role||' workspace access has been restored.' ELSE 'Your '||p_role||' workspace access was suspended. Contact Evntora support if you need assistance.' END,
      'user_role',p_role||':'||p_user_id::text,'workspace-access:'||p_role||':'||p_user_id::text||':'||p_active::text||':'||clock_timestamp()::text)
    ON CONFLICT(user_id,dedupe_key) DO NOTHING;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_user_role_active(uuid,text,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role_active(uuid,text,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_platform_breakdowns()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
BEGIN
  IF NOT (public.is_evntora_admin() OR public.has_admin_permission('vendor_read') OR public.has_admin_permission('booking_support') OR public.has_admin_permission('user_read') OR public.has_admin_permission('finance_read') OR public.has_admin_permission('analytics_finance')) THEN
    RAISE EXCEPTION 'Administrator permission required' USING ERRCODE='42501';
  END IF;
  RETURN jsonb_build_object(
    'popularEventCategories',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('booking_support') OR public.has_admin_permission('user_read') THEN
      (SELECT coalesce(jsonb_agg(jsonb_build_object('label',category,'count',total) ORDER BY total DESC),'[]'::jsonb) FROM (SELECT category,count(*) AS total FROM public.events WHERE trim(coalesce(category,''))<>'' GROUP BY category ORDER BY total DESC LIMIT 10) c) ELSE NULL END,
    'popularLocations',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('booking_support') OR public.has_admin_permission('user_read') THEN
      (SELECT coalesce(jsonb_agg(jsonb_build_object('label',city,'count',total) ORDER BY total DESC),'[]'::jsonb) FROM (SELECT city,count(*) AS total FROM public.events WHERE trim(coalesce(city,''))<>'' GROUP BY city ORDER BY total DESC LIMIT 10) c) ELSE NULL END,
    'bookingStatuses',CASE WHEN public.is_evntora_admin() OR public.has_admin_permission('booking_support') OR public.has_admin_permission('finance_read') THEN
      (SELECT coalesce(jsonb_agg(jsonb_build_object('label',status::text,'count',total) ORDER BY total DESC),'[]'::jsonb) FROM (SELECT status,count(*) AS total FROM public.bookings GROUP BY status ORDER BY total DESC) b) ELSE NULL END
  );
END $$;
REVOKE ALL ON FUNCTION public.admin_platform_breakdowns() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_platform_breakdowns() TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_admin_on_booking_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status='cancellation_requested' THEN
    PERFORM public.emit_admin_notification('booking_support','booking_cancellation_requested','Booking cancellation requested',
      'A customer requested cancellation of a booking.','booking',NEW.id::text,'booking-cancel:'||NEW.id::text||':'||NEW.updated_at::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS admin_notify_booking_change ON public.bookings;
CREATE TRIGGER admin_notify_booking_change AFTER UPDATE OF status ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_booking_change();

CREATE OR REPLACE FUNCTION public.notify_admin_on_payment_failure()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ BEGIN
  IF NEW.status='failed' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.emit_admin_notification('finance_read','payment_failed','Payment failed','A booking payment failed and may need reconciliation.',
      'payment',NEW.id::text,'payment-failed:'||NEW.id::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS admin_notify_payment_failure ON public.payments;
CREATE TRIGGER admin_notify_payment_failure AFTER INSERT OR UPDATE OF status ON public.payments FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_payment_failure();

-- These SECURITY DEFINER functions are trigger-only and must not be callable by
-- browser roles. Trigger execution does not require caller EXECUTE privileges.
REVOKE ALL ON FUNCTION public.notify_admin_message_recipient() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.audit_admin_invitation_created() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.audit_admin_invitation_state() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.notify_admin_on_vendor_document() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.notify_vendor_verification_decision() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.notify_admin_on_vendor_registration() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.audit_and_notify_refund() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.notify_admin_support_case() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.notify_admin_on_listing_submission() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.notify_admin_on_booking_change() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.notify_admin_on_payment_failure() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.notify_vendor_listing_decision() FROM PUBLIC,anon,authenticated;



