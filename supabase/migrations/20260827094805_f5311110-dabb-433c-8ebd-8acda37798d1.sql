REVOKE EXECUTE ON FUNCTION public.is_class_teacher_of(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.teaches_class(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.teaches_class_subject(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_see_class(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_class_teacher_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teaches_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teaches_class_subject(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_see_class(uuid) TO authenticated;