-- =========================================================
-- 1. QR SECRETS — move to a side table that only service role / admin can read
-- =========================================================
CREATE TABLE IF NOT EXISTS public.secure_attendance_session_secrets (
  session_id uuid PRIMARY KEY REFERENCES public.secure_attendance_sessions(id) ON DELETE CASCADE,
  qr_secret text NOT NULL,
  current_qr_token text,
  current_qr_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.secure_attendance_session_secrets ENABLE ROW LEVEL SECURITY;

-- Only admins can directly read secrets; service role bypasses RLS for edge functions
CREATE POLICY "Admins can manage attendance secrets"
ON public.secure_attendance_session_secrets FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Backfill any existing rows
INSERT INTO public.secure_attendance_session_secrets (session_id, qr_secret, current_qr_token, current_qr_expires_at)
SELECT id, qr_secret, current_qr_token, current_qr_expires_at
FROM public.secure_attendance_sessions
ON CONFLICT (session_id) DO NOTHING;

-- Trigger to mirror inserts/updates from base sessions table into the secrets table
CREATE OR REPLACE FUNCTION public.sync_attendance_session_secret()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.secure_attendance_session_secrets
      (session_id, qr_secret, current_qr_token, current_qr_expires_at)
    VALUES (NEW.id, NEW.qr_secret, NEW.current_qr_token, NEW.current_qr_expires_at)
    ON CONFLICT (session_id) DO UPDATE
    SET qr_secret = EXCLUDED.qr_secret,
        current_qr_token = EXCLUDED.current_qr_token,
        current_qr_expires_at = EXCLUDED.current_qr_expires_at,
        updated_at = now();
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.secure_attendance_session_secrets
    SET qr_secret = NEW.qr_secret,
        current_qr_token = NEW.current_qr_token,
        current_qr_expires_at = NEW.current_qr_expires_at,
        updated_at = now()
    WHERE session_id = NEW.id;
  END IF;
  -- NULL the secret columns on the public table so teachers can't read them
  NEW.qr_secret := '__redacted__';
  NEW.current_qr_token := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_attendance_secret ON public.secure_attendance_sessions;
CREATE TRIGGER trg_sync_attendance_secret
BEFORE INSERT OR UPDATE ON public.secure_attendance_sessions
FOR EACH ROW EXECUTE FUNCTION public.sync_attendance_session_secret();

-- Redact existing rows
UPDATE public.secure_attendance_sessions
SET qr_secret = '__redacted__', current_qr_token = NULL
WHERE qr_secret <> '__redacted__';

-- =========================================================
-- 2. ASSIGNMENT SUBMISSIONS — restrict INSERT to own folder
-- =========================================================
DROP POLICY IF EXISTS "Students can upload submission files" ON storage.objects;

CREATE POLICY "Students upload submissions to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'assignment-submissions'
  AND has_role(auth.uid(), 'student'::app_role)
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- =========================================================
-- 3. EVENT REGISTRATIONS — protect ownerless rows
-- =========================================================
DROP POLICY IF EXISTS "Event organizers can view registrations for their events" ON public.event_registrations;

CREATE POLICY "View own or organizer-owned registrations"
ON public.event_registrations FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_registrations.event_id
      AND (e.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- =========================================================
-- 4. CODING LAB ACTIVITY LOGS — students can read own
-- =========================================================
CREATE POLICY "Students can view own coding lab logs"
ON public.coding_lab_activity_logs FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- =========================================================
-- 5. INTERVIEW SESSIONS — candidate can read own
-- =========================================================
CREATE POLICY "Candidates can view own interview sessions"
ON public.interview_sessions FOR SELECT TO authenticated
USING (
  candidate_id IN (
    SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
  )
);