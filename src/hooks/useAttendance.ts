import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Attendance, AttendanceStatus } from '@/types/attendance';

export function useAttendance(courseId?: string, date?: string) {
  const queryClient = useQueryClient();

  const attendanceQuery = useQuery({
    queryKey: ['attendance', courseId, date],
    queryFn: async () => {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            student_id
          ),
          courses (
            id,
            course_code,
            course_name
          )
        `)
        .order('attendance_date', { ascending: false });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }
      if (date) {
        query = query.eq('attendance_date', date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Attendance[];
    },
    enabled: true,
  });

  const recordAttendance = useMutation({
    mutationFn: async (records: {
      student_id: string;
      course_id: string;
      attendance_date: string;
      status: AttendanceStatus;
      notes?: string;
    }[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const recordsWithUser = records.map(r => ({
        ...r,
        recorded_by: user?.id,
      }));

      const { data, error } = await supabase
        .from('attendance')
        .upsert(recordsWithUser, {
          onConflict: 'student_id,course_id,attendance_date',
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record attendance: ${error.message}`);
    },
  });

  const updateAttendance = useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: AttendanceStatus;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('attendance')
        .update({ status, notes })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const deleteAttendance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
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
    updateAttendance,
    deleteAttendance,
    refetch: attendanceQuery.refetch,
  };
}

export function useStudentAttendance(studentId?: string) {
  return useQuery({
    queryKey: ['student-attendance', studentId],
    queryFn: async () => {
      if (!studentId) return [];

      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          courses (
            id,
            course_code,
            course_name
          )
        `)
        .eq('student_id', studentId)
        .order('attendance_date', { ascending: false });

      if (error) throw error;
      return data as Attendance[];
    },
    enabled: !!studentId,
  });
}

export function useCourseStudents(courseId?: string) {
  return useQuery({
    queryKey: ['course-students', courseId],
    queryFn: async () => {
      if (!courseId) return [];

      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          student_id,
          students (
            id,
            first_name,
            last_name,
            student_id
          )
        `)
        .eq('course_id', courseId)
        .eq('status', 'enrolled');

      if (error) throw error;
      return data?.map(e => e.students).filter(Boolean) || [];
    },
    enabled: !!courseId,
  });
}
