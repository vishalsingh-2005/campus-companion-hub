import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  venue: string | null;
  start_date: string;
  end_date: string | null;
  max_participants: number | null;
  registration_deadline: string | null;
  status: string;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  registration_count?: number;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  student_id: string | null;
  user_id: string | null;
  participant_name: string;
  participant_email: string;
  participant_phone: string | null;
  status: string;
  notes: string | null;
  registered_at: string;
  checked_in_at: string | null;
  created_at: string;
  updated_at: string;
  events?: Event;
}

export function useEvents(filters?: { status?: string; createdByMe?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ['events', filters],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.createdByMe && user?.id) {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get registration counts for each event
      const eventsWithCounts = await Promise.all(
        (data || []).map(async (event) => {
          const { count } = await supabase
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);
          return { ...event, registration_count: count || 0 };
        })
      );

      return eventsWithCounts as Event[];
    },
  });

  const createEvent = useMutation({
    mutationFn: async (event: {
      title: string;
      description?: string;
      event_type: string;
      venue?: string;
      start_date: string;
      end_date?: string;
      max_participants?: number;
      registration_deadline?: string;
      status?: string;
      is_public?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('events')
        .insert({ ...event, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create event: ${error.message}`);
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Event> & { id: string }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update event: ${error.message}`);
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete event: ${error.message}`);
    },
  });

  return {
    events: eventsQuery.data || [],
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error,
    createEvent,
    updateEvent,
    deleteEvent,
    refetch: eventsQuery.refetch,
  };
}

export function useEventRegistrations(eventId?: string) {
  const queryClient = useQueryClient();

  const registrationsQuery = useQuery({
    queryKey: ['event-registrations', eventId],
    queryFn: async () => {
      let query = supabase
        .from('event_registrations')
        .select('*, events(*)')
        .order('registered_at', { ascending: false });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EventRegistration[];
    },
    enabled: !!eventId,
  });

  const createRegistration = useMutation({
    mutationFn: async (registration: {
      event_id: string;
      participant_name: string;
      participant_email: string;
      participant_phone?: string;
      student_id?: string;
      user_id?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('event_registrations')
        .insert(registration)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Registration successful');
    },
    onError: (error: Error) => {
      toast.error(`Registration failed: ${error.message}`);
    },
  });

  const updateRegistration = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EventRegistration> & { id: string }) => {
      const { data, error } = await supabase
        .from('event_registrations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-registrations'] });
      toast.success('Registration updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update registration: ${error.message}`);
    },
  });

  const deleteRegistration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('event_registrations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Registration deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete registration: ${error.message}`);
    },
  });

  const checkInParticipant = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('event_registrations')
        .update({ checked_in_at: new Date().toISOString(), status: 'checked_in' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-registrations'] });
      toast.success('Participant checked in');
    },
    onError: (error: Error) => {
      toast.error(`Check-in failed: ${error.message}`);
    },
  });

  return {
    registrations: registrationsQuery.data || [],
    isLoading: registrationsQuery.isLoading,
    error: registrationsQuery.error,
    createRegistration,
    updateRegistration,
    deleteRegistration,
    checkInParticipant,
    refetch: registrationsQuery.refetch,
  };
}
