import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Course, CourseFormData } from '@/types/database';
import { toast } from 'sonner';

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*, teachers(id, first_name, last_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch courses: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createCourse = async (data: CourseFormData) => {
    try {
      const { error } = await supabase.from('courses').insert([data]);
      if (error) throw error;
      toast.success('Course added successfully');
      await fetchCourses();
      return true;
    } catch (error: any) {
      toast.error('Failed to add course: ' + error.message);
      return false;
    }
  };

  const updateCourse = async (id: string, data: Partial<CourseFormData>) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update(data)
        .eq('id', id);
      if (error) throw error;
      toast.success('Course updated successfully');
      await fetchCourses();
      return true;
    } catch (error: any) {
      toast.error('Failed to update course: ' + error.message);
      return false;
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
      toast.success('Course deleted successfully');
      await fetchCourses();
      return true;
    } catch (error: any) {
      toast.error('Failed to delete course: ' + error.message);
      return false;
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  return {
    courses,
    loading,
    createCourse,
    updateCourse,
    deleteCourse,
    refetch: fetchCourses,
  };
}
