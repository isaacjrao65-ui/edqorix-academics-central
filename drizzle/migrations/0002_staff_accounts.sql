ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS staff_id text,
  ADD COLUMN IF NOT EXISTS staff_type text,
  ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path text;
CREATE UNIQUE INDEX IF NOT EXISTS memberships_staff_id_uniq
  ON public.memberships (institution_id, staff_id) WHERE staff_id IS NOT NULL;

-- Staff accounts created by the principal carry explicit 'sp.*' permissions.
-- For those accounts the database enforces each permission, regardless of UI.
CREATE OR REPLACE FUNCTION public.is_permission_managed(_institution uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.institution_id = _institution AND m.user_id = auth.uid() AND m.staff_type IS NOT NULL);
$$;

CREATE OR REPLACE FUNCTION public.enforce_staff_permissions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inst uuid; needed text[];
BEGIN
  IF auth.uid() IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  inst := COALESCE(NEW.institution_id, OLD.institution_id);
  IF public.is_admin(inst) OR NOT public.is_permission_managed(inst) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_TABLE_NAME = 'marks' THEN
    needed := ARRAY['sp.marks.enter','sp.marks.edit','sp.marks.internal','sp.marks.external','sp.marks.assignment'];
  ELSIF TG_TABLE_NAME = 'students' THEN
    needed := CASE TG_OP WHEN 'INSERT' THEN ARRAY['sp.students.add']
                         WHEN 'DELETE' THEN ARRAY['sp.students.remove']
                         ELSE ARRAY['sp.students.edit'] END;
  ELSIF TG_TABLE_NAME = 'mark_sheets' THEN
    IF TG_OP = 'UPDATE' AND NEW.status = 'verified' AND OLD.status <> 'verified' THEN
      needed := ARRAY['sp.marks.verify'];
    ELSE RETURN COALESCE(NEW, OLD); END IF;
  ELSE RETURN COALESCE(NEW, OLD); END IF;
  IF NOT EXISTS (SELECT 1 FROM unnest(needed) k WHERE public.has_perm(inst, k)) THEN
    RAISE EXCEPTION 'Permission denied: the principal has not granted you this action (%).', array_to_string(needed, ', ')
      USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS marks_staff_perm ON public.marks;
CREATE TRIGGER marks_staff_perm BEFORE INSERT OR UPDATE ON public.marks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_staff_permissions();
DROP TRIGGER IF EXISTS students_staff_perm ON public.students;
CREATE TRIGGER students_staff_perm BEFORE INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.enforce_staff_permissions();
DROP TRIGGER IF EXISTS sheets_staff_perm ON public.mark_sheets;
CREATE TRIGGER sheets_staff_perm BEFORE UPDATE ON public.mark_sheets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_staff_permissions();

REVOKE EXECUTE ON FUNCTION public.enforce_staff_permissions() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_permission_managed(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_permission_managed(uuid) TO authenticated;