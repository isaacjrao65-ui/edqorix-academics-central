REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_perm(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seed_default_roles(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_institution_roles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_perm(uuid, text) TO authenticated;