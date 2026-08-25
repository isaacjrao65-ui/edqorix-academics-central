-- ============ enums ============
CREATE TYPE public.member_status AS ENUM ('active','suspended','deactivated');

-- ============ permissions catalogue ============
CREATE TABLE public.permissions (
  key text PRIMARY KEY,
  grp text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions readable by staff" ON public.permissions
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.permissions (key, grp, label, sort_order) VALUES
  ('students.view','Students','View students',10),
  ('students.create','Students','Create students',20),
  ('students.edit','Students','Edit students',30),
  ('students.archive','Students','Archive students',40),
  ('students.import','Students','Import students',50),
  ('students.export','Students','Export students',60),
  ('teachers.view','Teachers','View teachers',110),
  ('teachers.create','Teachers','Create teachers',120),
  ('teachers.edit','Teachers','Edit teachers',130),
  ('teachers.assign','Teachers','Assign teachers',140),
  ('teachers.deactivate','Teachers','Deactivate teachers',150),
  ('users.view','Users','View users',210),
  ('users.create','Users','Create users',220),
  ('users.edit','Users','Edit users',230),
  ('users.delete','Users','Delete users',240),
  ('users.reset_password','Users','Reset passwords',250),
  ('roles.manage','Users','Manage roles and permissions',260),
  ('academics.view','Academic','View classes and subjects',310),
  ('academics.manage','Academic','Manage classes, sections and subjects',320),
  ('exams.view','Examinations','View examinations',410),
  ('exams.create','Examinations','Create examinations',420),
  ('exams.edit','Examinations','Edit examinations',430),
  ('exams.delete','Examinations','Delete examinations',440),
  ('exams.approve','Examinations','Approve examinations',450),
  ('exams.lock','Examinations','Lock examinations',460),
  ('exams.unlock','Examinations','Unlock examinations',470),
  ('marks.view','Marks','View marks',510),
  ('marks.enter','Marks','Enter marks',520),
  ('marks.edit','Marks','Edit marks',530),
  ('marks.submit','Marks','Submit marks',540),
  ('marks.verify','Marks','Verify marks',550),
  ('marks.approve','Marks','Approve marks',560),
  ('marks.lock','Marks','Lock marks',570),
  ('marks.unlock','Marks','Unlock marks',580),
  ('documents.view','Documents','View documents',610),
  ('documents.upload','Documents','Upload documents',620),
  ('documents.download','Documents','Download documents',630),
  ('documents.edit','Documents','Edit documents',640),
  ('documents.archive','Documents','Archive documents',650),
  ('documents.delete','Documents','Delete documents',660),
  ('reports.view','Reports','View reports',710),
  ('reports.generate','Reports','Generate reports',720),
  ('reports.export','Reports','Export reports',730),
  ('institution.manage','Institution','Manage institution settings',810),
  ('system.audit','System','View audit logs',910),
  ('system.security','System','Manage security settings',920),
  ('system.impersonate','System','View as another user',930);

-- ============ roles ============
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  key text,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles readable by members" ON public.roles
  FOR SELECT TO authenticated USING (public.is_member(institution_id));
CREATE POLICY "roles insert by admin" ON public.roles
  FOR INSERT TO authenticated WITH CHECK (public.can_manage(institution_id));
CREATE POLICY "roles update by admin" ON public.roles
  FOR UPDATE TO authenticated USING (public.can_manage(institution_id) AND NOT is_system)
  WITH CHECK (public.can_manage(institution_id) AND NOT is_system);
CREATE POLICY "roles delete by admin" ON public.roles
  FOR DELETE TO authenticated USING (public.can_manage(institution_id) AND NOT is_system);
CREATE TRIGGER roles_touch BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ role permissions ============
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_perms readable by members" ON public.role_permissions
  FOR SELECT TO authenticated USING (public.is_member(institution_id));
CREATE POLICY "role_perms insert by admin" ON public.role_permissions
  FOR INSERT TO authenticated WITH CHECK (public.can_manage(institution_id));
CREATE POLICY "role_perms update by admin" ON public.role_permissions
  FOR UPDATE TO authenticated USING (public.can_manage(institution_id))
  WITH CHECK (public.can_manage(institution_id));
CREATE POLICY "role_perms delete by admin" ON public.role_permissions
  FOR DELETE TO authenticated USING (public.can_manage(institution_id));

-- ============ per-user overrides ============
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, user_id, permission_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_perms readable by members" ON public.user_permissions
  FOR SELECT TO authenticated USING (public.is_member(institution_id));
CREATE POLICY "user_perms insert by admin" ON public.user_permissions
  FOR INSERT TO authenticated WITH CHECK (public.can_manage(institution_id));
CREATE POLICY "user_perms update by admin" ON public.user_permissions
  FOR UPDATE TO authenticated USING (public.can_manage(institution_id))
  WITH CHECK (public.can_manage(institution_id));
CREATE POLICY "user_perms delete by admin" ON public.user_permissions
  FOR DELETE TO authenticated USING (public.can_manage(institution_id));

-- ============ membership extensions ============
ALTER TABLE public.memberships
  ADD COLUMN status public.member_status NOT NULL DEFAULT 'active',
  ADD COLUMN designation text,
  ADD COLUMN is_class_teacher boolean NOT NULL DEFAULT false,
  ADD COLUMN role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE TRIGGER memberships_touch BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ audit log extensions ============
ALTER TABLE public.audit_logs
  ADD COLUMN reason text,
  ADD COLUMN old_value jsonb,
  ADD COLUMN new_value jsonb;

-- ============ permission resolution ============
CREATE OR REPLACE FUNCTION public.is_admin(_institution uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.institution_id = _institution AND m.user_id = auth.uid()
      AND m.role = 'admin' AND m.is_active AND m.status = 'active');
$$;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_perm(_institution uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.is_admin(_institution) THEN true
    WHEN EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.institution_id = _institution AND up.user_id = auth.uid()
        AND up.permission_key = _permission
    ) THEN (
      SELECT up.granted FROM public.user_permissions up
      WHERE up.institution_id = _institution AND up.user_id = auth.uid()
        AND up.permission_key = _permission LIMIT 1
    )
    ELSE EXISTS (
      SELECT 1 FROM public.memberships m
      JOIN public.role_permissions rp ON rp.role_id = m.role_id
      WHERE m.institution_id = _institution AND m.user_id = auth.uid()
        AND m.is_active AND m.status = 'active'
        AND rp.permission_key = _permission)
  END;
$$;
REVOKE ALL ON FUNCTION public.has_perm(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_perm(uuid, text) TO authenticated;

-- ============ seed built-in roles for existing institutions ============
CREATE OR REPLACE FUNCTION public.seed_default_roles(_institution uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r_id uuid;
BEGIN
  INSERT INTO public.roles (institution_id, key, name, description, is_system)
  VALUES (_institution,'super_admin','Super Admin','Full institution authority',true)
  ON CONFLICT (institution_id, name) DO NOTHING;

  INSERT INTO public.roles (institution_id, key, name, description, is_system)
  VALUES (_institution,'principal','Principal','Institution-wide oversight and approvals',true)
  ON CONFLICT (institution_id, name) DO NOTHING
  RETURNING id INTO r_id;
  IF r_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (institution_id, role_id, permission_key)
    SELECT _institution, r_id, key FROM public.permissions
    WHERE key NOT IN ('users.delete','system.security','system.impersonate')
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.roles (institution_id, key, name, description, is_system)
  VALUES (_institution,'staff','Staff','Examination cell and office staff',true)
  ON CONFLICT (institution_id, name) DO NOTHING
  RETURNING id INTO r_id;
  IF r_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (institution_id, role_id, permission_key)
    SELECT _institution, r_id, key FROM public.permissions
    WHERE grp IN ('Students','Teachers','Academic','Examinations','Marks','Documents','Reports')
      AND key NOT IN ('exams.delete','marks.unlock','documents.delete')
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.roles (institution_id, key, name, description, is_system)
  VALUES (_institution,'class_teacher','Class Teacher','Owns a class and verifies its marks',true)
  ON CONFLICT (institution_id, name) DO NOTHING
  RETURNING id INTO r_id;
  IF r_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (institution_id, role_id, permission_key)
    SELECT _institution, r_id, key FROM public.permissions
    WHERE key IN ('students.view','students.export','teachers.view','academics.view',
                  'exams.view','marks.view','marks.enter','marks.edit','marks.submit',
                  'marks.verify','documents.view','documents.upload','documents.download',
                  'reports.view','reports.generate','reports.export')
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.roles (institution_id, key, name, description, is_system)
  VALUES (_institution,'subject_teacher','Subject Teacher','Enters marks for assigned subjects',true)
  ON CONFLICT (institution_id, name) DO NOTHING
  RETURNING id INTO r_id;
  IF r_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (institution_id, role_id, permission_key)
    SELECT _institution, r_id, key FROM public.permissions
    WHERE key IN ('students.view','academics.view','exams.view','marks.view',
                  'marks.enter','marks.edit','marks.submit','documents.view',
                  'documents.upload','documents.download','reports.view')
    ON CONFLICT DO NOTHING;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.seed_default_roles(uuid) FROM anon, authenticated;

DO $$
DECLARE i record;
BEGIN
  FOR i IN SELECT id FROM public.institutions LOOP
    PERFORM public.seed_default_roles(i.id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.bootstrap_institution_roles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_default_roles(NEW.id);
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.bootstrap_institution_roles() FROM anon, authenticated;
CREATE TRIGGER inst_bootstrap_roles AFTER INSERT ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_institution_roles();

-- link existing memberships to their matching system role
UPDATE public.memberships m SET role_id = r.id
FROM public.roles r
WHERE r.institution_id = m.institution_id
  AND r.key = CASE m.role
                WHEN 'admin' THEN 'super_admin'
                WHEN 'exam_cell' THEN 'staff'
                WHEN 'hod' THEN 'class_teacher'
                WHEN 'faculty' THEN 'subject_teacher' END
  AND m.role_id IS NULL;