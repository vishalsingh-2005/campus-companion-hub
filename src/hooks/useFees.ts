import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StudentFee {
  id: string;
  student_id: string;
  fee_type: string;
  description: string | null;
  amount: number;
  due_date: string;
  paid_amount: number;
  payment_date: string | null;
  payment_method: string | null;
  transaction_id: string | null;
  status: string;
  academic_year: string | null;
  semester: string | null;
  created_at: string;
  updated_at: string;
  students?: {
    id: string;
    first_name: string;
    last_name: string;
    student_id: string;
    email: string;
  };
}

export interface FeeFormData {
  student_id: string;
  fee_type: string;
  description?: string;
  amount: number;
  due_date: string;
  paid_amount?: number;
  payment_date?: string;
  payment_method?: string;
  transaction_id?: string;
  status?: string;
  academic_year?: string;
  semester?: string;
}

export function useFees() {
  return useQuery({
    queryKey: ['fees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_fees')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            student_id,
            email
          )
        `)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data as StudentFee[];
    },
  });
}

export function useStudentFees(studentId?: string) {
  return useQuery({
    queryKey: ['student-fees', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      
      const { data, error } = await supabase
        .from('student_fees')
        .select('*')
        .eq('student_id', studentId)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data as StudentFee[];
    },
    enabled: !!studentId,
  });
}

export function useMyFees() {
  return useQuery({
    queryKey: ['my-fees'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!student) throw new Error('Student not found');

      const { data, error } = await supabase
        .from('student_fees')
        .select('*')
        .eq('student_id', student.id)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data as StudentFee[];
    },
  });
}

export function useCreateFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feeData: FeeFormData) => {
      const { data, error } = await supabase
        .from('student_fees')
        .insert(feeData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      toast.success('Fee record created successfully');
    },
    onError: (error) => {
      console.error('Error creating fee:', error);
      toast.error('Failed to create fee record');
    },
  });
}

export function useUpdateFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...feeData }: FeeFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('student_fees')
        .update(feeData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      toast.success('Fee record updated successfully');
    },
    onError: (error) => {
      console.error('Error updating fee:', error);
      toast.error('Failed to update fee record');
    },
  });
}

export function useDeleteFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('student_fees')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      toast.success('Fee record deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting fee:', error);
      toast.error('Failed to delete fee record');
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      paid_amount, 
      payment_method, 
      transaction_id 
    }: { 
      id: string; 
      paid_amount: number; 
      payment_method: string; 
      transaction_id?: string;
    }) => {
      // Get current fee
      const { data: currentFee, error: fetchError } = await supabase
        .from('student_fees')
        .select('amount, paid_amount')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newPaidAmount = (currentFee.paid_amount || 0) + paid_amount;
      const newStatus = newPaidAmount >= currentFee.amount ? 'paid' : 'partial';

      const { data, error } = await supabase
        .from('student_fees')
        .update({
          paid_amount: newPaidAmount,
          payment_date: new Date().toISOString(),
          payment_method,
          transaction_id,
          status: newStatus,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      toast.success('Payment recorded successfully');
    },
    onError: (error) => {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    },
  });
}
