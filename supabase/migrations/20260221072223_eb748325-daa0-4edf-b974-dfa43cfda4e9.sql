-- Add is_active column to profiles table for soft-delete
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(user_id, is_active);
