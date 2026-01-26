import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStudents } from '@/hooks/useStudents';
import { StudentFee, useCreateFee, useUpdateFee } from '@/hooks/useFees';
import { Loader2 } from 'lucide-react';

const feeSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  fee_type: z.string().min(1, 'Fee type is required'),
  description: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be positive'),
  due_date: z.string().min(1, 'Due date is required'),
  status: z.string().default('pending'),
  academic_year: z.string().optional(),
  semester: z.string().optional(),
});

type FeeFormValues = z.infer<typeof feeSchema>;

interface FeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fee?: StudentFee | null;
}

const feeTypes = [
  'Tuition Fee',
  'Exam Fee',
  'Library Fee',
  'Lab Fee',
  'Sports Fee',
  'Hostel Fee',
  'Transport Fee',
  'Miscellaneous',
];

const statuses = ['pending', 'partial', 'paid', 'overdue'];

export function FeeFormDialog({ open, onOpenChange, fee }: FeeFormDialogProps) {
  const { students } = useStudents();
  const createFee = useCreateFee();
  const updateFee = useUpdateFee();

  const form = useForm<FeeFormValues>({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      student_id: '',
      fee_type: '',
      description: '',
      amount: 0,
      due_date: '',
      status: 'pending',
      academic_year: '',
      semester: '',
    },
  });

  useEffect(() => {
    if (fee) {
      form.reset({
        student_id: fee.student_id,
        fee_type: fee.fee_type,
        description: fee.description || '',
        amount: fee.amount,
        due_date: fee.due_date,
        status: fee.status,
        academic_year: fee.academic_year || '',
        semester: fee.semester || '',
      });
    } else {
      form.reset({
        student_id: '',
        fee_type: '',
        description: '',
        amount: 0,
        due_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        academic_year: '',
        semester: '',
      });
    }
  }, [fee, form]);

  const onSubmit = async (data: FeeFormValues) => {
    try {
      if (fee) {
        await updateFee.mutateAsync({ 
          id: fee.id, 
          student_id: data.student_id,
          fee_type: data.fee_type,
          description: data.description,
          amount: data.amount,
          due_date: data.due_date,
          status: data.status,
          academic_year: data.academic_year,
          semester: data.semester,
        });
      } else {
        await createFee.mutateAsync({
          student_id: data.student_id,
          fee_type: data.fee_type,
          description: data.description,
          amount: data.amount,
          due_date: data.due_date,
          status: data.status,
          academic_year: data.academic_year,
          semester: data.semester,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving fee:', error);
    }
  };

  const isLoading = createFee.isPending || updateFee.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{fee ? 'Edit Fee Record' : 'Add New Fee'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="student_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a student" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.first_name} {student.last_name} ({student.student_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fee_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {feeTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="academic_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Year</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 2024-2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semester</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Fall 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional details..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {fee ? 'Update' : 'Create'} Fee
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
