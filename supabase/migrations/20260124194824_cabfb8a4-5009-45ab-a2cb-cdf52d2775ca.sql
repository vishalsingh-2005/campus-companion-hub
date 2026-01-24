-- Add unique constraint for attendance upsert
ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_student_course_date_unique 
UNIQUE (student_id, course_id, attendance_date);