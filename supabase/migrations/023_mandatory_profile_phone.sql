-- Store one normalized international phone number in the existing profiles.phone field.
-- Existing NULL values are retained for legacy users and authorized pending admin invites.

CREATE OR REPLACE FUNCTION public.normalize_phone_number_e164(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  cleaned text;
  digits text;
BEGIN
  IF p_phone IS NULL OR length(btrim(p_phone)) = 0 OR length(p_phone) > 40
     OR btrim(p_phone) !~ '^\+?[0-9 ()-]+$' THEN
    RAISE EXCEPTION 'A valid international phone number is required' USING ERRCODE = '22023';
  END IF;
  cleaned := regexp_replace(btrim(p_phone), '[ ()-]', '', 'g');
  IF left(cleaned, 2) = '00' THEN cleaned := '+' || substr(cleaned, 3); END IF;
  IF left(cleaned, 1) <> '+' THEN
    RAISE EXCEPTION 'Phone number must include its country calling code' USING ERRCODE = '22023';
  END IF;
  digits := substr(cleaned, 2);
  IF digits !~ '^[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'Phone number is not a valid international number' USING ERRCODE = '22023';
  END IF;
  IF left(digits, 2) = '91' AND digits !~ '^91[6-9][0-9]{9}$' THEN
    RAISE EXCEPTION 'Enter a valid 10-digit Indian phone number after +91' USING ERRCODE = '22023';
  END IF;
  RETURN '+' || digits;
END;
$$;
REVOKE ALL ON FUNCTION public.normalize_phone_number_e164(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_profile_phone_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  invite_exists boolean := false;
BEGIN
  IF TG_OP = 'INSERT' AND (NEW.phone IS NULL OR length(btrim(NEW.phone)) = 0) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.admin_invitations AS invitation
      WHERE lower(invitation.email) = lower(NEW.email)
        AND (invitation.target_user_id IS NULL OR invitation.target_user_id = NEW.id)
        AND invitation.accepted_at IS NULL AND invitation.revoked_at IS NULL
        AND invitation.expired_at IS NULL AND invitation.expires_at > now()
    ) INTO invite_exists;
    IF NOT invite_exists THEN
      RAISE EXCEPTION 'Phone number is required to create an Evntora account' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.phone := public.normalize_phone_number_e164(NEW.phone);
    RETURN NEW;
  END IF;

  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    IF NEW.phone IS NULL OR length(btrim(NEW.phone)) = 0 THEN
      RAISE EXCEPTION 'Phone number cannot be removed from an account' USING ERRCODE = '23514';
    END IF;
    NEW.phone := public.normalize_phone_number_e164(NEW.phone);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_profile_phone_number() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_phone_number_guard ON public.profiles;
CREATE TRIGGER profiles_phone_number_guard
BEFORE INSERT OR UPDATE OF phone ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_phone_number();
