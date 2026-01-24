-- Fix infinite recursion in live_sessions and session_participants RLS policies
-- The issue is circular references between these tables

-- Step 1: Create helper functions to check session ownership without triggering RLS

-- Function to check if user is session host (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_session_host(_session_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.live_sessions
    WHERE id = _session_id
      AND host_id = _user_id
  )
$$;

-- Function to check if user is a participant (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_session_participant(_session_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.session_participants
    WHERE session_id = _session_id
      AND user_id = _user_id
  )
$$;

-- Step 2: Drop problematic policies on live_sessions
DROP POLICY IF EXISTS "Admins can manage all sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Teachers can manage their sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Participants can view sessions they are part of" ON public.live_sessions;

-- Step 3: Recreate live_sessions policies without circular references
CREATE POLICY "Admins can manage all sessions" 
ON public.live_sessions 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can manage their sessions" 
ON public.live_sessions 
FOR ALL 
USING (
  host_id = auth.uid() 
  OR public.has_role(auth.uid(), 'teacher')
)
WITH CHECK (
  host_id = auth.uid() 
  OR public.has_role(auth.uid(), 'teacher')
);

CREATE POLICY "Participants can view their sessions" 
ON public.live_sessions 
FOR SELECT 
USING (public.is_session_participant(id, auth.uid()));

-- Step 4: Drop problematic policies on session_participants
DROP POLICY IF EXISTS "Admins can manage all participants" ON public.session_participants;
DROP POLICY IF EXISTS "Hosts can manage participants" ON public.session_participants;
DROP POLICY IF EXISTS "Users can view their own participation" ON public.session_participants;
DROP POLICY IF EXISTS "Users can update their own status" ON public.session_participants;

-- Step 5: Recreate session_participants policies without circular references
CREATE POLICY "Admins can manage all participants" 
ON public.session_participants 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Hosts can manage participants" 
ON public.session_participants 
FOR ALL 
USING (
  public.is_session_host(session_id, auth.uid()) 
  OR public.has_role(auth.uid(), 'teacher')
)
WITH CHECK (
  public.is_session_host(session_id, auth.uid()) 
  OR public.has_role(auth.uid(), 'teacher')
);

CREATE POLICY "Users can view own participation" 
ON public.session_participants 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update own status" 
ON public.session_participants 
FOR UPDATE 
USING (user_id = auth.uid());