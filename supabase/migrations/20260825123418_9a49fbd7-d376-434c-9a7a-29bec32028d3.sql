CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

CREATE POLICY "Platform admins can view the platform admin list"
ON public.platform_admins FOR SELECT TO authenticated
USING (public.is_platform_admin());

INSERT INTO public.platform_admins (user_id, email)
VALUES ('2865463a-364b-4f47-934c-0b95d32141ad', 'isaacjrao65@edqorix.com')
ON CONFLICT (user_id) DO NOTHING;

-- Platform admins count as an active member/manager/admin of every institution
CREATE OR REPLACE FUNCTION public.is_member(_institution uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.institution_id = _institution AND m.user_id = auth.uid() AND m.is_active);
$$;

CREATE OR REPLACE FUNCTION public.can_manage(_institution uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.institution_id = _institution AND m.user_id = auth.uid()
      AND m.role IN ('admin','exam_cell') AND m.is_active);
$$;

CREATE OR REPLACE FUNCTION public.has_inst_role(_institution uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.is_platform_admin() AND _role = 'admin') OR EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.institution_id = _institution AND m.user_id = auth.uid()
      AND m.role = _role AND m.is_active);
$$;
