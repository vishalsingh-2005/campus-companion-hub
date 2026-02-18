
-- Add new profile columns to students table
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS blood_group varchar(5),
  ADD COLUMN IF NOT EXISTS section varchar(10),
  ADD COLUMN IF NOT EXISTS year varchar(20),
  ADD COLUMN IF NOT EXISTS admission_type varchar(50),
  ADD COLUMN IF NOT EXISTS father_occupation varchar(100),
  ADD COLUMN IF NOT EXISTS father_contact varchar(20),
  ADD COLUMN IF NOT EXISTS mother_occupation varchar(100),
  ADD COLUMN IF NOT EXISTS mother_contact varchar(20),
  ADD COLUMN IF NOT EXISTS guardian_name varchar(100),
  ADD COLUMN IF NOT EXISTS guardian_phone varchar(20),
  ADD COLUMN IF NOT EXISTS permanent_address text,
  ADD COLUMN IF NOT EXISTS current_address text,
  ADD COLUMN IF NOT EXISTS pin_code varchar(10);

-- Create student_documents table
CREATE TABLE IF NOT EXISTS public.student_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  document_type varchar(50) NOT NULL,
  file_name varchar(255) NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own documents"
ON public.student_documents FOR SELECT
USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Students can upload own documents"
ON public.student_documents FOR INSERT
WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Students can delete own documents"
ON public.student_documents FOR DELETE
USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all documents"
ON public.student_documents FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view student documents"
ON public.student_documents FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role));

-- Create storage bucket for student documents
INSERT INTO storage.buckets (id, name, public) VALUES ('student-documents', 'student-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Students can upload own docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'student-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Students can view own docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)));

CREATE POLICY "Students can delete own docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'student-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can manage all docs"
ON storage.objects FOR ALL
USING (bucket_id = 'student-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_student_documents_updated_at
BEFORE UPDATE ON public.student_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
