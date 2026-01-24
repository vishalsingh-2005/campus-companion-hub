-- Create class_schedules table
CREATE TABLE public.class_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Prevent overlapping schedules for same course
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Enable Row Level Security
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage schedules"
ON public.class_schedules
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Teachers can view all schedules
CREATE POLICY "Teachers can view schedules"
ON public.class_schedules
FOR SELECT
USING (public.has_role(auth.uid(), 'teacher'));

-- Students can view schedules for their enrolled courses
CREATE POLICY "Students can view enrolled course schedules"
ON public.class_schedules
FOR SELECT
USING (
    course_id IN (
        SELECT ce.course_id FROM public.course_enrollments ce
        JOIN public.students s ON ce.student_id = s.id
        WHERE s.user_id = auth.uid() AND ce.status = 'enrolled'
    )
);

-- Create trigger for updated_at
CREATE TRIGGER update_class_schedules_updated_at
BEFORE UPDATE ON public.class_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_class_schedules_course_id ON public.class_schedules(course_id);
CREATE INDEX idx_class_schedules_day_of_week ON public.class_schedules(day_of_week);