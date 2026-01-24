-- Update the has_role function to be more robust
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create a function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Drop existing policies on students
DROP POLICY IF EXISTS "Authenticated users can view students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can insert students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can update students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can delete students" ON public.students;
DROP POLICY IF EXISTS "Teachers can view students" ON public.students;
DROP POLICY IF EXISTS "Only admins can insert students" ON public.students;
DROP POLICY IF EXISTS "Only admins can update students" ON public.students;
DROP POLICY IF EXISTS "Only admins can delete students" ON public.students;

-- Create new role-based policies for students
CREATE POLICY "Admins and teachers can view students"
ON public.students
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'teacher')
);

CREATE POLICY "Only admins can insert students"
ON public.students
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update students"
ON public.students
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete students"
ON public.students
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Drop existing policies on teachers
DROP POLICY IF EXISTS "Authenticated users can view teachers" ON public.teachers;
DROP POLICY IF EXISTS "Authenticated users can insert teachers" ON public.teachers;
DROP POLICY IF EXISTS "Authenticated users can update teachers" ON public.teachers;
DROP POLICY IF EXISTS "Authenticated users can delete teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admins and teachers can view teachers" ON public.teachers;
DROP POLICY IF EXISTS "Only admins can insert teachers" ON public.teachers;
DROP POLICY IF EXISTS "Only admins can update teachers" ON public.teachers;
DROP POLICY IF EXISTS "Only admins can delete teachers" ON public.teachers;

-- Create new role-based policies for teachers
CREATE POLICY "Admins and teachers can view teachers"
ON public.teachers
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'teacher')
);

CREATE POLICY "Only admins can insert teachers"
ON public.teachers
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update teachers"
ON public.teachers
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete teachers"
ON public.teachers
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Drop existing policies on courses
DROP POLICY IF EXISTS "Authenticated users can view courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can update courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can delete courses" ON public.courses;
DROP POLICY IF EXISTS "All authenticated users can view courses" ON public.courses;
DROP POLICY IF EXISTS "Only admins can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Only admins can update courses" ON public.courses;
DROP POLICY IF EXISTS "Only admins can delete courses" ON public.courses;

-- Create new role-based policies for courses
CREATE POLICY "All authenticated users can view courses"
ON public.courses
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert courses"
ON public.courses
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update courses"
ON public.courses
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete courses"
ON public.courses
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Drop existing policies on course_enrollments
DROP POLICY IF EXISTS "Authenticated users can view enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Authenticated users can insert enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Authenticated users can update enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Authenticated users can delete enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "All authenticated can view enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Only admins can insert enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Only admins can update enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Only admins can delete enrollments" ON public.course_enrollments;

-- Create new role-based policies for enrollments
CREATE POLICY "All authenticated can view enrollments"
ON public.course_enrollments
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert enrollments"
ON public.course_enrollments
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update enrollments"
ON public.course_enrollments
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete enrollments"
ON public.course_enrollments
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add user_id columns to link accounts
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers(user_id);

-- Add student-specific policy to view own data
CREATE POLICY "Students can view own record"
ON public.students
FOR SELECT
USING (user_id = auth.uid());

-- Add teacher-specific policy to view own data
CREATE POLICY "Teachers can view own record"
ON public.teachers
FOR SELECT
USING (user_id = auth.uid());

-- Students can view their own enrollments
CREATE POLICY "Students can view own enrollments"
ON public.course_enrollments
FOR SELECT
USING (
  student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  )
);