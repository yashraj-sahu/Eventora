-- Signup metadata is user-controlled. It may request a vendor account, but never
-- grant administrator access. Existing profile roles are deliberately unchanged.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    CASE
      WHEN NEW.raw_user_meta_data ->> 'role' = 'vendor' THEN 'vendor'::public.user_role
      ELSE 'customer'::public.user_role
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
