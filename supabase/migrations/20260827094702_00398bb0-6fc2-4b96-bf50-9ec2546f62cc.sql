-- 1. Classes
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  name text NOT NULL,
  section text NOT NULL DEFAULT 'A',
  class_teacher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  room text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, session_id, name, section)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER classes_touch BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Subject teacher assignments (teacher -> subject -> class)
CREATE TABLE public.class_subject_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, course_id, teacher_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_subject_teachers TO authenticated;
GRANT ALL ON public.class_subject_teachers TO service_role;
ALTER TABLE public.class_subject_teachers ENABLE ROW LEVEL SECURITY;

CREATE INDEX cst_teacher_idx ON public.class_subject_teachers (teacher_id);
CREATE INDEX cst_class_idx ON public.class_subject_teachers (class_id);

-- 3. Students belong to a class; admission number
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admission_number text;

CREATE INDEX IF NOT EXISTS students_class_idx ON public.students (class_id);

-- 4. Mark components
ALTER TABLE public.marks
  ADD COLUMN IF NOT EXISTS assessment_marks numeric,
  ADD COLUMN IF NOT EXISTS internal_marks numeric,
  ADD COLUMN IF NOT EXISTS external_marks numeric,
  ADD COLUMN IF NOT EXISTS copy_correction_marks numeric;

-- 5. Mark sheets can target a class directly
ALTER TABLE public.mark_sheets
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

-- 6. Authorization helpers
CREATE OR REPLACE FUNCTION public.is_class_teacher_of(_class uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.classes c WHERE c.id = _class AND c.class_teacher_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.teaches_class(_class uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_subject_teachers t
    WHERE t.class_id = _class AND t.teacher_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.teaches_class_subject(_class uuid, _course uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_subject_teachers t
    WHERE t.class_id = _class AND t.course_id = _course AND t.teacher_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_see_class(_class uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = _class
      AND (public.can_manage(c.institution_id)
           OR c.class_teacher_id = auth.uid()
           OR public.teaches_class(c.id))
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_class_teacher_of(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.teaches_class(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.teaches_class_subject(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_see_class(uuid) FROM anon;

-- 7. Policies: classes
CREATE POLICY "classes readable by institution members"
  ON public.classes FOR SELECT TO authenticated
  USING (public.is_member(institution_id));

CREATE POLICY "classes managed by admins and management"
  ON public.classes FOR INSERT TO authenticated
  WITH CHECK (public.can_manage(institution_id));

CREATE POLICY "classes updated by admins and management"
  ON public.classes FOR UPDATE TO authenticated
  USING (public.can_manage(institution_id))
  WITH CHECK (public.can_manage(institution_id));

CREATE POLICY "classes deleted by admins"
  ON public.classes FOR DELETE TO authenticated
  USING (public.is_admin(institution_id));

-- 8. Policies: class_subject_teachers
CREATE POLICY "assignments readable by members"
  ON public.class_subject_teachers FOR SELECT TO authenticated
  USING (public.is_member(institution_id));

CREATE POLICY "assignments created by management"
  ON public.class_subject_teachers FOR INSERT TO authenticated
  WITH CHECK (public.can_manage(institution_id));

CREATE POLICY "assignments updated by management"
  ON public.class_subject_teachers FOR UPDATE TO authenticated
  USING (public.can_manage(institution_id))
  WITH CHECK (public.can_manage(institution_id));

CREATE POLICY "assignments deleted by management"
  ON public.class_subject_teachers FOR DELETE TO authenticated
  USING (public.can_manage(institution_id));