import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClassroomLocation {
  id: string;
  name: string;
  building: string | null;
  room_number: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  created_at: string;
  updated_at: string;
}

export function useClassroomLocations() {
  const { data: locations, isLoading, error, refetch } = useQuery({
    queryKey: ['classroom-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classroom_locations')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as ClassroomLocation[];
    },
  });

  return { locations: locations || [], isLoading, error, refetch };
}

export function useCreateClassroomLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      building?: string;
      room_number?: string;
      latitude: number;
      longitude: number;
      radius_meters?: number;
    }) => {
      const { data: location, error } = await supabase
        .from('classroom_locations')
        .insert({
          name: data.name,
          building: data.building || null,
          room_number: data.room_number || null,
          latitude: data.latitude,
          longitude: data.longitude,
          radius_meters: data.radius_meters || 50,
        })
        .select()
        .single();

      if (error) throw error;
      return location;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroom-locations'] });
      toast.success('Classroom location added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add location: ${error.message}`);
    },
  });
}

export function useUpdateClassroomLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<ClassroomLocation> & { id: string }) => {
      const { error } = await supabase
        .from('classroom_locations')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroom-locations'] });
      toast.success('Location updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update location: ${error.message}`);
    },
  });
}

export function useDeleteClassroomLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('classroom_locations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroom-locations'] });
      toast.success('Location deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete location: ${error.message}`);
    },
  });
}
