import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
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
import {
  Loader2,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Eye,
  Flag,
  Shield,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PlagiarismRecord {
  id: string;
  similarity_score: number;
  matching_lines: number | null;
  flagged: boolean;
  detected_at: string;
  review_notes: string | null;
  submission_1: {
    id: string;
    source_code: string;
    language: string;
    students: { first_name: string; last_name: string; student_id: string } | null;
  } | null;
  submission_2: {
    id: string;
    source_code: string;
    language: string;
    students: { first_name: string; last_name: string; student_id: string } | null;
  } | null;
}

interface PlagiarismDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labId: string;
  labTitle: string;
}

export function PlagiarismDialog({
  open,
  onOpenChange,
  labId,
  labTitle,
}: PlagiarismDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [records, setRecords] = useState<PlagiarismRecord[]>([]);
  const [viewingCode, setViewingCode] = useState<{
    code1: string;
    code2: string;
    student1: string;
    student2: string;
  } | null>(null);

  const fetchRecords = async () => {
    if (!labId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coding_lab_plagiarism')
        .select(`
          id,
          similarity_score,
          matching_lines,
          flagged,
          detected_at,
          review_notes,
          submission_1:coding_lab_submissions!coding_lab_plagiarism_submission_1_id_fkey (
            id,
            source_code,
            language,
            students (first_name, last_name, student_id)
          ),
          submission_2:coding_lab_submissions!coding_lab_plagiarism_submission_2_id_fkey (
            id,
            source_code,
            language,
            students (first_name, last_name, student_id)
          )
        `)
        .eq('lab_id', labId)
        .order('similarity_score', { ascending: false });

      if (error) throw error;
      setRecords((data || []) as unknown as PlagiarismRecord[]);
    } catch (error) {
      console.error('Error fetching plagiarism records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && labId) {
      fetchRecords();
    }
  }, [open, labId]);

  const runPlagiarismCheck = async () => {
    setRunning(true);

    try {
      const { data, error } = await supabase.functions.invoke('check-plagiarism', {
        body: { labId, threshold: 40 },
      });

      if (error) throw error;

      toast({
        title: 'Plagiarism Check Complete',
        description: `Analyzed ${data.comparisons} pairs. Found ${data.potentialMatches} potential matches (${data.flagged} flagged).`,
      });

      await fetchRecords();
    } catch (error: any) {
      console.error('Error running plagiarism check:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to run plagiarism check',
        variant: 'destructive',
      });
    } finally {
      setRunning(false);
    }
  };

  const toggleFlag = async (recordId: string, currentFlagged: boolean) => {
    try {
      const { error } = await supabase
        .from('coding_lab_plagiarism')
        .update({ flagged: !currentFlagged })
        .eq('id', recordId);

      if (error) throw error;

      setRecords(prev =>
        prev.map(r =>
          r.id === recordId ? { ...r, flagged: !currentFlagged } : r
        )
      );

      toast({
        title: currentFlagged ? 'Unflagged' : 'Flagged',
        description: currentFlagged
          ? 'Removed plagiarism flag'
          : 'Marked as potential plagiarism',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update flag',
        variant: 'destructive',
      });
    }
  };

  const getSeverityBadge = (score: number) => {
    if (score >= 80) {
      return (
        <Badge className="bg-destructive/10 text-destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          High ({score.toFixed(0)}%)
        </Badge>
      );
    }
    if (score >= 60) {
      return (
        <Badge className="bg-warning/10 text-warning">
          Medium ({score.toFixed(0)}%)
        </Badge>
      );
    }
    return (
      <Badge className="bg-muted text-muted-foreground">
        Low ({score.toFixed(0)}%)
      </Badge>
    );
  };

  const flaggedCount = records.filter(r => r.flagged).length;
  const highSimilarityCount = records.filter(r => r.similarity_score >= 70).length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Plagiarism Detection - {labTitle}
            </DialogTitle>
            <DialogDescription>
              Analyze code submissions for potential plagiarism using text similarity
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Stats and Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Total matches:</span>{' '}
                  <span className="font-medium">{records.length}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Flagged:</span>{' '}
                  <span className="font-medium text-destructive">{flaggedCount}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">High similarity:</span>{' '}
                  <span className="font-medium text-warning">{highSimilarityCount}</span>
                </div>
              </div>

              <Button onClick={runPlagiarismCheck} disabled={running}>
                {running ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {running ? 'Analyzing...' : 'Run Analysis'}
              </Button>
            </div>

            {/* Results Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : records.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-success mb-4" />
                  <h3 className="text-lg font-medium">No Plagiarism Detected</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Click "Run Analysis" to check for similarities
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student 1</TableHead>
                      <TableHead>Student 2</TableHead>
                      <TableHead>Similarity</TableHead>
                      <TableHead>Matching Lines</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow
                        key={record.id}
                        className={cn(record.flagged && 'bg-destructive/5')}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {record.submission_1?.students?.first_name}{' '}
                              {record.submission_1?.students?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {record.submission_1?.students?.student_id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {record.submission_2?.students?.first_name}{' '}
                              {record.submission_2?.students?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {record.submission_2?.students?.student_id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={record.similarity_score}
                              className={cn(
                                'w-16 h-2',
                                record.similarity_score >= 70
                                  ? '[&>div]:bg-destructive'
                                  : record.similarity_score >= 50
                                  ? '[&>div]:bg-warning'
                                  : '[&>div]:bg-muted-foreground'
                              )}
                            />
                            {getSeverityBadge(record.similarity_score)}
                          </div>
                        </TableCell>
                        <TableCell>{record.matching_lines || '-'}</TableCell>
                        <TableCell>
                          {record.flagged ? (
                            <Badge className="bg-destructive/10 text-destructive">
                              <Flag className="h-3 w-3 mr-1" />
                              Flagged
                            </Badge>
                          ) : (
                            <Badge variant="outline">Reviewed</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setViewingCode({
                                  code1: record.submission_1?.source_code || '',
                                  code2: record.submission_2?.source_code || '',
                                  student1: `${record.submission_1?.students?.first_name} ${record.submission_1?.students?.last_name}`,
                                  student2: `${record.submission_2?.students?.first_name} ${record.submission_2?.students?.last_name}`,
                                })
                              }
                              title="Compare Code"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleFlag(record.id, record.flagged)}
                              title={record.flagged ? 'Remove Flag' : 'Flag as Plagiarism'}
                              className={record.flagged ? 'text-destructive' : ''}
                            >
                              <Flag className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Code Comparison Dialog */}
      <Dialog open={!!viewingCode} onOpenChange={() => setViewingCode(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Code Comparison</DialogTitle>
            <DialogDescription>
              Comparing submissions side by side
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="font-medium text-sm mb-2 flex items-center justify-between">
                <span>{viewingCode?.student1}</span>
                <Badge variant="outline">Student 1</Badge>
              </div>
              <ScrollArea className="h-[500px] border rounded-lg bg-muted/30">
                <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                  {viewingCode?.code1}
                </pre>
              </ScrollArea>
            </div>
            <div>
              <div className="font-medium text-sm mb-2 flex items-center justify-between">
                <span>{viewingCode?.student2}</span>
                <Badge variant="outline">Student 2</Badge>
              </div>
              <ScrollArea className="h-[500px] border rounded-lg bg-muted/30">
                <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                  {viewingCode?.code2}
                </pre>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
