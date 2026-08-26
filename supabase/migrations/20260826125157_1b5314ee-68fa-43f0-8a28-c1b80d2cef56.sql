REVOKE EXECUTE ON FUNCTION public.grant_platform_admin_for_allowlist() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.bootstrap_institution_admin() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.bootstrap_institution_roles() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.seed_default_roles(uuid) FROM anon, authenticated, public;