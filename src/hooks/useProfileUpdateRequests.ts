import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProfileUpdateRequest {
  id: string;
  student_id: string;
  requested_changes: Record<string, string>;
  status: string;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  students?: { first_name: string; last_name: string; student_id: string; email: string };
}

export function useProfileUpdateRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ProfileUpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profile_update_requests')
      .select('*, students(first_name, last_name, student_id, email)')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); }
    setRequests((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const submitRequest = async (studentId: string, changes: Record<string, string>) => {
    const { error } = await supabase.from('profile_update_requests').insert([{ student_id: studentId, requested_changes: changes }] as any);
    if (error) { toast.error('Failed to submit request: ' + error.message); return false; }
    toast.success('Profile update request submitted for admin approval');
    await fetchRequests();
    return true;
  };

  const reviewRequest = async (id: string, status: 'approved' | 'rejected', adminNotes?: string) => {
    // If approved, apply the changes to the student record
    if (status === 'approved') {
      const request = requests.find(r => r.id === id);
      if (request) {
        const { error: updateError } = await supabase.from('students').update(request.requested_changes).eq('id', request.student_id);
        if (updateError) { toast.error('Failed to apply changes'); return false; }
      }
    }
    const { error } = await supabase.from('profile_update_requests').update({ status, admin_notes: adminNotes, reviewed_by: user?.id, reviewed_at: new Date().toISOString() } as any).eq('id', id);
    if (error) { toast.error('Failed to review request'); return false; }
    toast.success(`Request ${status}`);
    await fetchRequests();
    return true;
  };

  return { requests, loading, submitRequest, reviewRequest, refetch: fetchRequests };
}
