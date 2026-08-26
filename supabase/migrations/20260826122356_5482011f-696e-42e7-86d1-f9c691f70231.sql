-- ============ enums ============
DO $$ BEGIN CREATE TYPE public.inst_status AS ENUM ('active','trial','pending','suspended','expired','archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.sub_status AS ENUM ('trial','active','past_due','suspended','expired','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.perm_request_status AS ENUM ('pending','clarification','approved','rejected','expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.ticket_status AS ENUM ('open','in_progress','waiting','resolved','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.ticket_category AS ENUM ('support','request','technical','feature','permission','feedback'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ institutions: platform metadata ============
CREATE SEQUENCE IF NOT EXISTS public.institution_code_seq START 100;

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS status public.inst_status NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

UPDATE public.institutions
SET code = 'EDQ-' || lpad(nextval('public.institution_code_seq')::text, 6, '0')
WHERE code IS NULL;

ALTER TABLE public.institutions ALTER COLUMN code SET DEFAULT 'EDQ-' || lpad(nextval('public.institution_code_seq')::text, 6, '0');
CREATE UNIQUE INDEX IF NOT EXISTS institutions_code_key ON public.institutions (code);

-- ============ plans ============
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_monthly numeric NOT NULL DEFAULT 0,
  price_yearly numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  user_limit integer,
  student_limit integer,
  teacher_limit integer,
  staff_limit integer,
  storage_limit_mb integer,
  trial_days integer NOT NULL DEFAULT 14,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans readable by members" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "plans managed by platform owner" ON public.plans FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER plans_touch BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.plans (key, name, description, price_monthly, price_yearly, user_limit, student_limit, teacher_limit, staff_limit, storage_limit_mb, trial_days, sort_order, features) VALUES
  ('starter','Starter','Small schools getting started', 4999, 49990, 25, 500, 25, 10, 5120, 14, 1, '["marks","exams","documents","reports"]'::jsonb),
  ('professional','Professional','Growing colleges and institutes', 12999, 129990, 150, 3000, 150, 60, 51200, 14, 2, '["marks","exams","documents","reports","advanced_reports","bulk_import","export","audit_logs","custom_roles"]'::jsonb),
  ('enterprise','Enterprise','Universities and multi-campus groups', 34999, 349990, NULL, NULL, NULL, NULL, 512000, 30, 3, '["marks","exams","documents","reports","advanced_reports","bulk_import","export","audit_logs","custom_roles","advanced_analytics","multi_campus","api_access","custom_branding","extra_storage"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============ subscriptions ============
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL UNIQUE REFERENCES public.institutions(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id),
  status public.sub_status NOT NULL DEFAULT 'trial',
  started_at timestamptz NOT NULL DEFAULT now(),
  renews_at timestamptz,
  trial_ends_at timestamptz,
  user_limit integer,
  student_limit integer,
  teacher_limit integer,
  staff_limit integer,
  storage_limit_mb integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscription visible to its institution" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.is_member(institution_id));
CREATE POLICY "subscriptions managed by platform owner" ON public.subscriptions FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER subscriptions_touch BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.subscriptions (institution_id, plan_id, status, trial_ends_at)
SELECT i.id, (SELECT id FROM public.plans WHERE key = 'starter'), 'trial', now() + interval '14 days'
FROM public.institutions i
ON CONFLICT (institution_id) DO NOTHING;

-- ============ feature flags ============
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text,
  enabled_globally boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags readable by members" ON public.feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "flags managed by platform owner" ON public.feature_flags FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER feature_flags_touch BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.feature_flags (key, name, description, sort_order) VALUES
  ('advanced_reports','Advanced Reports','Deep analytical and comparative reporting',1),
  ('document_storage','Document Storage','Secure answer sheet and record vault',2),
  ('audit_logs','Audit Logs','Full institution audit trail explorer',3),
  ('custom_roles','Custom Roles','Institution-defined roles and permission sets',4),
  ('advanced_analytics','Advanced Analytics','Performance and trend analytics',5),
  ('bulk_import','Bulk Import','CSV/Excel bulk data import',6),
  ('export','Export','CSV, Excel and PDF exports',7),
  ('multi_campus','Multiple Campuses','Multi-campus institution structures',8),
  ('api_access','API Access','Programmatic API access',9),
  ('custom_branding','Custom Branding','Institution logo and theme',10),
  ('extra_storage','Additional Storage','Storage beyond plan allowance',11)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.institution_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  feature_key text NOT NULL REFERENCES public.feature_flags(key) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, feature_key)
);
GRANT SELECT ON public.institution_features TO authenticated;
GRANT ALL ON public.institution_features TO service_role;
ALTER TABLE public.institution_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "institution features visible to institution" ON public.institution_features FOR SELECT TO authenticated
  USING (public.is_member(institution_id));
CREATE POLICY "institution features managed by platform owner" ON public.institution_features FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER institution_features_touch BEFORE UPDATE ON public.institution_features FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ permission requests ============
CREATE TABLE IF NOT EXISTS public.permission_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  permission_key text,
  title text NOT NULL,
  reason text,
  status public.perm_request_status NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.permission_requests TO authenticated;
GRANT ALL ON public.permission_requests TO service_role;
ALTER TABLE public.permission_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requests visible to institution admins" ON public.permission_requests FOR SELECT TO authenticated
  USING (public.is_admin(institution_id));
CREATE POLICY "requests raised by institution admins" ON public.permission_requests FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(institution_id) AND requested_by = auth.uid());
CREATE POLICY "requests decided by platform owner" ON public.permission_requests FOR UPDATE TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "requests deleted by platform owner" ON public.permission_requests FOR DELETE TO authenticated
  USING (public.is_platform_admin());
CREATE TRIGGER permission_requests_touch BEFORE UPDATE ON public.permission_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ support tickets ============
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  subject text NOT NULL,
  body text,
  category public.ticket_category NOT NULL DEFAULT 'support',
  status public.ticket_status NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets visible to institution" ON public.support_tickets FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR (institution_id IS NOT NULL AND public.is_admin(institution_id)));
CREATE POLICY "tickets created by members" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (institution_id IS NULL OR public.is_member(institution_id)));
CREATE POLICY "tickets managed by platform owner" ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "tickets removed by platform owner" ON public.support_tickets FOR DELETE TO authenticated
  USING (public.is_platform_admin());
CREATE TRIGGER support_tickets_touch BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  from_platform boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages visible with ticket" ON public.support_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id
    AND (t.created_by = auth.uid() OR public.is_platform_admin() OR (t.institution_id IS NOT NULL AND public.is_admin(t.institution_id)))));
CREATE POLICY "messages written by participants" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id
    AND (t.created_by = auth.uid() OR public.is_platform_admin() OR (t.institution_id IS NOT NULL AND public.is_admin(t.institution_id)))));

-- ============ impersonation sessions ============
CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_user_id uuid NOT NULL,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  viewed_role text NOT NULL,
  reason text,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.impersonation_sessions TO authenticated;
GRANT ALL ON public.impersonation_sessions TO service_role;
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "impersonation platform owner only" ON public.impersonation_sessions FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin() AND platform_user_id = auth.uid());

-- ============ security events ============
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  user_id uuid,
  email text,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  detail text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security events platform owner read" ON public.security_events FOR SELECT TO authenticated
  USING (public.is_platform_admin());
CREATE POLICY "security events append" ON public.security_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_platform_admin());

-- ============ platform audit log ============
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  target_type text,
  target_id text,
  target_label text,
  reason text,
  old_value jsonb,
  new_value jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.platform_audit_logs TO authenticated;
GRANT ALL ON public.platform_audit_logs TO service_role;
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform audit read owner" ON public.platform_audit_logs FOR SELECT TO authenticated
  USING (public.is_platform_admin());
CREATE POLICY "platform audit append owner" ON public.platform_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() AND actor_id = auth.uid());

-- ============ platform settings ============
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings read authenticated" ON public.platform_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings managed by platform owner" ON public.platform_settings FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE TRIGGER platform_settings_touch BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.platform_settings (key, value) VALUES
  ('general','{"platform_name":"Edqorix","tagline":"Digital Academic Management, Simplified","support_email":"support@edqorix.com","support_phone":""}'::jsonb),
  ('authentication','{"min_password_length":12,"require_symbols":true,"session_hours":8,"require_2fa_owner":true,"max_failed_attempts":5}'::jsonb),
  ('notifications','{"email_enabled":true,"permission_requests":true,"system_alerts":true,"from_name":"Edqorix"}'::jsonb),
  ('storage','{"default_storage_mb":5120,"max_file_mb":50,"allowed_types":["pdf","png","jpg","jpeg","csv","xlsx","docx"]}'::jsonb),
  ('subscription','{"default_plan":"starter","trial_days":14,"grace_days":7}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============ indexes ============
CREATE INDEX IF NOT EXISTS platform_audit_created_idx ON public.platform_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_created_idx ON public.security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS permission_requests_status_idx ON public.permission_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status, created_at DESC);