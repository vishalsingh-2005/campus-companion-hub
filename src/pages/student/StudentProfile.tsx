import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Phone, Calendar, Hash, Shield, Clock, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileUpdateRequests } from '@/hooks/useProfileUpdateRequests';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StudentData {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  email: string;
  phone: string | null;
  status: string;
  avatar_url: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  enrollment_date: string | null;
  created_at: string;
  father_name: string | null;
  mother_name: string | null;
  guardian_contact: string | null;
  city: string | null;
  state: string | null;
  course: string | null;
  semester: string | null;
}

export default function StudentProfile() {
  const { user } = useAuth();
  const { requests, submitRequest } = useProfileUpdateRequests();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchStudentData() {
      if (!user) return;
      try {
        const { data: student, error } = await supabase.from('students').select('*').eq('user_id', user.id).maybeSingle();
        if (error) throw error;
        setStudentData(student as any);
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStudentData();
  }, [user]);

  const myRequests = requests.filter(r => r.student_id === studentData?.id);
  const hasPendingRequest = myRequests.some(r => r.status === 'pending');

  const openEditDialog = () => {
    if (!studentData) return;
    setEditForm({
      phone: studentData.phone || '',
      father_name: studentData.father_name || '',
      mother_name: studentData.mother_name || '',
      guardian_contact: studentData.guardian_contact || '',
      address: studentData.address || '',
      city: studentData.city || '',
      state: studentData.state || '',
      gender: studentData.gender || '',
    });
    setEditDialog(true);
  };

  const handleSubmitRequest = async () => {
    if (!studentData) return;
    const changes: Record<string, string> = {};
    Object.entries(editForm).forEach(([key, value]) => {
      if (value && value !== (studentData as any)[key]) {
        changes[key] = value;
      }
    });
    if (Object.keys(changes).length === 0) { toast.info('No changes detected'); return; }
    const success = await submitRequest(studentData.id, changes);
    if (success) setEditDialog(false);
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-12 w-64" /><div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-80" /><Skeleton className="h-80 lg:col-span-2" /></div></div>;

  if (!studentData) return (
    <div className="flex flex-col items-center justify-center py-12">
      <User className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold">Profile Not Found</h2>
      <p className="text-muted-foreground mt-2">Your student profile has not been set up yet.</p>
    </div>
  );

  const profileFields = [
    { icon: Hash, label: 'Roll Number', value: studentData.student_id },
    { icon: User, label: 'Full Name', value: `${studentData.first_name} ${studentData.last_name}` },
    { icon: Mail, label: 'Email', value: studentData.email },
    { icon: Phone, label: 'Phone', value: studentData.phone || 'Not provided' },
    { icon: User, label: 'Gender', value: studentData.gender || 'Not specified' },
    { icon: Calendar, label: 'Date of Birth', value: studentData.date_of_birth ? format(new Date(studentData.date_of_birth), 'MMMM d, yyyy') : 'Not provided' },
    { icon: User, label: "Father's Name", value: studentData.father_name || 'Not provided' },
    { icon: User, label: "Mother's Name", value: studentData.mother_name || 'Not provided' },
    { icon: Phone, label: 'Guardian Contact', value: studentData.guardian_contact || 'Not provided' },
    { icon: Calendar, label: 'Enrollment Date', value: studentData.enrollment_date ? format(new Date(studentData.enrollment_date), 'MMMM d, yyyy') : 'Not provided' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="My Profile" description="View and request changes to your profile">
        <Button onClick={openEditDialog} disabled={hasPendingRequest} className="gap-2">
          <Edit className="h-4 w-4" />{hasPendingRequest ? 'Update Pending' : 'Request Update'}
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent h-32" />
          <CardContent className="pt-8 pb-6 flex flex-col items-center relative">
            <Avatar className="h-28 w-28 border-4 border-background shadow-xl">
              {studentData.avatar_url ? <AvatarImage src={studentData.avatar_url} alt={studentData.first_name} /> : (
                <AvatarFallback className="text-3xl bg-primary text-primary-foreground">{studentData.first_name?.charAt(0)}{studentData.last_name?.charAt(0)}</AvatarFallback>
              )}
            </Avatar>
            <h2 className="text-xl font-bold mt-4">{studentData.first_name} {studentData.last_name}</h2>
            <p className="text-muted-foreground">{studentData.email}</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Badge variant="secondary" className={cn(studentData.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>{studentData.status}</Badge>
            </div>
            <div className="w-full mt-6 pt-6 border-t space-y-2">
              {studentData.city && <p className="text-sm text-muted-foreground">📍 {studentData.city}{studentData.state ? `, ${studentData.state}` : ''}</p>}
              {studentData.course && <p className="text-sm text-muted-foreground">📚 {studentData.course}{studentData.semester ? ` - ${studentData.semester}` : ''}</p>}
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" /><span>Member since {format(new Date(studentData.created_at), 'MMMM yyyy')}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" />Personal Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {profileFields.map((field, index) => (
                <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><field.icon className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm text-muted-foreground">{field.label}</p><p className="font-medium truncate">{field.value}</p></div>
                </div>
              ))}
            </div>
            {studentData.address && (
              <div className="mt-6 pt-6 border-t"><h3 className="font-semibold mb-4">Address</h3><div className="p-4 rounded-lg bg-muted/50 border"><p className="font-medium">{studentData.address}</p></div></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Request Notice */}
      {hasPendingRequest && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-start gap-4 py-4">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0"><Clock className="h-5 w-5 text-warning" /></div>
            <div><p className="font-medium">Profile Update Pending</p><p className="text-sm text-muted-foreground">Your profile update request is awaiting admin approval. Changes will reflect once approved.</p></div>
          </CardContent>
        </Card>
      )}

      <Card className="border-info/30 bg-info/5">
        <CardContent className="flex items-start gap-4 py-4">
          <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0"><Shield className="h-5 w-5 text-info" /></div>
          <div><p className="font-medium">Profile Changes Need Approval</p><p className="text-sm text-muted-foreground">Any profile updates you request must be approved by the admin before they take effect.</p></div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Request Profile Update</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Changes will be sent to admin for approval.</p>
          <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid gap-2"><Label>Phone</Label><Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Father's Name</Label><Input value={editForm.father_name} onChange={e => setEditForm(p => ({ ...p, father_name: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Mother's Name</Label><Input value={editForm.mother_name} onChange={e => setEditForm(p => ({ ...p, mother_name: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Guardian Contact</Label><Input value={editForm.guardian_contact} onChange={e => setEditForm(p => ({ ...p, guardian_contact: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Gender</Label>
              <Select value={editForm.gender} onValueChange={v => setEditForm(p => ({ ...p, gender: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select>
            </div>
            <div className="grid gap-2"><Label>Address</Label><Input value={editForm.address} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>City</Label><Input value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>State</Label><Input value={editForm.state} onChange={e => setEditForm(p => ({ ...p, state: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button><Button onClick={handleSubmitRequest}>Submit for Approval</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
