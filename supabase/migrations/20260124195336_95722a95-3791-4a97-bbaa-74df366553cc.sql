-- Student devices table for device binding
CREATE TABLE public.student_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  device_fingerprint VARCHAR(255) NOT NULL,
  device_name VARCHAR(100),
  user_agent TEXT,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(student_id, device_fingerprint)
);

ALTER TABLE public.student_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage devices"
ON public.student_devices FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view own devices"
ON public.student_devices FOR SELECT
USING (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

CREATE POLICY "Students can register devices"
ON public.student_devices FOR INSERT
WITH CHECK (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

CREATE INDEX idx_student_devices_student ON public.student_devices(student_id);

-- Secure attendance records table
CREATE TABLE public.secure_attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.secure_attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.student_devices(id),
  marked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  gps_accuracy_meters DECIMAL(10, 2),
  distance_from_classroom_meters DECIMAL(10, 2),
  selfie_url TEXT,
  qr_token_used VARCHAR(64) NOT NULL,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('verified', 'pending_review', 'rejected')),
  verification_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, student_id)
);

ALTER TABLE public.secure_attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage secure records"
ON public.secure_attendance_records FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view session records"
ON public.secure_attendance_records FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND
  session_id IN (
    SELECT id FROM public.secure_attendance_sessions
    WHERE teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Students can view own records"
ON public.secure_attendance_records FOR SELECT
USING (
  student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

CREATE INDEX idx_secure_records_session ON public.secure_attendance_records(session_id);
CREATE INDEX idx_secure_records_student ON public.secure_attendance_records(student_id);

-- Proxy attempt logs table
CREATE TABLE public.proxy_attempt_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.secure_attendance_sessions(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  attempt_type VARCHAR(50) NOT NULL,
  failure_reason TEXT NOT NULL,
  device_fingerprint VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  qr_token_attempted VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.proxy_attempt_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view proxy logs"
ON public.proxy_attempt_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_proxy_logs_session ON public.proxy_attempt_logs(session_id);
CREATE INDEX idx_proxy_logs_student ON public.proxy_attempt_logs(student_id);