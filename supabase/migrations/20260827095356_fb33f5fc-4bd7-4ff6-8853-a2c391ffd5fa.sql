CREATE OR REPLACE FUNCTION public.can_see_student(_student uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = _student
      AND (
        public.can_manage(s.institution_id)
        OR (s.class_id IS NOT NULL AND public.can_see_class(s.class_id))
        OR EXISTS (
          SELECT 1 FROM public.enrollments e
          JOIN public.sections sec ON sec.id = e.section_id
          WHERE e.student_id = s.id AND sec.faculty_id = auth.uid()
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_see_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_see_student(uuid) TO authenticated;

DROP POLICY IF EXISTS students_sel ON public.students;
CREATE POLICY students_sel ON public.students FOR SELECT TO authenticated
USING (
  public.can_manage(institution_id)
  OR (class_id IS NOT NULL AND public.can_see_class(class_id))
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.sections sec ON sec.id = e.section_id
    WHERE e.student_id = students.id AND sec.faculty_id = auth.uid()
  )
);