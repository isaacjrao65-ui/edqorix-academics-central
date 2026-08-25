CREATE TABLE public.demo_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_name text NOT NULL,
  institution_type text NOT NULL,
  contact_name text NOT NULL,
  designation text,
  email text NOT NULL,
  phone text,
  student_count integer,
  message text,
  handled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.demo_requests TO anon, authenticated;
GRANT ALL ON public.demo_requests TO service_role;

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY demo_requests_public_insert ON public.demo_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(institution_name) BETWEEN 1 AND 200
    AND length(contact_name) BETWEEN 1 AND 120
    AND length(email) BETWEEN 3 AND 255
    AND email LIKE '%_@_%'
    AND (phone IS NULL OR length(phone) <= 30)
    AND (designation IS NULL OR length(designation) <= 120)
    AND (message IS NULL OR length(message) <= 2000)
    AND (student_count IS NULL OR (student_count >= 0 AND student_count <= 1000000))
    AND handled = false
  );

CREATE INDEX demo_requests_created_at_idx ON public.demo_requests (created_at DESC);