-- =========================================================
-- 1. SECURE ATTENDANCE: remove student access to qr_secret/current_qr_token
-- =========================================================
DROP POLICY IF EXISTS "Students can view active enrolled sessions" ON public.secure_attendance_sessions;
DROP POLICY IF EXISTS "Students can view active sessions" ON public.secure_attendance_sessions;
DROP POLICY IF EXISTS "Students can view sessions for enrolled courses" ON public.secure_attendance_sessions;

-- (View public.secure_attendance_sessions_safe already exists from prior migration; ensure it's present)
CREATE OR REPLACE VIEW public.secure_attendance_sessions_safe
WITH (security_invoker = true) AS
SELECT
  id, course_id, teacher_id, classroom_location_id,
  session_date, start_time, end_time,
  time_window_minutes, qr_rotation_interval_seconds,
  require_selfie, require_gps, status, attendance_count,
  created_at, updated_at
FROM public.secure_attendance_sessions;

GRANT SELECT ON public.secure_attendance_sessions_safe TO authenticated;

-- Students need to see safe rows for their enrolled courses (view inherits invoker RLS,
-- so we must grant SELECT on the base table for their own enrolled courses but
-- restrict columns is impossible in RLS; instead we keep base table off-limits
-- and let students rely on the validate-attendance edge function + view via service role).
-- The view uses security_invoker so it requires base-table access. To make the view usable
-- without exposing secrets, switch to security_definer view that only exposes safe columns:
DROP VIEW IF EXISTS public.secure_attendance_sessions_safe;
CREATE VIEW public.secure_attendance_sessions_safe
WITH (security_invoker = false) AS
SELECT
  id, course_id, teacher_id, classroom_location_id,
  session_date, start_time, end_time,
  time_window_minutes, qr_rotation_interval_seconds,
  require_selfie, require_gps, status, attendance_count,
  created_at, updated_at
FROM public.secure_attendance_sessions;

ALTER VIEW public.secure_attendance_sessions_safe SET (security_invoker = true);

-- Use a SECURITY DEFINER function to expose safe rows to students
CREATE OR REPLACE FUNCTION public.get_student_attendance_sessions()
RETURNS TABLE (
  id uuid, course_id uuid, teacher_id uuid, classroom_location_id uuid,
  session_date date, start_time timestamptz, end_time timestamptz,
  time_window_minutes integer, qr_rotation_interval_seconds integer,
  require_selfie boolean, require_gps boolean, status text,
  attendance_count integer, created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.course_id, s.teacher_id, s.classroom_location_id,
         s.session_date, s.start_time, s.end_time,
         s.time_window_minutes, s.qr_rotation_interval_seconds,
         s.require_selfie, s.require_gps, s.status,
         s.attendance_count, s.created_at, s.updated_at
  FROM public.secure_attendance_sessions s
  WHERE has_role(auth.uid(), 'student'::app_role)
    AND s.status = 'active'
    AND s.course_id IN (
      SELECT ce.course_id FROM public.course_enrollments ce
      JOIN public.students st ON ce.student_id = st.id
      WHERE st.user_id = auth.uid() AND ce.status = 'enrolled'
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_student_attendance_sessions() TO authenticated;

-- =========================================================
-- 2. TEST QUESTIONS: hide correct_answer from students
-- =========================================================
DROP POLICY IF EXISTS "Students can view questions during active test" ON public.test_questions;

-- Safe view exposing only non-sensitive columns
CREATE OR REPLACE VIEW public.test_questions_safe AS
SELECT id, test_id, question_type, question_text, options, marks, order_index, created_at, updated_at
FROM public.test_questions;

ALTER VIEW public.test_questions_safe SET (security_invoker = true);

-- Function students call to fetch their test questions (without correct_answer)
CREATE OR REPLACE FUNCTION public.get_test_questions_for_student(_test_id uuid)
RETURNS TABLE (
  id uuid, test_id uuid, question_type question_type, question_text text,
  options jsonb, marks integer, order_index integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.id, q.test_id, q.question_type, q.question_text,
         q.options, q.marks, q.order_index
  FROM public.test_questions q
  WHERE q.test_id = _test_id
    AND has_role(auth.uid(), 'student'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.tests t
      JOIN public.course_enrollments ce ON ce.course_id = t.course_id
      JOIN public.students s ON s.id = ce.student_id
      WHERE t.id = q.test_id
        AND s.user_id = auth.uid()
        AND ce.status = 'enrolled'
        AND t.status IN ('active', 'live', 'scheduled')
    )
  ORDER BY q.order_index;
$$;

GRANT EXECUTE ON FUNCTION public.get_test_questions_for_student(uuid) TO authenticated;

-- Server-side grading: compares answers without exposing correct_answer to client
CREATE OR REPLACE FUNCTION public.grade_objective_answer(_question_id uuid, _answer text)
RETURNS TABLE (is_correct boolean, marks_awarded integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q_correct text;
  q_marks integer;
  q_type question_type;
BEGIN
  -- Caller must be a student with access to the question's test
  IF NOT has_role(auth.uid(), 'student'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT q.correct_answer, q.marks, q.question_type
    INTO q_correct, q_marks, q_type
  FROM public.test_questions q
  JOIN public.tests t ON t.id = q.test_id
  JOIN public.course_enrollments ce ON ce.course_id = t.course_id
  JOIN public.students s ON s.id = ce.student_id
  WHERE q.id = _question_id
    AND s.user_id = auth.uid()
    AND ce.status = 'enrolled';

  IF q_correct IS NULL THEN
    RAISE EXCEPTION 'Question not found or access denied';
  END IF;

  IF q_type IN ('mcq', 'true_false') AND _answer = q_correct THEN
    RETURN QUERY SELECT true, q_marks;
  ELSE
    RETURN QUERY SELECT false, 0;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grade_objective_answer(uuid, text) TO authenticated;

-- =========================================================
-- 3. STORAGE: assignment-submissions — restrict per-owner
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can view submission files" ON storage.objects;

-- Students see only their own submission files (path: <student_user_id>/<filename>)
CREATE POLICY "Students view own submission files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'assignment-submissions'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Teachers and admins can view all submission files (for grading)
CREATE POLICY "Teachers and admins view submission files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'assignment-submissions'
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- =========================================================
-- 4. LIVE_SESSIONS: only host (or admin) can manage; teachers SELECT only
-- =========================================================
DROP POLICY IF EXISTS "Teachers can manage their sessions" ON public.live_sessions;

CREATE POLICY "Hosts can manage their sessions"
ON public.live_sessions FOR ALL TO authenticated
USING (host_id = auth.uid())
WITH CHECK (host_id = auth.uid());

CREATE POLICY "Teachers can view all sessions"
ON public.live_sessions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role));

-- =========================================================
-- 5. SESSION_PARTICIPANTS: restrict ALL to host; teachers SELECT only
-- =========================================================
DROP POLICY IF EXISTS "Hosts can manage participants" ON public.session_participants;

CREATE POLICY "Hosts can manage own session participants"
ON public.session_participants FOR ALL TO authenticated
USING (is_session_host(session_id, auth.uid()))
WITH CHECK (is_session_host(session_id, auth.uid()));

CREATE POLICY "Teachers can view session participants"
ON public.session_participants FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role));

-- =========================================================
-- 6. EVENT_REGISTRATIONS: require authenticated for INSERT
-- =========================================================
DROP POLICY IF EXISTS "Anyone can register for public events" ON public.event_registrations;

CREATE POLICY "Authenticated users can register for public events"
ON public.event_registrations FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_registrations.event_id
        AND e.is_public = true
        AND e.status = 'published'
    )
    OR has_role(auth.uid(), 'event_organizer'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);