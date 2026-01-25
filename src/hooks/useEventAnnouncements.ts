import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface EventAnnouncement {
  id: string;
  event_id: string | null;
  title: string;
  message: string;
  priority: string;
  is_global: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  events?: {
    id: string;
    title: string;
  };
}

export function useEventAnnouncements(eventId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const announcementsQuery = useQuery({
    queryKey: ['event-announcements', eventId],
    queryFn: async () => {
      let query = supabase
        .from('event_announcements')
        .select('*, events(id, title)')
        .order('created_at', { ascending: false });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EventAnnouncement[];
    },
  });

  const createAnnouncement = useMutation({
    mutationFn: async (announcement: {
      event_id?: string;
      title: string;
      message: string;
      priority?: string;
      is_global?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('event_announcements')
        .insert({ ...announcement, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-announcements'] });
      toast.success('Announcement created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create announcement: ${error.message}`);
    },
  });

  const updateAnnouncement = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EventAnnouncement> & { id: string }) => {
      const { data, error } = await supabase
        .from('event_announcements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-announcements'] });
      toast.success('Announcement updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('event_announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-announcements'] });
      toast.success('Announcement deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  return {
    announcements: announcementsQuery.data || [],
    isLoading: announcementsQuery.isLoading,
    error: announcementsQuery.error,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    refetch: announcementsQuery.refetch,
  };
}
