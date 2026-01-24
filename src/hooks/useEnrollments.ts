import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CourseEnrollment } from '@/types/database';
import { toast } from 'sonner';

export function useEnrollments() {
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('*, students(id, first_name, last_name, email, student_id), courses(id, course_code, course_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEnrollments(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch enrollments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createEnrollment = async (studentId: string, courseId: string) => {
    try {
      const { error } = await supabase.from('course_enrollments').insert([{
        student_id: studentId,
        course_id: courseId,
        status: 'enrolled',
      }]);
      if (error) {
        if (error.message.includes('duplicate')) {
          toast.error('Student is already enrolled in this course');
        } else {
          throw error;
        }
        return false;
      }
      toast.success('Enrollment created successfully');
      await fetchEnrollments();
      return true;
    } catch (error: any) {
      toast.error('Failed to create enrollment: ' + error.message);
      return false;
    }
  };

  const updateEnrollment = async (id: string, data: { grade?: string; status?: string }) => {
    try {
      const { error } = await supabase
        .from('course_enrollments')
        .update(data)
        .eq('id', id);
      if (error) throw error;
      toast.success('Enrollment updated successfully');
      await fetchEnrollments();
      return true;
    } catch (error: any) {
      toast.error('Failed to update enrollment: ' + error.message);
      return false;
    }
  };

  const deleteEnrollment = async (id: string) => {
    try {
      const { error } = await supabase.from('course_enrollments').delete().eq('id', id);
      if (error) throw error;
      toast.success('Enrollment deleted successfully');
      await fetchEnrollments();
      return true;
    } catch (error: any) {
      toast.error('Failed to delete enrollment: ' + error.message);
      return false;
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  return {
    enrollments,
    loading,
    createEnrollment,
    updateEnrollment,
    deleteEnrollment,
    refetch: fetchEnrollments,
  };
}
