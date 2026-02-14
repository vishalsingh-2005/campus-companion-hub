
-- Internal marks table for tracking student performance
CREATE TABLE public.internal_marks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  exam_type VARCHAR NOT NULL DEFAULT 'internal_1',
  marks_obtained NUMERIC NOT NULL DEFAULT 0,
  max_marks NUMERIC NOT NULL DEFAULT 100,
  semester VARCHAR NOT NULL,
  academic_year VARCHAR NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, student_id, exam_type, semester, academic_year)
);

ALTER TABLE public.internal_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all marks"
ON public.internal_marks FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can manage marks for their courses"
ON public.internal_marks FOR ALL
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role)
  AND teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
);

CREATE POLICY "Students can view own marks"
ON public.internal_marks FOR SELECT
USING (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);

-- Semester results table for GPA tracking
CREATE TABLE public.semester_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  semester VARCHAR NOT NULL,
  academic_year VARCHAR NOT NULL,
  sgpa NUMERIC(4,2),
  cgpa NUMERIC(4,2),
  total_credits INTEGER NOT NULL DEFAULT 0,
  earned_credits INTEGER NOT NULL DEFAULT 0,
  total_marks NUMERIC,
  obtained_marks NUMERIC,
  percentage NUMERIC(5,2),
  status VARCHAR NOT NULL DEFAULT 'pending',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, semester, academic_year)
);

ALTER TABLE public.semester_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all results"
ON public.semester_results FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view results"
ON public.semester_results FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Students can view own results"
ON public.semester_results FOR SELECT
USING (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);

-- Triggers for updated_at
CREATE TRIGGER update_internal_marks_updated_at
BEFORE UPDATE ON public.internal_marks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_semester_results_updated_at
BEFORE UPDATE ON public.semester_results
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
