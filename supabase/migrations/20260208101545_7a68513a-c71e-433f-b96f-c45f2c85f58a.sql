
-- Create user_preferences table for interface customization
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  theme text NOT NULL DEFAULT 'system',
  accent_color text NOT NULL DEFAULT 'blue',
  sidebar_collapsed boolean NOT NULL DEFAULT false,
  layout_density text NOT NULL DEFAULT 'comfortable',
  dashboard_widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  font_size text NOT NULL DEFAULT 'medium',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
CREATE POLICY "Users can view own preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
