import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { StatCard } from '@/components/ui/stat-card';
import { toast } from 'sonner';

export default function StudentLeave() {
  const { user } = useAuth();
  const { leaveRequests, loading, applyLeave } = useLeaveRequests();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });

  useEffect(() => {
    async function init() {
      if (!user) return;
      const { data } = await supabase.from('students').select('id').eq('user_id', user.id).maybeSingle();
      if (data) setStudentId(data.id);
    }
    init();
  }, [user]);

  const myRequests = leaveRequests.filter(r => r.student_id === studentId);
  const pending = myRequests.filter(r => r.status === 'pending');
  const approved = myRequests.filter(r => r.status === 'approved');
  const rejected = myRequests.filter(r => r.status === 'rejected');

  const handleApply = async () => {
    if (!studentId || !form.start_date || !form.end_date || !form.reason) { toast.error('Fill all fields'); return; }
    const success = await applyLeave({ student_id: studentId, ...form });
    if (success) { setDialog(false); setForm({ leave_type: 'casual', start_date: '', end_date: '', reason: '' }); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Leave Management" description="Apply for leave and track your requests">
        <Button onClick={() => setDialog(true)} className="gap-2"><Plus className="h-4 w-4" />Apply Leave</Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Pending" value={pending.length} icon={Clock} variant="warning" />
        <StatCard title="Approved" value={approved.length} icon={CheckCircle2} variant="success" />
        <StatCard title="Rejected" value={rejected.length} icon={XCircle} variant="destructive" />
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
          <TableBody>
            {myRequests.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No leave requests</TableCell></TableRow>
            ) : myRequests.map(r => (
              <TableRow key={r.id}>
                <TableCell><Badge variant="outline">{r.leave_type}</Badge></TableCell>
                <TableCell>{format(new Date(r.start_date), 'MMM d, yyyy')}</TableCell>
                <TableCell>{format(new Date(r.end_date), 'MMM d, yyyy')}</TableCell>
                <TableCell className="max-w-xs truncate">{r.reason}</TableCell>
                <TableCell><Badge variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'}>{r.status}</Badge></TableCell>
                <TableCell className="max-w-xs truncate">{r.remarks || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent><DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label>Leave Type</Label><Select value={form.leave_type} onValueChange={v => setForm(p => ({ ...p, leave_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="casual">Casual</SelectItem><SelectItem value="sick">Sick</SelectItem><SelectItem value="emergency">Emergency</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2"><Label>Reason *</Label><Textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Provide reason for leave..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button><Button onClick={handleApply}>Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
