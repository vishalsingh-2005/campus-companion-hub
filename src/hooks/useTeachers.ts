import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Teacher, TeacherFormData } from '@/types/database';
import { toast } from 'sonner';

export function useTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeachers(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch teachers: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createTeacher = async (data: TeacherFormData) => {
    try {
      const { error } = await supabase.from('teachers').insert([data]);
      if (error) throw error;
      toast.success('Teacher added successfully');
      await fetchTeachers();
      return true;
    } catch (error: any) {
      toast.error('Failed to add teacher: ' + error.message);
      return false;
    }
  };

  const updateTeacher = async (id: string, data: Partial<TeacherFormData>) => {
    try {
      const { error } = await supabase
        .from('teachers')
        .update(data)
        .eq('id', id);
      if (error) throw error;
      toast.success('Teacher updated successfully');
      await fetchTeachers();
      return true;
    } catch (error: any) {
      toast.error('Failed to update teacher: ' + error.message);
      return false;
    }
  };

  const deleteTeacher = async (id: string) => {
    try {
      const { error } = await supabase.from('teachers').delete().eq('id', id);
      if (error) throw error;
      toast.success('Teacher deleted successfully');
      await fetchTeachers();
      return true;
    } catch (error: any) {
      toast.error('Failed to delete teacher: ' + error.message);
      return false;
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  return {
    teachers,
    loading,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    refetch: fetchTeachers,
  };
}
