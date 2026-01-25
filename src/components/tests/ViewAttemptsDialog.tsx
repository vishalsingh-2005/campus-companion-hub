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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, MapPin, Camera, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface Attempt {
  id: string;
  started_at: string;
  submitted_at: string | null;
  status: string;
  total_marks_obtained: number | null;
  tab_switch_count: number;
  warning_count: number;
  was_auto_submitted: boolean;
  start_latitude: number | null;
  start_longitude: number | null;
  start_selfie_url: string | null;
  students: {
    first_name: string;
    last_name: string;
    student_id: string;
  };
}

interface ViewAttemptsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  testTitle: string;
}

export function ViewAttemptsDialog({
  open,
  onOpenChange,
  testId,
  testTitle,
}: ViewAttemptsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const fetchAttempts = async () => {
    if (!testId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('test_attempts')
        .select(`
          id,
          started_at,
          submitted_at,
          status,
          total_marks_obtained,
          tab_switch_count,
          warning_count,
          was_auto_submitted,
          start_latitude,
          start_longitude,
          start_selfie_url,
          students (
            first_name,
            last_name,
            student_id
          )
        `)
        .eq('test_id', testId)
        .order('started_at', { ascending: false });

      if (error) throw error;
      setAttempts(data as unknown as Attempt[] || []);
    } catch (error) {
      console.error('Error fetching attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && testId) {
      fetchAttempts();
    }
  }, [open, testId]);

  const getStatusBadge = (status: string, wasAutoSubmitted: boolean) => {
    if (wasAutoSubmitted) {
      return { label: 'Auto-submitted', class: 'bg-warning/10 text-warning' };
    }
    const variants: Record<string, { label: string; class: string }> = {
      in_progress: { label: 'In Progress', class: 'bg-blue-500/10 text-blue-500' },
      submitted: { label: 'Submitted', class: 'bg-success/10 text-success' },
      auto_submitted: { label: 'Auto-submitted', class: 'bg-warning/10 text-warning' },
    };
    return variants[status] || { label: status, class: 'bg-muted text-muted-foreground' };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Student Attempts - {testTitle}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({attempts.length} attempts)
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : attempts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No students have attempted this test yet.
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Violations</TableHead>
                  <TableHead>Proctoring</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((attempt) => {
                  const status = getStatusBadge(attempt.status, attempt.was_auto_submitted);
                  return (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {attempt.students.first_name} {attempt.students.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {attempt.students.student_id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(attempt.started_at), 'MMM d, h:mm a')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {attempt.submitted_at
                          ? format(new Date(attempt.submitted_at), 'MMM d, h:mm a')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={status.class}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {attempt.total_marks_obtained !== null
                          ? attempt.total_marks_obtained
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {(attempt.tab_switch_count > 0 || attempt.warning_count > 0) && (
                          <div className="flex items-center gap-1 text-warning">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">
                              {attempt.tab_switch_count} switches
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {attempt.start_latitude && attempt.start_longitude && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title={`Location: ${attempt.start_latitude}, ${attempt.start_longitude}`}
                              onClick={() => {
                                window.open(
                                  `https://www.google.com/maps?q=${attempt.start_latitude},${attempt.start_longitude}`,
                                  '_blank'
                                );
                              }}
                            >
                              <MapPin className="h-4 w-4 text-success" />
                            </Button>
                          )}
                          {attempt.start_selfie_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View selfie"
                              onClick={() => {
                                window.open(attempt.start_selfie_url!, '_blank');
                              }}
                            >
                              <Camera className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
