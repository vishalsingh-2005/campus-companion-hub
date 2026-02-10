import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProfileUpdateRequests } from '@/hooks/useProfileUpdateRequests';
import { Skeleton } from '@/components/ui/skeleton';
import { UserCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { StatCard } from '@/components/ui/stat-card';

export default function ProfileApprovals() {
  const { requests, loading, reviewRequest } = useProfileUpdateRequests();
  const [reviewDialog, setReviewDialog] = useState<{ id: string; action: 'approved' | 'rejected' } | null>(null);
  const [notes, setNotes] = useState('');
  const [viewChanges, setViewChanges] = useState<Record<string, string> | null>(null);

  const pending = requests.filter(r => r.status === 'pending');

  const handleReview = async () => {
    if (!reviewDialog) return;
    await reviewRequest(reviewDialog.id, reviewDialog.action, notes);
    setReviewDialog(null);
    setNotes('');
  };

  const fieldLabels: Record<string, string> = {
    father_name: "Father's Name", mother_name: "Mother's Name", guardian_contact: 'Guardian Contact',
    date_of_birth: 'Date of Birth', gender: 'Gender', address: 'Address', city: 'City',
    state: 'State', course: 'Course', semester: 'Semester', phone: 'Phone',
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Profile Update Approvals" description="Review student profile change requests" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Pending" value={pending.length} icon={Clock} variant="warning" />
        <StatCard title="Approved" value={requests.filter(r => r.status === 'approved').length} icon={CheckCircle2} variant="success" />
        <StatCard title="Rejected" value={requests.filter(r => r.status === 'rejected').length} icon={XCircle} variant="destructive" />
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Roll No</TableHead><TableHead>Changes</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No profile update requests</TableCell></TableRow>
            ) : requests.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.students?.first_name} {r.students?.last_name}</TableCell>
                <TableCell>{r.students?.student_id}</TableCell>
                <TableCell>
                  <Button size="sm" variant="link" className="p-0 h-auto" onClick={() => setViewChanges(r.requested_changes)}>
                    {Object.keys(r.requested_changes).length} field(s)
                  </Button>
                </TableCell>
                <TableCell>{format(new Date(r.created_at), 'MMM d, yyyy')}</TableCell>
                <TableCell><Badge variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}>{r.status}</Badge></TableCell>
                <TableCell>
                  {r.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => setReviewDialog({ id: r.id, action: 'approved' })}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => setReviewDialog({ id: r.id, action: 'rejected' })}>Reject</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      {/* View Changes Dialog */}
      <Dialog open={!!viewChanges} onOpenChange={() => setViewChanges(null)}>
        <DialogContent><DialogHeader><DialogTitle>Requested Changes</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {viewChanges && Object.entries(viewChanges).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center p-3 rounded-lg bg-muted/50 border">
                <span className="text-sm font-medium text-muted-foreground">{fieldLabels[key] || key}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>{reviewDialog?.action === 'approved' ? 'Approve' : 'Reject'} Profile Update</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label>Admin Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button><Button variant={reviewDialog?.action === 'approved' ? 'default' : 'destructive'} onClick={handleReview}>{reviewDialog?.action === 'approved' ? 'Approve & Apply' : 'Reject'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
