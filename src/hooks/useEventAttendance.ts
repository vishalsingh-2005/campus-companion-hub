import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface EventAttendanceRecord {
  id: string;
  event_id: string;
  registration_id: string | null;
  participant_name: string;
  participant_email: string;
  check_in_time: string;
  check_out_time: string | null;
  attendance_method: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export function useEventAttendance(eventId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const attendanceQuery = useQuery({
    queryKey: ['event-attendance', eventId],
    queryFn: async () => {
      let query = supabase
        .from('event_attendance')
        .select('*')
        .order('check_in_time', { ascending: false });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EventAttendanceRecord[];
    },
    enabled: !!eventId,
  });

  const recordAttendance = useMutation({
    mutationFn: async (record: {
      event_id: string;
      registration_id?: string;
      participant_name: string;
      participant_email: string;
      attendance_method?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('event_attendance')
        .insert({ ...record, recorded_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-attendance'] });
      toast.success('Attendance recorded');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record attendance: ${error.message}`);
    },
  });

  const checkOutParticipant = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('event_attendance')
        .update({ check_out_time: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-attendance'] });
      toast.success('Participant checked out');
    },
    onError: (error: Error) => {
      toast.error(`Check-out failed: ${error.message}`);
    },
  });

  const deleteAttendance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('event_attendance').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-attendance'] });
      toast.success('Attendance record deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  return {
    attendance: attendanceQuery.data || [],
    isLoading: attendanceQuery.isLoading,
    error: attendanceQuery.error,
    recordAttendance,
    checkOutParticipant,
    deleteAttendance,
    refetch: attendanceQuery.refetch,
  };
}
