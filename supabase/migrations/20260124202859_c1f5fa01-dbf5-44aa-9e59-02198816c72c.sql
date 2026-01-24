-- Create enum for session types
CREATE TYPE session_type AS ENUM ('live_class', 'interview');

-- Create enum for session status
CREATE TYPE session_status AS ENUM ('scheduled', 'waiting', 'live', 'ended', 'cancelled');

-- Create enum for participant role in session
CREATE TYPE participant_role AS ENUM ('host', 'co_host', 'participant', 'viewer');

-- Create live_sessions table for both classes and interviews
CREATE TABLE public.live_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  session_type session_type NOT NULL DEFAULT 'live_class',
  status session_status NOT NULL DEFAULT 'scheduled',
  host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  max_participants INTEGER DEFAULT 100,
  enable_chat BOOLEAN DEFAULT true,
  enable_screen_share BOOLEAN DEFAULT true,
  enable_recording BOOLEAN DEFAULT false,
  enable_waiting_room BOOLEAN DEFAULT true,
  room_name VARCHAR(255) UNIQUE,
  join_token VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interview_sessions table for specific interview details
CREATE TABLE public.interview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  candidate_email VARCHAR(255),
  candidate_name VARCHAR(255),
  interview_type VARCHAR(50) DEFAULT 'one-on-one',
  feedback TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  interview_notes TEXT,
  secure_link VARCHAR(255) UNIQUE,
  link_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session_participants table
CREATE TABLE public.session_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  participant_name VARCHAR(255),
  participant_email VARCHAR(255),
  role participant_role NOT NULL DEFAULT 'participant',
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  is_approved BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  is_video_off BOOLEAN DEFAULT false,
  hand_raised BOOLEAN DEFAULT false,
  attendance_marked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Create session_chat table for live chat messages
CREATE TABLE public.session_chat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name VARCHAR(255),
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_chat ENABLE ROW LEVEL SECURITY;

-- RLS policies for live_sessions
CREATE POLICY "Admins can manage all sessions"
ON public.live_sessions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage their sessions"
ON public.live_sessions FOR ALL
USING (host_id = auth.uid() OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Participants can view sessions they are part of"
ON public.live_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.session_participants sp
    WHERE sp.session_id = id AND sp.user_id = auth.uid()
  )
);

-- RLS policies for interview_sessions
CREATE POLICY "Admins can manage all interviews"
ON public.interview_sessions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Hosts can manage their interviews"
ON public.interview_sessions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.live_sessions ls
    WHERE ls.id = live_session_id AND ls.host_id = auth.uid()
  )
);

-- RLS policies for session_participants
CREATE POLICY "Admins can manage all participants"
ON public.session_participants FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Hosts can manage participants"
ON public.session_participants FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.live_sessions ls
    WHERE ls.id = session_id AND (ls.host_id = auth.uid() OR public.has_role(auth.uid(), 'teacher'))
  )
);

CREATE POLICY "Users can view their own participation"
ON public.session_participants FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own status"
ON public.session_participants FOR UPDATE
USING (user_id = auth.uid());

-- RLS policies for session_chat
CREATE POLICY "Participants can view chat in their sessions"
ON public.session_chat FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.session_participants sp
    WHERE sp.session_id = session_chat.session_id AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Participants can send messages"
ON public.session_chat FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.session_participants sp
    WHERE sp.session_id = session_chat.session_id AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all chat"
ON public.session_chat FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for chat and participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;

-- Create triggers for updated_at
CREATE TRIGGER update_live_sessions_updated_at
BEFORE UPDATE ON public.live_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interview_sessions_updated_at
BEFORE UPDATE ON public.interview_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();