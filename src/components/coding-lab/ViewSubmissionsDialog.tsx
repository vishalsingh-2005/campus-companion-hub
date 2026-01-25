import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLabSubmissions, Submission } from '@/hooks/useCodingLabs';
import { Loader2, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface ViewSubmissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labId: string;
  labTitle: string;
}

export function ViewSubmissionsDialog({
  open,
  onOpenChange,
  labId,
  labTitle,
}: ViewSubmissionsDialogProps) {
  const { submissions, loading, fetchSubmissions } = useLabSubmissions(
    open ? labId : null
  );

  useEffect(() => {
    if (open && labId) {
      fetchSubmissions();
    }
  }, [open, labId]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { class: string; icon: any }> = {
      accepted: { class: 'bg-success/10 text-success', icon: CheckCircle2 },
      wrong_answer: { class: 'bg-destructive/10 text-destructive', icon: XCircle },
      time_limit: { class: 'bg-warning/10 text-warning', icon: Clock },
      memory_limit: { class: 'bg-warning/10 text-warning', icon: Clock },
      runtime_error: { class: 'bg-destructive/10 text-destructive', icon: XCircle },
      compile_error: { class: 'bg-destructive/10 text-destructive', icon: XCircle },
      pending: { class: 'bg-muted text-muted-foreground', icon: Clock },
      running: { class: 'bg-primary/10 text-primary', icon: Clock },
    };
    const v = variants[status] || { class: 'bg-muted text-muted-foreground', icon: Clock };
    const Icon = v.icon;
    return (
      <Badge className={v.class}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  // Group submissions by student
  const submissionsByStudent = submissions.reduce((acc, sub) => {
    const key = sub.student_id;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(sub);
    return acc;
  }, {} as Record<string, Submission[]>);

  // Get best submission for each student
  const bestSubmissions = Object.values(submissionsByStudent).map((subs) => {
    return subs.reduce((best, current) => {
      if (!best || current.score > best.score) return current;
      return best;
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Submissions - {labTitle}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({bestSubmissions.length} students, {submissions.length} total submissions)
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No submissions yet.
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Test Cases</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {sub.students?.first_name} {sub.students?.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {sub.students?.student_id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {sub.language.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell>
                      <span className="font-medium">{sub.score.toFixed(0)}%</span>
                    </TableCell>
                    <TableCell>
                      {sub.passed_test_cases}/{sub.total_test_cases}
                    </TableCell>
                    <TableCell className="text-sm">
                      {sub.execution_time_ms ? `${sub.execution_time_ms}ms` : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(sub.submitted_at), 'MMM d, h:mm a')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
