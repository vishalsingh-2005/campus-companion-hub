-- =========================================================
-- 1. NOTIFICATIONS: tighten INSERT policy
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 2. SECURE ATTENDANCE SESSIONS: hide QR secret from students
-- =========================================================

-- Drop student SELECT policy that exposes qr_secret / current_qr_token
DROP POLICY IF EXISTS "Students can view active sessions for enrolled courses" ON public.secure_attendance_sessions;
DROP POLICY IF EXISTS "Students can view sessions for enrolled courses" ON public.secure_attendance_sessions;
DROP POLICY IF EXISTS "Students can view active sessions" ON public.secure_attendance_sessions;

-- Sanitized view that omits sensitive cryptographic columns
CREATE OR REPLACE VIEW public.secure_attendance_sessions_safe
WITH (security_invoker = true)
AS
SELECT
  id,
  course_id,
  teacher_id,
  classroom_location_id,
  session_date,
  start_time,
  end_time,
  time_window_minutes,
  qr_rotation_interval_seconds,
  require_selfie,
  require_gps,
  status,
  attendance_count,
  created_at,
  updated_at
FROM public.secure_attendance_sessions;

GRANT SELECT ON public.secure_attendance_sessions_safe TO authenticated;

-- =========================================================
-- 3. STORAGE: make profile-photos & syllabus buckets private
-- =========================================================

UPDATE storage.buckets SET public = false WHERE id IN ('profile-photos', 'syllabus');

-- Drop existing permissive public-read policies if present
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Profile photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view syllabus files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view syllabus files" ON storage.objects;
DROP POLICY IF EXISTS "Syllabus files are publicly accessible" ON storage.objects;

-- Authenticated-only read access for both buckets
CREATE POLICY "Authenticated can view profile photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'profile-photos');

CREATE POLICY "Authenticated can view syllabus files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'syllabus');