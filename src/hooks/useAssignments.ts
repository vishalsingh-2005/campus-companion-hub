import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Assignment {
  id: string;
  course_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  due_date: string;
  max_marks: number;
  status: string;
  created_at: string;
  courses?: { course_name: string; course_code: string };
  teachers?: { first_name: string; last_name: string };
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string | null;
  file_name: string | null;
  submission_text: string | null;
  submitted_at: string;
  marks: number | null;
  feedback: string | null;
  graded_at: string | null;
  status: string;
  students?: { first_name: string; last_name: string; student_id: string };
  assignments?: { title: string };
}

export function useAssignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    const { data, error } = await supabase
      .from('assignments')
      .select('*, courses(course_name, course_code), teachers(first_name, last_name)')
      .order('due_date', { ascending: false });
    if (error) { console.error(error); return; }
    setAssignments((data as any) || []);
  }, []);

  const fetchSubmissions = useCallback(async () => {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('*, students(first_name, last_name, student_id), assignments(title)')
      .order('submitted_at', { ascending: false });
    if (error) { console.error(error); return; }
    setSubmissions((data as any) || []);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchAssignments(), fetchSubmissions()]);
    setLoading(false);
  }, [fetchAssignments, fetchSubmissions]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createAssignment = async (data: { course_id: string; teacher_id: string; title: string; description?: string; file_url?: string; file_name?: string; due_date: string; max_marks?: number }) => {
    const { error } = await supabase.from('assignments').insert([data as any]);
    if (error) { toast.error('Failed to create assignment: ' + error.message); return false; }
    toast.success('Assignment created');
    await fetchAssignments();
    return true;
  };

  const deleteAssignment = async (id: string) => {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) { toast.error('Failed to delete assignment'); return false; }
    toast.success('Assignment deleted');
    await fetchAssignments();
    return true;
  };

  const submitAssignment = async (data: { assignment_id: string; student_id: string; file_url?: string; file_name?: string; submission_text?: string }) => {
    const { error } = await supabase.from('assignment_submissions').insert([data as any]);
    if (error) { toast.error('Failed to submit: ' + error.message); return false; }
    toast.success('Assignment submitted');
    await fetchSubmissions();
    return true;
  };

  const gradeSubmission = async (id: string, marks: number, feedback: string) => {
    const { error } = await supabase.from('assignment_submissions').update({ marks, feedback, graded_at: new Date().toISOString(), graded_by: user?.id, status: 'graded' } as any).eq('id', id);
    if (error) { toast.error('Failed to grade'); return false; }
    toast.success('Submission graded');
    await fetchSubmissions();
    return true;
  };

  return { assignments, submissions, loading, createAssignment, deleteAssignment, submitAssignment, gradeSubmission, refetch: fetchAll };
}
