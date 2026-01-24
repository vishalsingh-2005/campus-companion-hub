-- Allow students to view live sessions for courses they are enrolled in
CREATE POLICY "Students can view sessions for enrolled courses" 
ON public.live_sessions 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'student') 
  AND course_id IN (
    SELECT ce.course_id 
    FROM public.course_enrollments ce
    JOIN public.students s ON ce.student_id = s.id
    WHERE s.user_id = auth.uid() 
    AND ce.status = 'enrolled'
  )
);