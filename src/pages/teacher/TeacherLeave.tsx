import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { StatCard } from '@/components/ui/stat-card';

export default function TeacherLeave() {
  const { leaveRequests, loading, reviewLeave } = useLeaveRequests();
  const [reviewDialog, setReviewDialog] = useState<{ id: string; action: 'approved' | 'rejected' } | null>(null);
  const [remarks, setRemarks] = useState('');

  const pending = leaveRequests.filter(r => r.status === 'pending');
  const processed = leaveRequests.filter(r => r.status !== 'pending');

  const handleReview = async () => {
    if (!reviewDialog) return;
    await reviewLeave(reviewDialog.id, reviewDialog.action, remarks);
    setReviewDialog(null);
    setRemarks('');
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Leave Requests" description="Review and manage student leave requests" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Pending" value={pending.length} icon={Clock} variant="warning" />
        <StatCard title="Approved" value={leaveRequests.filter(r => r.status === 'approved').length} icon={CheckCircle2} variant="success" />
        <StatCard title="Rejected" value={leaveRequests.filter(r => r.status === 'rejected').length} icon={XCircle} variant="destructive" />
      </div>

      <Tabs defaultValue="pending">
        <TabsList><TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger><TabsTrigger value="processed">Processed ({processed.length})</TabsTrigger></TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Reason</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {pending.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No pending requests</TableCell></TableRow>
                ) : pending.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.students?.first_name} {r.students?.last_name}</TableCell>
                    <TableCell><Badge variant="outline">{r.leave_type}</Badge></TableCell>
                    <TableCell>{format(new Date(r.start_date), 'MMM d')}</TableCell>
                    <TableCell>{format(new Date(r.end_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="max-w-xs truncate">{r.reason}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => setReviewDialog({ id: r.id, action: 'approved' })}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => setReviewDialog({ id: r.id, action: 'rejected' })}>Reject</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="processed" className="space-y-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Status</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
              <TableBody>
                {processed.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No processed requests</TableCell></TableRow>
                ) : processed.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.students?.first_name} {r.students?.last_name}</TableCell>
                    <TableCell><Badge variant="outline">{r.leave_type}</Badge></TableCell>
                    <TableCell>{format(new Date(r.start_date), 'MMM d')}</TableCell>
                    <TableCell>{format(new Date(r.end_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell><Badge variant={r.status === 'approved' ? 'default' : 'destructive'}>{r.status}</Badge></TableCell>
                    <TableCell className="max-w-xs truncate">{r.remarks || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent><DialogHeader><DialogTitle>{reviewDialog?.action === 'approved' ? 'Approve' : 'Reject'} Leave Request</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label>Remarks (optional)</Label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add remarks..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button><Button variant={reviewDialog?.action === 'approved' ? 'default' : 'destructive'} onClick={handleReview}>{reviewDialog?.action === 'approved' ? 'Approve' : 'Reject'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
