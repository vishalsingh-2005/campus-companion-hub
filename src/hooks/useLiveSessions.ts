import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LiveSession {
  id: string;
  title: string;
  description: string | null;
  session_type: 'live_class' | 'interview';
  status: 'scheduled' | 'waiting' | 'live' | 'ended' | 'cancelled';
  host_id: string | null;
  course_id: string | null;
  scheduled_start: string;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  max_participants: number;
  enable_chat: boolean;
  enable_screen_share: boolean;
  enable_recording: boolean;
  enable_waiting_room: boolean;
  room_name: string | null;
  created_at: string;
  updated_at: string;
  courses?: {
    id: string;
    course_name: string;
    course_code: string;
  } | null;
  host?: {
    email: string;
  } | null;
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  user_id: string | null;
  student_id: string | null;
  participant_name: string | null;
  participant_email: string | null;
  role: 'host' | 'co_host' | 'participant' | 'viewer';
  joined_at: string | null;
  left_at: string | null;
  is_approved: boolean;
  is_muted: boolean;
  is_video_off: boolean;
  hand_raised: boolean;
  attendance_marked: boolean;
  students?: {
    id: string;
    first_name: string;
    last_name: string;
    student_id: string;
  } | null;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string | null;
  sender_name: string | null;
  message: string;
  message_type: string;
  created_at: string;
}

export function useLiveSessions(filters?: {
  status?: 'scheduled' | 'waiting' | 'live' | 'ended' | 'cancelled';
  sessionType?: 'live_class' | 'interview';
}) {
  const { data: sessions, isLoading, error, refetch } = useQuery({
    queryKey: ['live-sessions', filters],
    queryFn: async () => {
      let query = supabase
        .from('live_sessions')
        .select(`
          *,
          courses (
            id,
            course_name,
            course_code
          )
        `)
        .order('scheduled_start', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.sessionType) {
        query = query.eq('session_type', filters.sessionType);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as LiveSession[];
    },
  });

  return { sessions: sessions || [], isLoading, error, refetch };
}

export function useLiveSession(sessionId: string | undefined) {
  const { data: session, isLoading, error, refetch } = useQuery({
    queryKey: ['live-session', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;

      const { data, error } = await supabase
        .from('live_sessions')
        .select(`
          *,
          courses (
            id,
            course_name,
            course_code
          )
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data as LiveSession;
    },
    enabled: !!sessionId,
  });

  return { session, isLoading, error, refetch };
}

export function useSessionParticipants(sessionId: string | undefined) {
  const { data: participants, isLoading, refetch } = useQuery({
    queryKey: ['session-participants', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('session_participants')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            student_id
          )
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as SessionParticipant[];
    },
    enabled: !!sessionId,
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });

  return { participants: participants || [], isLoading, refetch };
}

export function useSessionChat(sessionId: string | undefined) {
  const { data: messages, isLoading, refetch } = useQuery({
    queryKey: ['session-chat', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('session_chat')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!sessionId,
  });

  return { messages: messages || [], isLoading, refetch };
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      session_type: 'live_class' | 'interview';
      course_id?: string;
      scheduled_start: string;
      scheduled_end?: string;
      max_participants?: number;
      enable_chat?: boolean;
      enable_screen_share?: boolean;
      enable_waiting_room?: boolean;
    }) => {
      const { data: session, error } = await supabase
        .from('live_sessions')
        .insert({
          ...data,
          host_id: user?.id,
          status: 'scheduled',
        })
        .select()
        .single();

      if (error) throw error;
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
      toast.success('Session created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create session: ${error.message}`);
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<LiveSession> & { id: string }) => {
      const { error } = await supabase
        .from('live_sessions')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
      toast.success('Session updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update session: ${error.message}`);
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('live_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
      toast.success('Session deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete session: ${error.message}`);
    },
  });
}

export function useLiveKitToken() {
  const { session } = useAuth();

  const createRoom = async (sessionId: string, participantName: string) => {
    const { data, error } = await supabase.functions.invoke('livekit-token', {
      body: {
        action: 'create-room',
        sessionId,
        participantName,
      },
    });

    if (error) throw error;
    return data;
  };

  const joinRoom = async (sessionId: string, participantName: string) => {
    const { data, error } = await supabase.functions.invoke('livekit-token', {
      body: {
        action: 'join-room',
        sessionId,
        participantName,
      },
    });

    if (error) throw error;
    return data;
  };

  const endRoom = async (sessionId: string) => {
    const { data, error } = await supabase.functions.invoke('livekit-token', {
      body: {
        action: 'end-room',
        sessionId,
      },
    });

    if (error) throw error;
    return data;
  };

  const approveParticipant = async (participantId: string) => {
    const { data, error } = await supabase.functions.invoke('livekit-token', {
      body: {
        action: 'approve-participant',
        participantId,
      },
    });

    if (error) throw error;
    return data;
  };

  return { createRoom, joinRoom, endRoom, approveParticipant };
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ sessionId, message, senderName }: {
      sessionId: string;
      message: string;
      senderName: string;
    }) => {
      const { error } = await supabase
        .from('session_chat')
        .insert({
          session_id: sessionId,
          sender_id: user?.id,
          sender_name: senderName,
          message,
          message_type: 'text',
        });

      if (error) throw error;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['session-chat', sessionId] });
    },
  });
}

export interface InterviewSession {
  id: string;
  live_session_id: string;
  candidate_id: string | null;
  candidate_name: string | null;
  candidate_email: string | null;
  interview_type: string | null;
  rating: number | null;
  feedback: string | null;
  interview_notes: string | null;
  secure_link: string | null;
  link_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useInterviewSession(liveSessionId: string | undefined) {
  const { data: interviewSession, isLoading, refetch } = useQuery({
    queryKey: ['interview-session', liveSessionId],
    queryFn: async () => {
      if (!liveSessionId) return null;

      const { data, error } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('live_session_id', liveSessionId)
        .maybeSingle();

      if (error) throw error;
      return data as InterviewSession | null;
    },
    enabled: !!liveSessionId,
  });

  return { interviewSession, isLoading, refetch };
}

export function useSubmitInterviewFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      rating,
      feedback,
      interviewNotes,
    }: {
      sessionId: string;
      rating: number;
      feedback: string;
      interviewNotes?: string;
    }) => {
      // First check if an interview session exists for this live session
      const { data: existingSession, error: fetchError } = await supabase
        .from('interview_sessions')
        .select('id')
        .eq('live_session_id', sessionId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingSession) {
        // Update existing interview session
        const { error } = await supabase
          .from('interview_sessions')
          .update({
            rating,
            feedback,
            interview_notes: interviewNotes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSession.id);

        if (error) throw error;
      } else {
        // Create new interview session record
        const { error } = await supabase
          .from('interview_sessions')
          .insert({
            live_session_id: sessionId,
            rating,
            feedback,
            interview_notes: interviewNotes || null,
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['interview-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
    },
  });
}
