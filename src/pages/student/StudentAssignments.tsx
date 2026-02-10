import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAssignments } from '@/hooks/useAssignments';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Upload, Download, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { StatCard } from '@/components/ui/stat-card';
import { toast } from 'sonner';

export default function StudentAssignments() {
  const { user } = useAuth();
  const { assignments, submissions, loading, submitAssignment } = useAssignments();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [submitDialog, setSubmitDialog] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    async function init() {
      if (!user) return;
      const { data } = await supabase.from('students').select('id').eq('user_id', user.id).maybeSingle();
      if (data) setStudentId(data.id);
    }
    init();
  }, [user]);

  const mySubmissions = submissions.filter(s => s.student_id === studentId);
  const submittedIds = new Set(mySubmissions.map(s => s.assignment_id));
  const pendingAssignments = assignments.filter(a => !submittedIds.has(a.id) && a.status === 'active');
  const gradedSubmissions = mySubmissions.filter(s => s.status === 'graded');

  const handleSubmit = async () => {
    if (!submitDialog || !studentId) return;
    let file_url, file_name;
    if (file) {
      const path = `${studentId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('assignment-submissions').upload(path, file);
      if (error) { toast.error('File upload failed'); return; }
      const { data: urlData } = supabase.storage.from('assignment-submissions').getPublicUrl(path);
      file_url = urlData.publicUrl;
      file_name = file.name;
    }
    const success = await submitAssignment({ assignment_id: submitDialog, student_id: studentId, file_url, file_name, submission_text: submissionText });
    if (success) { setSubmitDialog(null); setSubmissionText(''); setFile(null); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="My Assignments" description="View assignments, submit work, and check grades" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Pending" value={pendingAssignments.length} icon={Clock} variant="warning" />
        <StatCard title="Submitted" value={mySubmissions.length} icon={Upload} variant="info" />
        <StatCard title="Graded" value={gradedSubmissions.length} icon={CheckCircle2} variant="success" />
      </div>

      <Tabs defaultValue="pending">
        <TabsList><TabsTrigger value="pending">Pending ({pendingAssignments.length})</TabsTrigger><TabsTrigger value="submitted">Submitted</TabsTrigger><TabsTrigger value="graded">Graded</TabsTrigger></TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingAssignments.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No pending assignments 🎉</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {pendingAssignments.map(a => (
                <Card key={a.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><FileText className="h-5 w-5 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{a.title}</h3>
                        <p className="text-sm text-muted-foreground">{a.courses?.course_name}</p>
                        {a.description && <p className="text-sm mt-1 line-clamp-2">{a.description}</p>}
                        <div className="flex items-center gap-2 mt-3">
                          <Badge variant={new Date(a.due_date) < new Date() ? 'destructive' : 'secondary'}>Due: {format(new Date(a.due_date), 'MMM d, yyyy')}</Badge>
                          <Badge variant="outline">{a.max_marks} marks</Badge>
                        </div>
                        <div className="flex gap-2 mt-3">
                          {a.file_url && <Button size="sm" variant="outline" asChild className="gap-1"><a href={a.file_url} target="_blank"><Download className="h-3 w-3" />Download</a></Button>}
                          <Button size="sm" className="gap-1" onClick={() => setSubmitDialog(a.id)} disabled={new Date(a.due_date) < new Date()}><Upload className="h-3 w-3" />Submit</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submitted" className="space-y-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Assignment</TableHead><TableHead>Submitted</TableHead><TableHead>Status</TableHead><TableHead>File</TableHead></TableRow></TableHeader>
              <TableBody>
                {mySubmissions.filter(s => s.status === 'submitted').length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No pending submissions</TableCell></TableRow>
                ) : mySubmissions.filter(s => s.status === 'submitted').map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.assignments?.title}</TableCell>
                    <TableCell>{format(new Date(s.submitted_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell><Badge variant="secondary">Pending Review</Badge></TableCell>
                    <TableCell>{s.file_url && <Button size="icon" variant="ghost" asChild><a href={s.file_url} target="_blank"><Download className="h-4 w-4" /></a></Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="graded" className="space-y-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Assignment</TableHead><TableHead>Marks</TableHead><TableHead>Feedback</TableHead><TableHead>Graded</TableHead></TableRow></TableHeader>
              <TableBody>
                {gradedSubmissions.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No graded submissions yet</TableCell></TableRow>
                ) : gradedSubmissions.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.assignments?.title}</TableCell>
                    <TableCell><Badge>{s.marks}</Badge></TableCell>
                    <TableCell className="max-w-xs truncate">{s.feedback || '-'}</TableCell>
                    <TableCell>{s.graded_at ? format(new Date(s.graded_at), 'MMM d, yyyy') : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Submit Dialog */}
      <Dialog open={!!submitDialog} onOpenChange={() => setSubmitDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>Submit Assignment</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label>Notes (optional)</Label><Textarea value={submissionText} onChange={e => setSubmissionText(e.target.value)} placeholder="Any notes for your submission..." /></div>
            <div className="grid gap-2"><Label>File (PDF/DOC)</Label><Input type="file" accept=".pdf,.doc,.docx" onChange={e => setFile(e.target.files?.[0] || null)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setSubmitDialog(null)}>Cancel</Button><Button onClick={handleSubmit}>Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
