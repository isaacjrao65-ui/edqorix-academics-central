-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','exam_cell','hod','faculty');
CREATE TYPE public.institution_type AS ENUM ('school','college','institute','university');
CREATE TYPE public.exam_type AS ENUM ('internal','midterm','final','practical','assignment','project');
CREATE TYPE public.sheet_status AS ENUM ('draft','submitted','verified','approved','published','returned');
CREATE TYPE public.mark_state AS ENUM ('present','absent','exempt','malpractice');
CREATE TYPE public.student_status AS ENUM ('active','graduated','withdrawn','suspended');
CREATE TYPE public.invite_status AS ENUM ('pending','accepted','revoked');

-- ============ HELPERS: updated_at ============
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  designation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ INSTITUTIONS ============
CREATE TABLE public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text,
  type public.institution_type NOT NULL DEFAULT 'college',
  address text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institutions TO authenticated;
GRANT ALL ON public.institutions TO service_role;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- ============ MEMBERSHIPS ============
CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'faculty',
  department_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, user_id, role)
);
CREATE INDEX ON public.memberships (user_id);
CREATE INDEX ON public.memberships (institution_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT ALL ON public.memberships TO service_role;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- ============ SECURITY DEFINER HELPERS ============
CREATE OR REPLACE FUNCTION public.is_member(_institution uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships m
    WHERE m.institution_id = _institution AND m.user_id = auth.uid() AND m.is_active);
$$;

CREATE OR REPLACE FUNCTION public.has_inst_role(_institution uuid, _role public.app_role) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships m
    WHERE m.institution_id = _institution AND m.user_id = auth.uid()
      AND m.role = _role AND m.is_active);
$$;

CREATE OR REPLACE FUNCTION public.can_manage(_institution uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships m
    WHERE m.institution_id = _institution AND m.user_id = auth.uid()
      AND m.role IN ('admin','exam_cell') AND m.is_active);
$$;

CREATE OR REPLACE FUNCTION public.my_departments(_institution uuid) RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.department_id FROM public.memberships m
  WHERE m.institution_id = _institution AND m.user_id = auth.uid()
    AND m.is_active AND m.department_id IS NOT NULL;
$$;

-- institution/membership policies
CREATE POLICY inst_select ON public.institutions FOR SELECT TO authenticated
  USING (public.is_member(id) OR created_by = auth.uid());
CREATE POLICY inst_insert ON public.institutions FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY inst_update ON public.institutions FOR UPDATE TO authenticated
  USING (public.has_inst_role(id,'admin'));
CREATE POLICY inst_delete ON public.institutions FOR DELETE TO authenticated
  USING (public.has_inst_role(id,'admin'));

CREATE POLICY mem_select ON public.memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_member(institution_id));
CREATE POLICY mem_insert ON public.memberships FOR INSERT TO authenticated
  WITH CHECK (public.has_inst_role(institution_id,'admin'));
CREATE POLICY mem_update ON public.memberships FOR UPDATE TO authenticated
  USING (public.has_inst_role(institution_id,'admin'));
CREATE POLICY mem_delete ON public.memberships FOR DELETE TO authenticated
  USING (public.has_inst_role(institution_id,'admin'));

CREATE POLICY prof_select ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.memberships a JOIN public.memberships b
      ON a.institution_id = b.institution_id
    WHERE a.user_id = auth.uid() AND b.user_id = public.profiles.id));
CREATE POLICY prof_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY prof_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- creator becomes admin
CREATE OR REPLACE FUNCTION public.bootstrap_institution_admin() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.memberships (institution_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER inst_bootstrap AFTER INSERT ON public.institutions
FOR EACH ROW EXECUTE FUNCTION public.bootstrap_institution_admin();

-- ============ ACADEMIC STRUCTURE ============
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, code)
);
ALTER TABLE public.memberships ADD CONSTRAINT memberships_department_fk
  FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text NOT NULL,
  level text NOT NULL DEFAULT 'undergraduate',
  duration_semesters int NOT NULL DEFAULT 8,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, code)
);

CREATE TABLE public.academic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, name)
);

CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  code text NOT NULL,
  title text NOT NULL,
  credits numeric(4,1) NOT NULL DEFAULT 3,
  semester int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, code)
);

CREATE TABLE public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'A',
  faculty_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  room text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, session_id, name)
);
CREATE INDEX ON public.sections (institution_id);
CREATE INDEX ON public.sections (faculty_id);

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  roll_number text NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  batch_year int,
  current_semester int NOT NULL DEFAULT 1,
  status public.student_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, roll_number)
);
CREATE INDEX ON public.students (institution_id, full_name);

CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_id, student_id)
);
CREATE INDEX ON public.enrollments (student_id);

-- ============ EXAMS / MARKS ============
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  exam_type public.exam_type NOT NULL DEFAULT 'internal',
  title text NOT NULL,
  max_marks numeric(6,2) NOT NULL DEFAULT 100,
  pass_marks numeric(6,2) NOT NULL DEFAULT 40,
  weightage numeric(5,2) NOT NULL DEFAULT 100,
  exam_date date,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.exams (institution_id, session_id);

CREATE TABLE public.mark_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  status public.sheet_status NOT NULL DEFAULT 'draft',
  remarks text,
  submitted_by uuid, submitted_at timestamptz,
  verified_by uuid, verified_at timestamptz,
  approved_by uuid, approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, section_id)
);
CREATE INDEX ON public.mark_sheets (institution_id, status);

CREATE TABLE public.marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  mark_sheet_id uuid NOT NULL REFERENCES public.mark_sheets(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score numeric(6,2),
  state public.mark_state NOT NULL DEFAULT 'present',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mark_sheet_id, student_id)
);
CREATE INDEX ON public.marks (student_id);

CREATE TABLE public.grade_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.grade_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  scale_id uuid NOT NULL REFERENCES public.grade_scales(id) ON DELETE CASCADE,
  grade text NOT NULL,
  min_percent numeric(5,2) NOT NULL,
  grade_points numeric(4,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  exam_id uuid REFERENCES public.exams(id) ON DELETE SET NULL,
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  storage_path text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.documents (institution_id, created_at DESC);

CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'faculty',
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  status public.invite_status NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL DEFAULT auth.uid(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.invitations (lower(email));

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL DEFAULT auth.uid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  description text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.audit_logs (institution_id, created_at DESC);

-- ============ GRANTS ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['departments','programs','academic_sessions','courses','sections','students','enrollments','exams','mark_sheets','marks','grade_scales','grade_bands','documents','invitations']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_member(institution_id))', t||'_sel', t);
  END LOOP;
END $$;

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_sel ON public.audit_logs FOR SELECT TO authenticated
  USING (public.can_manage(institution_id));
CREATE POLICY audit_ins ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_member(institution_id) AND actor_id = auth.uid());

-- ============ WRITE POLICIES ============
-- admin-managed structural tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['departments','programs','academic_sessions','courses','sections','students','enrollments','grade_scales','grade_bands','invitations']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_manage(institution_id))', t||'_ins', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can_manage(institution_id))', t||'_upd', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.can_manage(institution_id))', t||'_del', t);
  END LOOP;
END $$;

-- exams: admin/exam cell manage
CREATE POLICY exams_ins ON public.exams FOR INSERT TO authenticated WITH CHECK (public.can_manage(institution_id));
CREATE POLICY exams_upd ON public.exams FOR UPDATE TO authenticated USING (public.can_manage(institution_id));
CREATE POLICY exams_del ON public.exams FOR DELETE TO authenticated USING (public.can_manage(institution_id));

-- documents: any member can upload, manage roles can delete
CREATE POLICY docs_ins ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.is_member(institution_id) AND uploaded_by = auth.uid());
CREATE POLICY docs_upd ON public.documents FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR public.can_manage(institution_id));
CREATE POLICY docs_del ON public.documents FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.can_manage(institution_id));

-- mark sheets
CREATE OR REPLACE FUNCTION public.is_section_faculty(_section uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sections s WHERE s.id = _section AND s.faculty_id = auth.uid());
$$;

CREATE POLICY sheets_ins ON public.mark_sheets FOR INSERT TO authenticated
  WITH CHECK (public.can_manage(institution_id) OR public.is_section_faculty(section_id));
CREATE POLICY sheets_upd ON public.mark_sheets FOR UPDATE TO authenticated
  USING (public.is_member(institution_id));
CREATE POLICY sheets_del ON public.mark_sheets FOR DELETE TO authenticated
  USING (public.can_manage(institution_id));

CREATE OR REPLACE FUNCTION public.can_edit_marks(_sheet uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mark_sheets ms
    WHERE ms.id = _sheet
      AND ms.status IN ('draft','returned')
      AND (public.is_section_faculty(ms.section_id) OR public.can_manage(ms.institution_id))
  );
$$;

CREATE POLICY marks_ins ON public.marks FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_marks(mark_sheet_id));
CREATE POLICY marks_upd ON public.marks FOR UPDATE TO authenticated
  USING (public.can_edit_marks(mark_sheet_id));
CREATE POLICY marks_del ON public.marks FOR DELETE TO authenticated
  USING (public.can_manage(institution_id));

-- updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','institutions','students','exams','mark_sheets']
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', t||'_touch', t);
  END LOOP;
END $$;

-- ============ STORAGE ============
CREATE POLICY "records read members" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'records' AND public.is_member(((storage.foldername(name))[1])::uuid));
CREATE POLICY "records insert members" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'records' AND public.is_member(((storage.foldername(name))[1])::uuid));
CREATE POLICY "records delete managers" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'records' AND public.can_manage(((storage.foldername(name))[1])::uuid));