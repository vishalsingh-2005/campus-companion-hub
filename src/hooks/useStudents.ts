import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Student, StudentFormData } from '@/types/database';
import { toast } from 'sonner';

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch students: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createStudent = async (data: StudentFormData) => {
    try {
      const { error } = await supabase.from('students').insert([data]);
      if (error) throw error;
      toast.success('Student added successfully');
      await fetchStudents();
      return true;
    } catch (error: any) {
      toast.error('Failed to add student: ' + error.message);
      return false;
    }
  };

  const updateStudent = async (id: string, data: Partial<StudentFormData>) => {
    try {
      const { error } = await supabase
        .from('students')
        .update(data)
        .eq('id', id);
      if (error) throw error;
      toast.success('Student updated successfully');
      await fetchStudents();
      return true;
    } catch (error: any) {
      toast.error('Failed to update student: ' + error.message);
      return false;
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      toast.success('Student deleted successfully');
      await fetchStudents();
      return true;
    } catch (error: any) {
      toast.error('Failed to delete student: ' + error.message);
      return false;
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  return {
    students,
    loading,
    createStudent,
    updateStudent,
    deleteStudent,
    refetch: fetchStudents,
  };
}
