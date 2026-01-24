import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Teacher } from '@/types/database';
import { ProfilePhotoUpload } from '@/components/common/ProfilePhotoUpload';
import { CreateCredentialsSection } from '@/components/common/CreateCredentialsSection';
import { Separator } from '@/components/ui/separator';

const teacherSchema = z.object({
  teacher_id: z.string().min(1, 'Teacher ID is required').max(20),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address').max(255),
  phone: z.string().max(20).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  qualification: z.string().max(100).optional().nullable(),
  hire_date: z.string(),
  status: z.string(),
  avatar_url: z.string().optional().nullable(),
  user_id: z.string().optional().nullable(),
});

type TeacherFormValues = z.infer<typeof teacherSchema>;

interface TeacherFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: Teacher | null;
  onSubmit: (data: TeacherFormValues) => void | Promise<void>;
}

export function TeacherFormDialog({
  open,
  onOpenChange,
  teacher,
  onSubmit,
}: TeacherFormDialogProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      teacher_id: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department: '',
      qualification: '',
      hire_date: new Date().toISOString().split('T')[0],
      status: 'active',
      avatar_url: null,
      user_id: null,
    },
  });

  const firstName = form.watch('first_name');
  const lastName = form.watch('last_name');

  useEffect(() => {
    if (teacher) {
      form.reset({
        teacher_id: teacher.teacher_id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        email: teacher.email,
        phone: teacher.phone || '',
        department: teacher.department || '',
        qualification: teacher.qualification || '',
        hire_date: teacher.hire_date,
        status: teacher.status,
        avatar_url: teacher.avatar_url || null,
        user_id: teacher.user_id || null,
      });
      setAvatarUrl(teacher.avatar_url || null);
      setUserId(teacher.user_id || null);
    } else {
      form.reset({
        teacher_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        department: '',
        qualification: '',
        hire_date: new Date().toISOString().split('T')[0],
        status: 'active',
        avatar_url: null,
        user_id: null,
      });
      setAvatarUrl(null);
      setUserId(null);
    }
  }, [teacher, form, open]);

  const persistLinkedAccountIfEditing = async (newUserId: string) => {
    // If the teacher already exists (edit mode), persist the linked account immediately
    // so the Teachers table shows "Linked" without requiring an extra manual "Update Teacher" click.
    if (!teacher) return;

    const current = form.getValues();

    await onSubmit({
      ...current,
      phone: current.phone || null,
      department: current.department || null,
      qualification: current.qualification || null,
      avatar_url: avatarUrl,
      user_id: newUserId,
    });
  };

  const handleSubmit = (data: TeacherFormValues) => {
    onSubmit({
      ...data,
      phone: data.phone || null,
      department: data.department || null,
      qualification: data.qualification || null,
      avatar_url: avatarUrl,
      user_id: userId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {teacher ? 'Edit Teacher' : 'Add New Teacher'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Profile Photo */}
            <div className="flex justify-center pb-4 border-b">
              <ProfilePhotoUpload
                currentUrl={avatarUrl}
                onUpload={setAvatarUrl}
                folder="teachers"
                entityId={teacher?.id}
                name={`${firstName} ${lastName}`.trim()}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="teacher_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teacher ID</FormLabel>
                    <FormControl>
                      <Input placeholder="TCH001" {...field} />
                    </FormControl>
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
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jane.smith@college.edu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 234 567 8900" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="Computer Science" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="qualification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qualification</FormLabel>
                    <FormControl>
                      <Input placeholder="Ph.D. in Computer Science" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hire_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hire Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* User Account Credentials */}
            <Separator />
            <CreateCredentialsSection
              email={form.watch('email')}
              fullName={`${form.watch('first_name')} ${form.watch('last_name')}`.trim()}
              role="teacher"
              onUserCreated={(newUserId) => {
                setUserId(newUserId);
                void persistLinkedAccountIfEditing(newUserId);
              }}
              existingUserId={userId}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {teacher ? 'Update Teacher' : 'Add Teacher'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
