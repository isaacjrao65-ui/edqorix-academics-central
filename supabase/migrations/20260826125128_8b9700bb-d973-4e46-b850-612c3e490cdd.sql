CREATE TABLE public.platform_owner_emails (
  email text PRIMARY KEY,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_owner_emails TO authenticated;
GRANT ALL ON public.platform_owner_emails TO service_role;

ALTER TABLE public.platform_owner_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform owners manage owner emails"
ON public.platform_owner_emails FOR ALL TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- seed with the existing owners so the list is never empty
INSERT INTO public.platform_owner_emails (email, note)
SELECT lower(pa.email), 'Imported from existing platform owners'
FROM public.platform_admins pa
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.platform_owner_emails (email, note)
VALUES ('isaacjrao65@edqorix.com', 'Founding platform owner')
ON CONFLICT (email) DO NOTHING;

-- allowlist-aware owner check (verified emails only)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM auth.users u
        JOIN public.platform_owner_emails poe ON poe.email = lower(u.email)
        WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
      );
$$;

-- keep platform_admins in sync for verified allowlisted accounts
CREATE OR REPLACE FUNCTION public.grant_platform_admin_for_allowlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.platform_owner_emails poe WHERE poe.email = lower(NEW.email)) THEN
    INSERT INTO public.platform_admins (user_id, email)
    VALUES (NEW.id, lower(NEW.email))
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_platform_owner ON auth.users;
CREATE TRIGGER on_auth_user_created_platform_owner
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_platform_admin_for_allowlist();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_platform_owner ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_platform_owner
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_platform_admin_for_allowlist();

-- backfill existing verified accounts on the allowlist
INSERT INTO public.platform_admins (user_id, email)
SELECT u.id, lower(u.email)
FROM auth.users u
JOIN public.platform_owner_emails poe ON poe.email = lower(u.email)
WHERE u.email_confirmed_at IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;