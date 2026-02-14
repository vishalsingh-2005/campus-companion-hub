import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface InternalMark {
  id: string;
  course_id: string;
  student_id: string;
  teacher_id: string;
  exam_type: string;
  marks_obtained: number;
  max_marks: number;
  semester: string;
  academic_year: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  courses?: { course_name: string; course_code: string; credits: number };
  students?: { first_name: string; last_name: string; student_id: string };
  teachers?: { first_name: string; last_name: string };
}

export interface SemesterResult {
  id: string;
  student_id: string;
  semester: string;
  academic_year: string;
  sgpa: number | null;
  cgpa: number | null;
  total_credits: number;
  earned_credits: number;
  total_marks: number | null;
  obtained_marks: number | null;
  percentage: number | null;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  students?: { first_name: string; last_name: string; student_id: string };
}

export function useInternalMarks() {
  const { user } = useAuth();
  const [marks, setMarks] = useState<InternalMark[]>([]);
  const [results, setResults] = useState<SemesterResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarks = useCallback(async () => {
    const { data, error } = await supabase
      .from('internal_marks')
      .select('*, courses(course_name, course_code, credits), students(first_name, last_name, student_id), teachers(first_name, last_name)')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setMarks((data as any) || []);
  }, []);

  const fetchResults = useCallback(async () => {
    const { data, error } = await supabase
      .from('semester_results')
      .select('*, students(first_name, last_name, student_id)')
      .order('academic_year', { ascending: false });
    if (error) { console.error(error); return; }
    setResults((data as any) || []);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMarks(), fetchResults()]);
    setLoading(false);
  }, [fetchMarks, fetchResults]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addMark = async (data: {
    course_id: string;
    student_id: string;
    teacher_id: string;
    exam_type: string;
    marks_obtained: number;
    max_marks: number;
    semester: string;
    academic_year: string;
    remarks?: string;
  }) => {
    const { error } = await supabase.from('internal_marks').insert([data as any]);
    if (error) { toast.error('Failed to add marks: ' + error.message); return false; }
    toast.success('Marks added successfully');
    await fetchMarks();
    return true;
  };

  const updateMark = async (id: string, data: Partial<InternalMark>) => {
    const { error } = await supabase.from('internal_marks').update(data as any).eq('id', id);
    if (error) { toast.error('Failed to update marks'); return false; }
    toast.success('Marks updated');
    await fetchMarks();
    return true;
  };

  const deleteMark = async (id: string) => {
    const { error } = await supabase.from('internal_marks').delete().eq('id', id);
    if (error) { toast.error('Failed to delete marks'); return false; }
    toast.success('Marks deleted');
    await fetchMarks();
    return true;
  };

  const calculateGPA = (marksForSemester: InternalMark[]): { sgpa: number; totalCredits: number; earnedCredits: number; percentage: number } => {
    if (marksForSemester.length === 0) return { sgpa: 0, totalCredits: 0, earnedCredits: 0, percentage: 0 };

    let totalWeightedPoints = 0;
    let totalCredits = 0;
    let totalObtained = 0;
    let totalMax = 0;

    const courseGroups = marksForSemester.reduce((acc, m) => {
      if (!acc[m.course_id]) acc[m.course_id] = { marks: [], credits: m.courses?.credits || 3 };
      acc[m.course_id].marks.push(m);
      return acc;
    }, {} as Record<string, { marks: InternalMark[]; credits: number }>);

    Object.values(courseGroups).forEach(({ marks: courseMarks, credits }) => {
      const obtained = courseMarks.reduce((s, m) => s + m.marks_obtained, 0);
      const max = courseMarks.reduce((s, m) => s + m.max_marks, 0);
      const pct = max > 0 ? (obtained / max) * 100 : 0;
      totalObtained += obtained;
      totalMax += max;
      totalCredits += credits;

      let gradePoint = 0;
      if (pct >= 90) gradePoint = 10;
      else if (pct >= 80) gradePoint = 9;
      else if (pct >= 70) gradePoint = 8;
      else if (pct >= 60) gradePoint = 7;
      else if (pct >= 50) gradePoint = 6;
      else if (pct >= 40) gradePoint = 5;
      else gradePoint = 0;

      if (gradePoint > 0) totalWeightedPoints += gradePoint * credits;
    });

    const earnedCredits = totalCredits; // simplified
    const sgpa = totalCredits > 0 ? parseFloat((totalWeightedPoints / totalCredits).toFixed(2)) : 0;
    const percentage = totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(2)) : 0;

    return { sgpa, totalCredits, earnedCredits, percentage };
  };

  const publishResults = async (semester: string, academicYear: string) => {
    // Group marks by student for this semester
    const semesterMarks = marks.filter(m => m.semester === semester && m.academic_year === academicYear);
    const studentGroups = semesterMarks.reduce((acc, m) => {
      if (!acc[m.student_id]) acc[m.student_id] = [];
      acc[m.student_id].push(m);
      return acc;
    }, {} as Record<string, InternalMark[]>);

    const resultsToUpsert = Object.entries(studentGroups).map(([studentId, studentMarks]) => {
      const { sgpa, totalCredits, earnedCredits, percentage } = calculateGPA(studentMarks);
      const totalObtained = studentMarks.reduce((s, m) => s + m.marks_obtained, 0);
      const totalMax = studentMarks.reduce((s, m) => s + m.max_marks, 0);

      return {
        student_id: studentId,
        semester,
        academic_year: academicYear,
        sgpa,
        total_credits: totalCredits,
        earned_credits: earnedCredits,
        total_marks: totalMax,
        obtained_marks: totalObtained,
        percentage,
        status: 'published',
        published_at: new Date().toISOString(),
      };
    });

    for (const result of resultsToUpsert) {
      const { error } = await supabase
        .from('semester_results')
        .upsert(result as any, { onConflict: 'student_id,semester,academic_year' });
      if (error) { toast.error('Failed to publish result: ' + error.message); return false; }
    }

    toast.success(`Results published for ${resultsToUpsert.length} students`);
    await fetchResults();
    return true;
  };

  return { marks, results, loading, addMark, updateMark, deleteMark, publishResults, calculateGPA, refetch: fetchAll };
}
