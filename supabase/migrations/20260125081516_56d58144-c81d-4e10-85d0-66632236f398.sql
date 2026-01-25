-- Create syllabus table for course materials
CREATE TABLE public.course_syllabus (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    description TEXT,
    file_url TEXT,
    file_name VARCHAR,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tests/exams table
CREATE TABLE public.tests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    description TEXT,
    test_type VARCHAR NOT NULL DEFAULT 'quiz', -- quiz, midterm, final, assignment
    total_marks INTEGER NOT NULL DEFAULT 100,
    passing_marks INTEGER NOT NULL DEFAULT 40,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status VARCHAR NOT NULL DEFAULT 'scheduled', -- scheduled, ongoing, completed, cancelled
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test results table for student scores
CREATE TABLE public.test_results (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    marks_obtained NUMERIC,
    status VARCHAR NOT NULL DEFAULT 'pending', -- pending, submitted, graded
    submitted_at TIMESTAMP WITH TIME ZONE,
    graded_at TIMESTAMP WITH TIME ZONE,
    graded_by UUID REFERENCES auth.users(id),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(test_id, student_id)
);

-- Enable RLS
ALTER TABLE public.course_syllabus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Syllabus policies
CREATE POLICY "Admins can manage syllabus"
ON public.course_syllabus FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage syllabus for their courses"
ON public.course_syllabus FOR ALL
USING (has_role(auth.uid(), 'teacher') AND course_id IN (
    SELECT c.id FROM courses c
    JOIN teachers t ON c.teacher_id = t.id
    WHERE t.user_id = auth.uid()
))
WITH CHECK (has_role(auth.uid(), 'teacher') AND course_id IN (
    SELECT c.id FROM courses c
    JOIN teachers t ON c.teacher_id = t.id
    WHERE t.user_id = auth.uid()
));

CREATE POLICY "Students can view syllabus for enrolled courses"
ON public.course_syllabus FOR SELECT
USING (has_role(auth.uid(), 'student') AND course_id IN (
    SELECT ce.course_id FROM course_enrollments ce
    JOIN students s ON ce.student_id = s.id
    WHERE s.user_id = auth.uid() AND ce.status = 'enrolled'
));

-- Tests policies
CREATE POLICY "Admins can manage tests"
ON public.tests FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage tests for their courses"
ON public.tests FOR ALL
USING (has_role(auth.uid(), 'teacher') AND course_id IN (
    SELECT c.id FROM courses c
    JOIN teachers t ON c.teacher_id = t.id
    WHERE t.user_id = auth.uid()
))
WITH CHECK (has_role(auth.uid(), 'teacher') AND course_id IN (
    SELECT c.id FROM courses c
    JOIN teachers t ON c.teacher_id = t.id
    WHERE t.user_id = auth.uid()
));

CREATE POLICY "Students can view tests for enrolled courses"
ON public.tests FOR SELECT
USING (has_role(auth.uid(), 'student') AND course_id IN (
    SELECT ce.course_id FROM course_enrollments ce
    JOIN students s ON ce.student_id = s.id
    WHERE s.user_id = auth.uid() AND ce.status = 'enrolled'
));

-- Test results policies
CREATE POLICY "Admins can manage test results"
ON public.test_results FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage test results for their courses"
ON public.test_results FOR ALL
USING (has_role(auth.uid(), 'teacher') AND test_id IN (
    SELECT t.id FROM tests t
    JOIN courses c ON t.course_id = c.id
    JOIN teachers te ON c.teacher_id = te.id
    WHERE te.user_id = auth.uid()
))
WITH CHECK (has_role(auth.uid(), 'teacher') AND test_id IN (
    SELECT t.id FROM tests t
    JOIN courses c ON t.course_id = c.id
    JOIN teachers te ON c.teacher_id = te.id
    WHERE te.user_id = auth.uid()
));

CREATE POLICY "Students can view own test results"
ON public.test_results FOR SELECT
USING (student_id IN (
    SELECT id FROM students WHERE user_id = auth.uid()
));

-- Create storage bucket for syllabus files
INSERT INTO storage.buckets (id, name, public) VALUES ('syllabus', 'syllabus', true);

-- Storage policies for syllabus bucket
CREATE POLICY "Anyone can view syllabus files"
ON storage.objects FOR SELECT
USING (bucket_id = 'syllabus');

CREATE POLICY "Admins can upload syllabus files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'syllabus' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can upload syllabus files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'syllabus' AND has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins can delete syllabus files"
ON storage.objects FOR DELETE
USING (bucket_id = 'syllabus' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can delete syllabus files"
ON storage.objects FOR DELETE
USING (bucket_id = 'syllabus' AND has_role(auth.uid(), 'teacher'));

-- Triggers for updated_at
CREATE TRIGGER update_course_syllabus_updated_at
BEFORE UPDATE ON public.course_syllabus
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tests_updated_at
BEFORE UPDATE ON public.tests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_test_results_updated_at
BEFORE UPDATE ON public.test_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();