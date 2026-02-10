import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LeaveRequest {
  id: string;
  student_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  remarks: string | null;
  reviewer_role: string | null;
  reviewed_at: string | null;
  created_at: string;
  students?: { first_name: string; last_name: string; student_id: string };
}

export function useLeaveRequests() {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaveRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*, students(first_name, last_name, student_id)')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); }
    setLeaveRequests((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeaveRequests(); }, [fetchLeaveRequests]);

  const applyLeave = async (data: { student_id: string; leave_type: string; start_date: string; end_date: string; reason: string }) => {
    const { error } = await supabase.from('leave_requests').insert([data as any]);
    if (error) { toast.error('Failed to apply leave: ' + error.message); return false; }
    toast.success('Leave request submitted');
    await fetchLeaveRequests();
    return true;
  };

  const reviewLeave = async (id: string, status: 'approved' | 'rejected', remarks: string) => {
    const { error } = await supabase.from('leave_requests').update({ status, remarks, reviewer_id: user?.id, reviewer_role: 'teacher', reviewed_at: new Date().toISOString() } as any).eq('id', id);
    if (error) { toast.error('Failed to update leave'); return false; }
    toast.success(`Leave ${status}`);
    await fetchLeaveRequests();
    return true;
  };

  return { leaveRequests, loading, applyLeave, reviewLeave, refetch: fetchLeaveRequests };
}
