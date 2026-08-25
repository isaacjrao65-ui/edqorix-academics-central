REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bootstrap_institution_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.is_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_inst_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_departments(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_section_faculty(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_edit_marks(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_inst_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_departments(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_section_faculty(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_marks(uuid) TO authenticated;