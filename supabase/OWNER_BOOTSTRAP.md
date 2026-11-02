# First Platform Owner Bootstrap

There is deliberately no public bootstrap endpoint or admin signup. Review legacy administrator candidates before applying migration `007_role_memberships_and_secure_admin.sql`; then establish the Platform Owner as described below.

## Review legacy administrator accounts

Migration 007 backfills customer and vendor memberships, but deliberately does not convert `profiles.role = 'admin'` into administrator access. The original signup trigger trusted public role metadata, so that legacy value alone does not prove authorization. Before applying the migration, review these candidate accounts privately and confirm both the verified identity and the administrator authorization with your own records:

```sql
SELECT p.id, p.email AS profile_email, u.email AS auth_email,
       u.email_confirmed_at, p.created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role::text = 'admin'
ORDER BY p.created_at;
```

Do not promote candidates automatically. After bootstrapping the Platform Owner, invite only the accounts you have confirmed through `/admin/administrators`. No account data was read while preparing this migration, so the implementation report cannot list candidate identities.

1. In Supabase Dashboard, open **SQL Editor** and run this read-only query. Confirm the exact email and Auth user ID belong to your existing account and `email_confirmed_at` is not null. Do not share the result publicly.

```sql
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email_confirmed_at IS NOT NULL
ORDER BY created_at;
```

2. Replace `CONFIRM_THE_EXACT_VERIFIED_EMAIL` below with that exact email address, then run the block once in SQL Editor. Migration 007 stops with an explicit error if it finds duplicate Platform Owner rows; do not delete or deactivate any account automatically. Resolve any such conflict manually before rerunning the migration. The bootstrap refuses to replace any existing different or inactive owner. Re-running it for the same active owner is a no-op.

```sql
DO $bootstrap$
DECLARE
  target_email text := lower(trim('CONFIRM_THE_EXACT_VERIFIED_EMAIL'));
  target_user uuid;
  current_owner uuid;
  owner_active boolean;
  owner_count integer;
BEGIN
  SELECT id INTO target_user
  FROM auth.users
  WHERE lower(email) = target_email
    AND email_confirmed_at IS NOT NULL;

  IF target_user IS NULL THEN
    RAISE EXCEPTION 'No verified Auth account matches the supplied email';
  END IF;

  SELECT count(*) INTO owner_count
  FROM public.user_roles
  WHERE role = 'platform_owner';

  IF owner_count > 1 THEN
    RAISE EXCEPTION 'Multiple Platform Owner memberships exist; resolve them manually with no automatic changes';
  END IF;

  IF owner_count = 1 THEN
    SELECT user_id, is_active INTO current_owner, owner_active
    FROM public.user_roles
    WHERE role = 'platform_owner';
    IF current_owner = target_user AND owner_active THEN
      RAISE NOTICE 'This account is already the active Platform Owner; no changes made';
      RETURN;
    END IF;
    RAISE EXCEPTION 'A Platform Owner membership already exists; investigate manually with no changes';
  END IF;

  INSERT INTO public.user_roles (user_id, role, is_active, granted_by)
  VALUES (target_user, 'platform_owner', true, target_user);
END;
$bootstrap$;
```

No email or user ID is guessed or embedded in application code. The bootstrap is a database-owner operation and has no callable public route.
