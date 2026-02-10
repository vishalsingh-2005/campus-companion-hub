
-- =============================================
-- 1. LIBRARY MANAGEMENT
-- =============================================

-- Books table
CREATE TABLE public.library_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  total_quantity INTEGER NOT NULL DEFAULT 1,
  available_quantity INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  publisher TEXT,
  published_year INTEGER,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage books" ON public.library_books FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "All authenticated can view books" ON public.library_books FOR SELECT USING (auth.uid() IS NOT NULL);

-- Book issues table
CREATE TABLE public.book_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  issued_by UUID REFERENCES auth.users(id),
  issue_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '14 days'),
  return_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'issued',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage issues" ON public.book_issues FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Students can view own issues" ON public.book_issues FOR SELECT USING (student_id IN (SELECT students.id FROM students WHERE students.user_id = auth.uid()));

-- Book requests table
CREATE TABLE public.book_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  request_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage requests" ON public.book_requests FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Students can view own requests" ON public.book_requests FOR SELECT USING (student_id IN (SELECT students.id FROM students WHERE students.user_id = auth.uid()));
CREATE POLICY "Students can create requests" ON public.book_requests FOR INSERT WITH CHECK (student_id IN (SELECT students.id FROM students WHERE students.user_id = auth.uid()));

-- =============================================
-- 2. ASSIGNMENT MANAGEMENT
-- =============================================

CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_name TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_marks INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assignments" ON public.assignments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can manage own assignments" ON public.assignments FOR ALL USING (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id IN (SELECT teachers.id FROM teachers WHERE teachers.user_id = auth.uid())) WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id IN (SELECT teachers.id FROM teachers WHERE teachers.user_id = auth.uid()));
CREATE POLICY "Students can view assignments for enrolled courses" ON public.assignments FOR SELECT USING (has_role(auth.uid(), 'student'::app_role) AND course_id IN (SELECT ce.course_id FROM course_enrollments ce JOIN students s ON ce.student_id = s.id WHERE s.user_id = auth.uid() AND ce.status = 'enrolled'));

-- Assignment submissions
CREATE TABLE public.assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  file_url TEXT,
  file_name TEXT,
  submission_text TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  marks INTEGER,
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage submissions" ON public.assignment_submissions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can view and grade submissions" ON public.assignment_submissions FOR ALL USING (has_role(auth.uid(), 'teacher'::app_role) AND assignment_id IN (SELECT a.id FROM assignments a JOIN teachers t ON a.teacher_id = t.id WHERE t.user_id = auth.uid())) WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND assignment_id IN (SELECT a.id FROM assignments a JOIN teachers t ON a.teacher_id = t.id WHERE t.user_id = auth.uid()));
CREATE POLICY "Students can manage own submissions" ON public.assignment_submissions FOR ALL USING (student_id IN (SELECT students.id FROM students WHERE students.user_id = auth.uid())) WITH CHECK (student_id IN (SELECT students.id FROM students WHERE students.user_id = auth.uid()));

-- =============================================
-- 3. STUDENT PROFILE UPDATE REQUESTS
-- =============================================

CREATE TABLE public.profile_update_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  requested_changes JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_update_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage profile requests" ON public.profile_update_requests FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Students can view own requests" ON public.profile_update_requests FOR SELECT USING (student_id IN (SELECT students.id FROM students WHERE students.user_id = auth.uid()));
CREATE POLICY "Students can create requests" ON public.profile_update_requests FOR INSERT WITH CHECK (student_id IN (SELECT students.id FROM students WHERE students.user_id = auth.uid()));

-- Add extended profile fields to students table
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS father_name TEXT,
  ADD COLUMN IF NOT EXISTS mother_name TEXT,
  ADD COLUMN IF NOT EXISTS guardian_contact TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS course TEXT,
  ADD COLUMN IF NOT EXISTS semester TEXT;

-- =============================================
-- 4. LEAVE MANAGEMENT
-- =============================================

CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL DEFAULT 'casual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES auth.users(id),
  reviewer_role TEXT,
  remarks TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage leave requests" ON public.leave_requests FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers can view and update leave requests" ON public.leave_requests FOR SELECT USING (has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Teachers can update leave requests" ON public.leave_requests FOR UPDATE USING (has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Students can view own leave requests" ON public.leave_requests FOR SELECT USING (student_id IN (SELECT students.id FROM students WHERE students.user_id = auth.uid()));
CREATE POLICY "Students can create leave requests" ON public.leave_requests FOR INSERT WITH CHECK (student_id IN (SELECT students.id FROM students WHERE students.user_id = auth.uid()));

-- =============================================
-- STORAGE BUCKETS
-- =============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('assignments', 'assignments', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('assignment-submissions', 'assignment-submissions', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users can view assignment files" ON storage.objects FOR SELECT USING (bucket_id = 'assignments' AND auth.uid() IS NOT NULL);
CREATE POLICY "Teachers and admins can upload assignment files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assignments' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)));
CREATE POLICY "Teachers and admins can delete assignment files" ON storage.objects FOR DELETE USING (bucket_id = 'assignments' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)));

CREATE POLICY "Students can upload submission files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assignment-submissions' AND has_role(auth.uid(), 'student'::app_role));
CREATE POLICY "Authenticated users can view submission files" ON storage.objects FOR SELECT USING (bucket_id = 'assignment-submissions' AND auth.uid() IS NOT NULL);

-- Triggers for updated_at
CREATE TRIGGER update_library_books_updated_at BEFORE UPDATE ON public.library_books FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_book_issues_updated_at BEFORE UPDATE ON public.book_issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_book_requests_updated_at BEFORE UPDATE ON public.book_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON public.assignment_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profile_update_requests_updated_at BEFORE UPDATE ON public.profile_update_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
