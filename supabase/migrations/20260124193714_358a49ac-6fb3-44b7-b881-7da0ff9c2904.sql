-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Add avatar_url columns to students and teachers if not exists
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Storage policies for profile photos
CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

CREATE POLICY "Admins can upload profile photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update profile photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete profile photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-photos' AND public.has_role(auth.uid(), 'admin'));