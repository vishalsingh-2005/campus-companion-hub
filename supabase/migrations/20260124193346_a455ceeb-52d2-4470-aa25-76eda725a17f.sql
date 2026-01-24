-- Create attendance status enum
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

-- Create attendance table
CREATE TABLE public.attendance (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status attendance_status NOT NULL DEFAULT 'present',
    notes TEXT,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Prevent duplicate attendance records for same student/course/date
    UNIQUE(student_id, course_id, attendance_date)
);

-- Enable Row Level Security
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for attendance

-- Admins can do everything
CREATE POLICY "Admins can manage attendance"
ON public.attendance
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Teachers can view all attendance and record for their courses
CREATE POLICY "Teachers can view attendance"
ON public.attendance
FOR SELECT
USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can record attendance for their courses"
ON public.attendance
FOR INSERT
WITH CHECK (
    public.has_role(auth.uid(), 'teacher') AND
    EXISTS (
        SELECT 1 FROM public.courses c
        JOIN public.teachers t ON c.teacher_id = t.id
        WHERE c.id = course_id AND t.user_id = auth.uid()
    )
);

CREATE POLICY "Teachers can update attendance for their courses"
ON public.attendance
FOR UPDATE
USING (
    public.has_role(auth.uid(), 'teacher') AND
    EXISTS (
        SELECT 1 FROM public.courses c
        JOIN public.teachers t ON c.teacher_id = t.id
        WHERE c.id = course_id AND t.user_id = auth.uid()
    )
);

-- Students can view their own attendance
CREATE POLICY "Students can view own attendance"
ON public.attendance
FOR SELECT
USING (
    student_id IN (
        SELECT id FROM public.students WHERE user_id = auth.uid()
    )
);

-- Create trigger for updated_at
CREATE TRIGGER update_attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX idx_attendance_course_id ON public.attendance(course_id);
CREATE INDEX idx_attendance_date ON public.attendance(attendance_date);
CREATE INDEX idx_attendance_status ON public.attendance(status);