import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CodingLab {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  time_limit_seconds: number;
  memory_limit_mb: number;
  allowed_languages: string[];
  starter_code: Record<string, string>;
  course_id: string | null;
  status: string;
  is_enabled: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  courses?: {
    id: string;
    course_code: string;
    course_name: string;
  };
}

export interface TestCase {
  id: string;
  lab_id: string;
  input: string;
  expected_output: string;
  is_sample: boolean;
  is_hidden: boolean;
  weight: number;
  description: string | null;
  order_index: number;
}

export interface Submission {
  id: string;
  lab_id: string;
  student_id: string;
  language: string;
  source_code: string;
  status: string;
  execution_time_ms: number | null;
  memory_used_kb: number | null;
  test_results: any[];
  passed_test_cases: number;
  total_test_cases: number;
  score: number;
  submitted_at: string;
  students?: {
    first_name: string;
    last_name: string;
    student_id: string;
  };
}

export function useCodingLabs() {
  const { toast } = useToast();
  const [labs, setLabs] = useState<CodingLab[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLabs = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coding_labs')
        .select(`
          *,
          courses (
            id,
            course_code,
            course_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLabs((data || []) as unknown as CodingLab[]);
    } catch (error) {
      console.error('Error fetching coding labs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load coding labs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

  const createLab = async (
    lab: Omit<CodingLab, 'id' | 'created_at' | 'courses'>
  ) => {
    const { data, error } = await supabase
      .from('coding_labs')
      .insert(lab)
      .select()
      .single();

    if (error) throw error;
    await fetchLabs();
    return data;
  };

  const updateLab = async (id: string, updates: Partial<CodingLab>) => {
    const { error } = await supabase
      .from('coding_labs')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchLabs();
  };

  const deleteLab = async (id: string) => {
    const { error } = await supabase.from('coding_labs').delete().eq('id', id);

    if (error) throw error;
    await fetchLabs();
  };

  return {
    labs,
    loading,
    fetchLabs,
    createLab,
    updateLab,
    deleteLab,
  };
}

export function useLabTestCases(labId: string | null) {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTestCases = useCallback(async () => {
    if (!labId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coding_lab_test_cases')
        .select('*')
        .eq('lab_id', labId)
        .order('order_index');

      if (error) throw error;
      setTestCases((data || []) as TestCase[]);
    } catch (error) {
      console.error('Error fetching test cases:', error);
    } finally {
      setLoading(false);
    }
  }, [labId]);

  useEffect(() => {
    fetchTestCases();
  }, [fetchTestCases]);

  const addTestCase = async (testCase: Omit<TestCase, 'id'>) => {
    const { error } = await supabase.from('coding_lab_test_cases').insert(testCase);
    if (error) throw error;
    await fetchTestCases();
  };

  const updateTestCase = async (id: string, updates: Partial<TestCase>) => {
    const { error } = await supabase
      .from('coding_lab_test_cases')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    await fetchTestCases();
  };

  const deleteTestCase = async (id: string) => {
    const { error } = await supabase
      .from('coding_lab_test_cases')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await fetchTestCases();
  };

  return {
    testCases,
    loading,
    fetchTestCases,
    addTestCase,
    updateTestCase,
    deleteTestCase,
  };
}

export function useLabSubmissions(labId: string | null) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    if (!labId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coding_lab_submissions')
        .select(`
          *,
          students (
            first_name,
            last_name,
            student_id
          )
        `)
        .eq('lab_id', labId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions((data || []) as unknown as Submission[]);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  }, [labId]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  return { submissions, loading, fetchSubmissions };
}
