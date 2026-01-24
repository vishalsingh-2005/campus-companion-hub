-- Table for classroom/location definitions (for GPS validation)
CREATE TABLE public.classroom_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  building VARCHAR(100),
  room_number VARCHAR(50),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.classroom_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage classroom locations"
ON public.classroom_locations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view locations"
ON public.classroom_locations FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_classroom_locations_updated_at
  BEFORE UPDATE ON public.classroom_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();