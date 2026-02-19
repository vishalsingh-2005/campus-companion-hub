-- Allow students to insert their own record (self-provisioning)
CREATE POLICY "Students can insert own record"
ON public.students
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'student'::app_role) 
  AND user_id = auth.uid()
);

-- Allow students to update their own record (for avatar, etc.)
CREATE POLICY "Students can update own record"
ON public.students
FOR UPDATE
USING (
  has_role(auth.uid(), 'student'::app_role) 
  AND user_id = auth.uid()
);
