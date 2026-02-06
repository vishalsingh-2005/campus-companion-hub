import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Holiday {
  id: string;
  title: string;
  description: string | null;
  holiday_date: string;
  holiday_type: string;
  is_recurring: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type HolidayFormData = {
  title: string;
  description?: string | null;
  holiday_date: string;
  holiday_type: string;
  is_recurring: boolean;
};

export function useHolidays() {
  const queryClient = useQueryClient();

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('holiday_date', { ascending: true });
      if (error) throw error;
      return data as Holiday[];
    },
  });

  const createHoliday = useMutation({
    mutationFn: async (formData: HolidayFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('holidays').insert({
        ...formData,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add holiday: ${error.message}`);
    },
  });

  const updateHoliday = useMutation({
    mutationFn: async ({ id, ...formData }: HolidayFormData & { id: string }) => {
      const { error } = await supabase
        .from('holidays')
        .update(formData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update holiday: ${error.message}`);
    },
  });

  const deleteHoliday = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('holidays').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete holiday: ${error.message}`);
    },
  });

  return {
    holidays,
    isLoading,
    createHoliday,
    updateHoliday,
    deleteHoliday,
  };
}
