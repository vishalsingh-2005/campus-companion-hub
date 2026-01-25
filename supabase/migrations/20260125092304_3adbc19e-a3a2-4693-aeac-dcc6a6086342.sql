-- Create events table
CREATE TABLE public.events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL DEFAULT 'general',
    venue TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    max_participants INTEGER,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'draft',
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event registrations table
CREATE TABLE public.event_registrations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    participant_name TEXT NOT NULL,
    participant_email TEXT NOT NULL,
    participant_phone TEXT,
    status TEXT NOT NULL DEFAULT 'registered',
    notes TEXT,
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    checked_in_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- RLS policies for events
CREATE POLICY "Anyone can view public events"
ON public.events FOR SELECT
USING (is_public = true OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Event organizers can create events"
ON public.events FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'event_organizer') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Event organizers can update their own events"
ON public.events FOR UPDATE
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Event organizers can delete their own events"
ON public.events FOR DELETE
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS policies for event registrations
CREATE POLICY "Event organizers can view registrations for their events"
ON public.event_registrations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.events e 
        WHERE e.id = event_id 
        AND (e.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
    OR user_id = auth.uid()
);

CREATE POLICY "Anyone can register for public events"
ON public.event_registrations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.events e 
        WHERE e.id = event_id 
        AND e.is_public = true 
        AND e.status = 'published'
    )
    OR public.has_role(auth.uid(), 'event_organizer')
    OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Event organizers can update registrations"
ON public.event_registrations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.events e 
        WHERE e.id = event_id 
        AND (e.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
);

CREATE POLICY "Event organizers can delete registrations"
ON public.event_registrations FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.events e 
        WHERE e.id = event_id 
        AND (e.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
);

-- Triggers for updated_at
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_registrations_updated_at
BEFORE UPDATE ON public.event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_events_created_by ON public.events(created_by);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_start_date ON public.events(start_date);
CREATE INDEX idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX idx_event_registrations_user_id ON public.event_registrations(user_id);