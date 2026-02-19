import { useEffect, useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Phone, Calendar, Hash, Shield, Clock, Edit, BookOpen, MapPin, Users, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileUpdateRequests } from '@/hooks/useProfileUpdateRequests';
import { ProfileCompletion } from '@/components/profile/ProfileCompletion';
import { DocumentUpload } from '@/components/profile/DocumentUpload';
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
  blood_group: string | null;
  section: string | null;
  year: string | null;
  admission_type: string | null;
  father_occupation: string | null;
  father_contact: string | null;
  mother_occupation: string | null;
  mother_contact: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  permanent_address: string | null;
  current_address: string | null;
  pin_code: string | null;
}

const REQUIRED_FIELDS = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'gender', label: 'Gender' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'father_name', label: "Father's Name" },
  { key: 'mother_name', label: "Mother's Name" },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'blood_group', label: 'Blood Group' },
  { key: 'guardian_contact', label: 'Guardian Contact' },
];

export default function StudentProfile() {
  const { user } = useAuth();
  const { requests, submitRequest } = useProfileUpdateRequests();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [academic, setAcademic] = useState<{ gpa: string; attendancePct: string; totalCourses: number; totalCredits: number }>({ gpa: 'N/A', attendancePct: 'N/A', totalCourses: 0, totalCredits: 0 });

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        let { data: student } = await supabase.from('students').select('*').eq('user_id', user.id).maybeSingle();

        // Auto-provision student record if none exists
        if (!student) {
          const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
          const nameParts = fullName.trim().split(/\s+/);
          const firstName = nameParts[0] || 'Student';
          const lastName = nameParts.slice(1).join(' ') || '';
          const studentId = `STU-${Date.now().toString(36).toUpperCase()}`;

          const { data: newStudent, error: insertError } = await supabase.from('students').insert({
            user_id: user.id,
            student_id: studentId,
            first_name: firstName,
            last_name: lastName,
            email: user.email || '',
            status: 'active',
            enrollment_date: new Date().toISOString().split('T')[0],
          }).select('*').single();

          if (insertError) {
            console.error('Error creating student profile:', insertError);
          } else {
            student = newStudent;
          }
        }

        setStudentData(student as any);

        if (student) {
          const [resultRes, attRes, enrollRes] = await Promise.all([
            supabase.from('semester_results').select('cgpa').eq('student_id', (student as any).id).order('created_at', { ascending: false }).limit(1),
            supabase.from('attendance').select('status').eq('student_id', (student as any).id),
            supabase.from('course_enrollments').select('courses(credits)').eq('student_id', (student as any).id).eq('status', 'enrolled'),
          ]);
          const gpa = resultRes.data?.[0]?.cgpa || 'N/A';
          const att = attRes.data || [];
          const present = att.filter((a: any) => a.status === 'present').length;
          const pct = att.length > 0 ? ((present / att.length) * 100).toFixed(1) : 'N/A';
          const totalCredits = (enrollRes.data || []).reduce((s: number, e: any) => s + (e.courses?.credits || 0), 0);
          setAcademic({ gpa: String(gpa), attendancePct: pct, totalCourses: enrollRes.data?.length || 0, totalCredits });
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const myRequests = requests.filter(r => r.student_id === studentData?.id);
  const hasPendingRequest = myRequests.some(r => r.status === 'pending');

  const openEditDialog = () => {
    if (!studentData) return;
    setEditForm({
      phone: studentData.phone || '',
      father_name: studentData.father_name || '',
      mother_name: studentData.mother_name || '',
      father_occupation: studentData.father_occupation || '',
      father_contact: studentData.father_contact || '',
      mother_occupation: studentData.mother_occupation || '',
      mother_contact: studentData.mother_contact || '',
      guardian_name: studentData.guardian_name || '',
      guardian_contact: studentData.guardian_contact || '',
      guardian_phone: studentData.guardian_phone || '',
      address: studentData.address || '',
      permanent_address: studentData.permanent_address || '',
      current_address: studentData.current_address || '',
      city: studentData.city || '',
      state: studentData.state || '',
      pin_code: studentData.pin_code || '',
      gender: studentData.gender || '',
      blood_group: studentData.blood_group || '',
    });
    setEditDialog(true);
  };

  const handleSubmitRequest = async () => {
    if (!studentData) return;
    const changes: Record<string, string> = {};
    Object.entries(editForm).forEach(([key, value]) => {
      if (value && value !== ((studentData as any)[key] || '')) {
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

  const InfoField = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-primary" /></div>
      <div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium truncate">{value || 'Not provided'}</p></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="My Profile" description="View and manage your personal information">
        <Button onClick={openEditDialog} disabled={hasPendingRequest} className="gap-2">
          <Edit className="h-4 w-4" />{hasPendingRequest ? 'Update Pending' : 'Request Update'}
        </Button>
      </PageHeader>

      {/* Profile card + completion */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent h-28" />
            <CardContent className="pt-8 pb-6 flex flex-col items-center relative">
              <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                {studentData.avatar_url ? <AvatarImage src={studentData.avatar_url} /> : (
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{studentData.first_name?.charAt(0)}{studentData.last_name?.charAt(0)}</AvatarFallback>
                )}
              </Avatar>
              <h2 className="text-lg font-bold mt-3">{studentData.first_name} {studentData.last_name}</h2>
              <p className="text-sm text-muted-foreground">{studentData.email}</p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                <Badge variant="secondary" className={cn(studentData.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted')}>{studentData.status}</Badge>
                {studentData.course && <Badge variant="outline">{studentData.course}</Badge>}
              </div>
              <div className="w-full mt-5 pt-5 border-t space-y-1.5 text-sm text-muted-foreground">
                {studentData.city && <p>📍 {studentData.city}{studentData.state ? `, ${studentData.state}` : ''}</p>}
                {studentData.semester && <p>📚 Semester {studentData.semester}{studentData.section ? ` · Section ${studentData.section}` : ''}</p>}
                <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /><span>Since {format(new Date(studentData.created_at), 'MMM yyyy')}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-5">
              <ProfileCompletion data={studentData} requiredFields={REQUIRED_FIELDS} />
            </CardContent>
          </Card>
        </div>

        {/* Tabbed content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="basic" className="text-xs">Basic</TabsTrigger>
              <TabsTrigger value="family" className="text-xs">Family</TabsTrigger>
              <TabsTrigger value="address" className="text-xs">Address</TabsTrigger>
              <TabsTrigger value="academic" className="text-xs">Academic</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" />Basic Information</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoField icon={Hash} label="Roll Number" value={studentData.student_id} />
                    <InfoField icon={User} label="Full Name" value={`${studentData.first_name} ${studentData.last_name}`} />
                    <InfoField icon={Mail} label="Email" value={studentData.email} />
                    <InfoField icon={Phone} label="Phone" value={studentData.phone || ''} />
                    <InfoField icon={User} label="Gender" value={studentData.gender || ''} />
                    <InfoField icon={Calendar} label="Date of Birth" value={studentData.date_of_birth ? format(new Date(studentData.date_of_birth), 'MMMM d, yyyy') : ''} />
                    <InfoField icon={Shield} label="Blood Group" value={studentData.blood_group || ''} />
                    <InfoField icon={GraduationCap} label="Section" value={studentData.section || ''} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="family">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Parent / Guardian Details</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoField icon={User} label="Father's Name" value={studentData.father_name || ''} />
                    <InfoField icon={User} label="Father's Occupation" value={studentData.father_occupation || ''} />
                    <InfoField icon={Phone} label="Father's Contact" value={studentData.father_contact || ''} />
                    <InfoField icon={User} label="Mother's Name" value={studentData.mother_name || ''} />
                    <InfoField icon={User} label="Mother's Occupation" value={studentData.mother_occupation || ''} />
                    <InfoField icon={Phone} label="Mother's Contact" value={studentData.mother_contact || ''} />
                    <InfoField icon={User} label="Guardian Name" value={studentData.guardian_name || ''} />
                    <InfoField icon={Phone} label="Guardian Phone" value={studentData.guardian_phone || studentData.guardian_contact || ''} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="address">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Address Details</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoField icon={MapPin} label="Permanent Address" value={studentData.permanent_address || studentData.address || ''} />
                    <InfoField icon={MapPin} label="Current Address" value={studentData.current_address || ''} />
                    <InfoField icon={MapPin} label="City" value={studentData.city || ''} />
                    <InfoField icon={MapPin} label="State" value={studentData.state || ''} />
                    <InfoField icon={Hash} label="PIN Code" value={studentData.pin_code || ''} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="academic">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" />Academic Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoField icon={Calendar} label="Admission Date" value={studentData.enrollment_date ? format(new Date(studentData.enrollment_date), 'MMMM d, yyyy') : ''} />
                    <InfoField icon={GraduationCap} label="Admission Type" value={studentData.admission_type || ''} />
                    <InfoField icon={BookOpen} label="Current GPA" value={academic.gpa} />
                    <InfoField icon={User} label="Attendance" value={academic.attendancePct !== 'N/A' ? `${academic.attendancePct}%` : 'N/A'} />
                    <InfoField icon={BookOpen} label="Courses Enrolled" value={String(academic.totalCourses)} />
                    <InfoField icon={GraduationCap} label="Credits Completed" value={String(academic.totalCredits)} />
                    <InfoField icon={BookOpen} label="Course/Branch" value={studentData.course || ''} />
                    <InfoField icon={GraduationCap} label="Year / Semester" value={`${studentData.year || ''}${studentData.semester ? ` / Sem ${studentData.semester}` : ''}`} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <DocumentUpload studentId={studentData.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Pending Request Notice */}
      {hasPendingRequest && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-start gap-4 py-4">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0"><Clock className="h-5 w-5 text-warning" /></div>
            <div><p className="font-medium">Profile Update Pending</p><p className="text-sm text-muted-foreground">Your request is awaiting admin approval.</p></div>
          </CardContent>
        </Card>
      )}

      <Card className="border-info/30 bg-info/5">
        <CardContent className="flex items-start gap-4 py-4">
          <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0"><Shield className="h-5 w-5 text-info" /></div>
          <div><p className="font-medium">Profile Changes Need Approval</p><p className="text-sm text-muted-foreground">Any profile updates you request must be approved by the admin before they take effect.</p></div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Request Profile Update</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Changes will be sent to admin for approval.</p>
          <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid gap-2"><Label>Phone</Label><Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Gender</Label>
                <Select value={editForm.gender} onValueChange={v => setEditForm(p => ({ ...p, gender: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select>
              </div>
              <div className="grid gap-2"><Label>Blood Group</Label>
                <Select value={editForm.blood_group} onValueChange={v => setEditForm(p => ({ ...p, blood_group: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Father's Name</Label><Input value={editForm.father_name} onChange={e => setEditForm(p => ({ ...p, father_name: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Father's Occupation</Label><Input value={editForm.father_occupation} onChange={e => setEditForm(p => ({ ...p, father_occupation: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2"><Label>Father's Contact</Label><Input value={editForm.father_contact} onChange={e => setEditForm(p => ({ ...p, father_contact: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Mother's Name</Label><Input value={editForm.mother_name} onChange={e => setEditForm(p => ({ ...p, mother_name: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Mother's Occupation</Label><Input value={editForm.mother_occupation} onChange={e => setEditForm(p => ({ ...p, mother_occupation: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2"><Label>Mother's Contact</Label><Input value={editForm.mother_contact} onChange={e => setEditForm(p => ({ ...p, mother_contact: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2"><Label>Guardian Name</Label><Input value={editForm.guardian_name} onChange={e => setEditForm(p => ({ ...p, guardian_name: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Guardian Phone</Label><Input value={editForm.guardian_phone || editForm.guardian_contact} onChange={e => setEditForm(p => ({ ...p, guardian_phone: e.target.value, guardian_contact: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2"><Label>Permanent Address</Label><Input value={editForm.permanent_address || editForm.address} onChange={e => setEditForm(p => ({ ...p, permanent_address: e.target.value, address: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Current Address</Label><Input value={editForm.current_address} onChange={e => setEditForm(p => ({ ...p, current_address: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2"><Label>City</Label><Input value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>State</Label><Input value={editForm.state} onChange={e => setEditForm(p => ({ ...p, state: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>PIN Code</Label><Input value={editForm.pin_code} onChange={e => setEditForm(p => ({ ...p, pin_code: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button><Button onClick={handleSubmitRequest}>Submit for Approval</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
