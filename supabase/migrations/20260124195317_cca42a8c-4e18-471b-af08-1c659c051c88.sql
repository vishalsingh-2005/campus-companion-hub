-- Secure attendance sessions table
CREATE TABLE public.secure_attendance_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  classroom_location_id UUID REFERENCES public.classroom_locations(id),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  time_window_minutes INTEGER NOT NULL DEFAULT 15,
  qr_secret VARCHAR(64) NOT NULL,
  qr_rotation_interval_seconds INTEGER NOT NULL DEFAULT 30,
  current_qr_token VARCHAR(64),
  current_qr_expires_at TIMESTAMP WITH TIME ZONE,
  require_selfie BOOLEAN NOT NULL DEFAULT false,
  require_gps BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
  attendance_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.secure_attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage secure sessions"
ON public.secure_attendance_sessions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view own sessions"
ON public.secure_attendance_sessions FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND
  teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
);

CREATE POLICY "Teachers can insert own sessions"
ON public.secure_attendance_sessions FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) AND
  teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
);

CREATE POLICY "Teachers can update own sessions"
ON public.secure_attendance_sessions FOR UPDATE
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND
  teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
);

CREATE POLICY "Students can view active enrolled sessions"
ON public.secure_attendance_sessions FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role) AND
  status = 'active' AND
  course_id IN (
    SELECT ce.course_id FROM public.course_enrollments ce
    JOIN public.students s ON ce.student_id = s.id
    WHERE s.user_id = auth.uid() AND ce.status = 'enrolled'
  )
);

CREATE INDEX idx_secure_sessions_course ON public.secure_attendance_sessions(course_id);
CREATE INDEX idx_secure_sessions_teacher ON public.secure_attendance_sessions(teacher_id);
CREATE INDEX idx_secure_sessions_status ON public.secure_attendance_sessions(status);
CREATE INDEX idx_secure_sessions_date ON public.secure_attendance_sessions(session_date);

CREATE TRIGGER update_secure_sessions_updated_at
  BEFORE UPDATE ON public.secure_attendance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();