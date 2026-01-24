import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ClassSchedule } from '@/types/schedule';

export function useSchedules(courseId?: string) {
  const queryClient = useQueryClient();

  const schedulesQuery = useQuery({
    queryKey: ['schedules', courseId],
    queryFn: async () => {
      let query = supabase
        .from('class_schedules')
        .select(`
          *,
          courses (
            id,
            course_code,
            course_name,
            teachers (
              id,
              first_name,
              last_name
            )
          )
        `)
        .order('day_of_week')
        .order('start_time');

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ClassSchedule[];
    },
  });

  const createSchedule = useMutation({
    mutationFn: async (schedule: {
      course_id: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      room?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('class_schedules')
        .insert(schedule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create schedule: ${error.message}`);
    },
  });

  const updateSchedule = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      course_id?: string;
      day_of_week?: number;
      start_time?: string;
      end_time?: string;
      room?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('class_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update schedule: ${error.message}`);
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('class_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  return {
    schedules: schedulesQuery.data || [],
    isLoading: schedulesQuery.isLoading,
    error: schedulesQuery.error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    refetch: schedulesQuery.refetch,
  };
}
