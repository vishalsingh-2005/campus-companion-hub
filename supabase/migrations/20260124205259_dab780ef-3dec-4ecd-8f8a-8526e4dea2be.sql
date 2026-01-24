-- Fix infinite recursion in live_sessions RLS policies
-- The issue is that "Participants can view sessions they are part of" policy has a bug

-- Drop the problematic policy
DROP POLICY IF EXISTS "Participants can view sessions they are part of" ON public.live_sessions;

-- Recreate with fixed condition (reference session_id properly)
CREATE POLICY "Participants can view sessions they are part of" 
ON public.live_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM session_participants sp
    WHERE sp.session_id = live_sessions.id 
      AND sp.user_id = auth.uid()
  )
);