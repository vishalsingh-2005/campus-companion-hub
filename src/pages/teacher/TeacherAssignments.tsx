import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAssignments } from '@/hooks/useAssignments';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FileText, Upload, Download, Star, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { StatCard } from '@/components/ui/stat-card';
import { toast } from 'sonner';

export default function TeacherAssignments() {
  const { user } = useAuth();
  const { assignments, submissions, loading, createAssignment, deleteAssignment, gradeSubmission } = useAssignments();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [courses, setCourses] = useState<{ id: string; course_name: string; course_code: string }[]>([]);
  const [createDialog, setCreateDialog] = useState(false);
  const [gradeDialog, setGradeDialog] = useState<string | null>(null);
  const [form, setForm] = useState({ course_id: '', title: '', description: '', due_date: '', max_marks: 100 });
  const [gradeForm, setGradeForm] = useState({ marks: 0, feedback: '' });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    async function init() {
      if (!user) return;
      const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
      if (teacher) {
        setTeacherId(teacher.id);
        const { data: c } = await supabase.from('courses').select('id, course_name, course_code').eq('teacher_id', teacher.id);
        setCourses(c || []);
      }
    }
    init();
  }, [user]);

  const myAssignments = assignments.filter(a => a.teacher_id === teacherId);
  const mySubmissions = submissions.filter(s => myAssignments.some(a => a.id === s.assignment_id));

  const handleCreate = async () => {
    if (!form.title || !form.course_id || !form.due_date || !teacherId) { toast.error('Fill all required fields'); return; }
    let file_url, file_name;
    if (file) {
      const path = `${teacherId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('assignments').upload(path, file);
      if (error) { toast.error('File upload failed'); return; }
      const { data: urlData } = supabase.storage.from('assignments').getPublicUrl(path);
      file_url = urlData.publicUrl;
      file_name = file.name;
    }
    const success = await createAssignment({ ...form, teacher_id: teacherId, file_url, file_name });
    if (success) { setCreateDialog(false); setForm({ course_id: '', title: '', description: '', due_date: '', max_marks: 100 }); setFile(null); }
  };

  const handleGrade = async () => {
    if (!gradeDialog) return;
    await gradeSubmission(gradeDialog, gradeForm.marks, gradeForm.feedback);
    setGradeDialog(null);
    setGradeForm({ marks: 0, feedback: '' });
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Assignment Management" description="Upload assignments and grade submissions">
        <Button onClick={() => setCreateDialog(true)} className="gap-2"><Plus className="h-4 w-4" />Create Assignment</Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Assignments" value={myAssignments.length} icon={FileText} />
        <StatCard title="Submissions" value={mySubmissions.length} icon={Upload} variant="info" />
        <StatCard title="Pending Grading" value={mySubmissions.filter(s => s.status === 'submitted').length} icon={Star} variant="warning" />
      </div>

      <Tabs defaultValue="assignments">
        <TabsList><TabsTrigger value="assignments">Assignments</TabsTrigger><TabsTrigger value="submissions">Submissions ({mySubmissions.length})</TabsTrigger></TabsList>

        <TabsContent value="assignments" className="space-y-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Course</TableHead><TableHead>Due Date</TableHead><TableHead>Max Marks</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {myAssignments.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No assignments created yet</TableCell></TableRow>
                ) : myAssignments.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell>{a.courses?.course_name}</TableCell>
                    <TableCell><Badge variant={new Date(a.due_date) < new Date() ? 'destructive' : 'default'}>{format(new Date(a.due_date), 'MMM d, yyyy')}</Badge></TableCell>
                    <TableCell>{a.max_marks}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {a.file_url && <Button size="icon" variant="ghost" asChild><a href={a.file_url} target="_blank"><Download className="h-4 w-4" /></a></Button>}
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteAssignment(a.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Assignment</TableHead><TableHead>Student</TableHead><TableHead>Submitted</TableHead><TableHead>Status</TableHead><TableHead>Marks</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {mySubmissions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No submissions yet</TableCell></TableRow>
                ) : mySubmissions.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.assignments?.title}</TableCell>
                    <TableCell>{s.students?.first_name} {s.students?.last_name}</TableCell>
                    <TableCell>{format(new Date(s.submitted_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell><Badge variant={s.status === 'graded' ? 'default' : 'secondary'}>{s.status}</Badge></TableCell>
                    <TableCell>{s.marks ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {s.file_url && <Button size="icon" variant="ghost" asChild><a href={s.file_url} target="_blank"><Download className="h-4 w-4" /></a></Button>}
                        {s.status !== 'graded' && <Button size="sm" variant="outline" onClick={() => { setGradeDialog(s.id); setGradeForm({ marks: 0, feedback: '' }); }}>Grade</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Create Assignment Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent><DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label>Course *</Label><Select value={form.course_id} onValueChange={v => setForm(p => ({ ...p, course_id: v }))}><SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger><SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.course_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Due Date *</Label><Input type="datetime-local" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Max Marks</Label><Input type="number" value={form.max_marks} onChange={e => setForm(p => ({ ...p, max_marks: parseInt(e.target.value) || 100 }))} /></div>
            </div>
            <div className="grid gap-2"><Label>Attachment (PDF/DOC)</Label><Input type="file" accept=".pdf,.doc,.docx" onChange={e => setFile(e.target.files?.[0] || null)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button><Button onClick={handleCreate}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grade Dialog */}
      <Dialog open={!!gradeDialog} onOpenChange={() => setGradeDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>Grade Submission</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label>Marks</Label><Input type="number" value={gradeForm.marks} onChange={e => setGradeForm(p => ({ ...p, marks: parseInt(e.target.value) || 0 }))} /></div>
            <div className="grid gap-2"><Label>Feedback</Label><Textarea value={gradeForm.feedback} onChange={e => setGradeForm(p => ({ ...p, feedback: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setGradeDialog(null)}>Cancel</Button><Button onClick={handleGrade}>Submit Grade</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
