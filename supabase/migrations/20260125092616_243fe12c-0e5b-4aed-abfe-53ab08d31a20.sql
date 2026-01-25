-- Create event announcements table
CREATE TABLE public.event_announcements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal',
    is_global BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event attendance table (separate from registrations - tracks actual attendance)
CREATE TABLE public.event_attendance (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    registration_id UUID REFERENCES public.event_registrations(id) ON DELETE SET NULL,
    participant_name TEXT NOT NULL,
    participant_email TEXT NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    check_out_time TIMESTAMP WITH TIME ZONE,
    attendance_method TEXT NOT NULL DEFAULT 'manual',
    notes TEXT,
    recorded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

-- RLS policies for announcements
CREATE POLICY "Anyone can view announcements for public events or their own"
ON public.event_announcements FOR SELECT
USING (
    is_global = true 
    OR created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.events e 
        WHERE e.id = event_id AND e.is_public = true
    )
    OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Event organizers can create announcements"
ON public.event_announcements FOR INSERT
WITH CHECK (
    public.has_role(auth.uid(), 'event_organizer') 
    OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Organizers can update their own announcements"
ON public.event_announcements FOR UPDATE
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Organizers can delete their own announcements"
ON public.event_announcements FOR DELETE
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS policies for event attendance
CREATE POLICY "Organizers can view attendance for their events"
ON public.event_attendance FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.events e 
        WHERE e.id = event_id 
        AND (e.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
);

CREATE POLICY "Organizers can record attendance"
ON public.event_attendance FOR INSERT
WITH CHECK (
    public.has_role(auth.uid(), 'event_organizer') 
    OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Organizers can update attendance records"
ON public.event_attendance FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.events e 
        WHERE e.id = event_id 
        AND (e.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
);

CREATE POLICY "Organizers can delete attendance records"
ON public.event_attendance FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.events e 
        WHERE e.id = event_id 
        AND (e.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
);

-- Triggers
CREATE TRIGGER update_event_announcements_updated_at
BEFORE UPDATE ON public.event_announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_event_announcements_event_id ON public.event_announcements(event_id);
CREATE INDEX idx_event_announcements_created_by ON public.event_announcements(created_by);
CREATE INDEX idx_event_attendance_event_id ON public.event_attendance(event_id);
CREATE INDEX idx_event_attendance_registration_id ON public.event_attendance(registration_id);