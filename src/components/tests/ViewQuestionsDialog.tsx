import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, CheckCircle2 } from 'lucide-react';

interface Question {
  id: string;
  question_type: 'mcq' | 'true_false' | 'short_answer';
  question_text: string;
  options: Array<{ id: string; text: string }> | null;
  correct_answer: string;
  marks: number;
  order_index: number;
}

interface ViewQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  testTitle: string;
}

export function ViewQuestionsDialog({
  open,
  onOpenChange,
  testId,
  testTitle,
}: ViewQuestionsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);

  const fetchQuestions = async () => {
    if (!testId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('test_questions')
        .select('*')
        .eq('test_id', testId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setQuestions((data || []).map(q => ({
        ...q,
        options: q.options as Array<{ id: string; text: string }> | null
      })) as Question[]);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && testId) {
      fetchQuestions();
    }
  }, [open, testId]);

  const handleDelete = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('test_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      toast({
        title: 'Question Deleted',
        description: 'The question has been removed',
      });

      fetchQuestions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete question',
        variant: 'destructive',
      });
    }
  };

  const getQuestionTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; class: string }> = {
      mcq: { label: 'MCQ', class: 'bg-blue-500/10 text-blue-500' },
      true_false: { label: 'True/False', class: 'bg-orange-500/10 text-orange-500' },
      short_answer: { label: 'Short Answer', class: 'bg-green-500/10 text-green-500' },
    };
    return variants[type] || { label: type, class: 'bg-muted text-muted-foreground' };
  };

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Questions - {testTitle}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({questions.length} questions, {totalMarks} marks)
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No questions added yet. Add questions using the "+" button.
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {questions.map((question, index) => {
                const badge = getQuestionTypeBadge(question.question_type);
                return (
                  <Card key={question.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">Q{index + 1}.</span>
                            <Badge className={badge.class}>{badge.label}</Badge>
                            <Badge variant="outline">{question.marks} marks</Badge>
                          </div>
                          <p className="text-sm mb-3">{question.question_text}</p>

                          {question.question_type === 'mcq' && question.options && (
                            <div className="space-y-1 text-sm">
                              {question.options.map((option) => (
                                <div
                                  key={option.id}
                                  className={`flex items-center gap-2 p-2 rounded ${
                                    option.id === question.correct_answer
                                      ? 'bg-success/10 text-success'
                                      : 'text-muted-foreground'
                                  }`}
                                >
                                  {option.id === question.correct_answer && (
                                    <CheckCircle2 className="h-4 w-4" />
                                  )}
                                  <span>{option.text}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {question.question_type === 'true_false' && (
                            <div className="text-sm text-success flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              Correct Answer: {question.correct_answer === 'true' ? 'True' : 'False'}
                            </div>
                          )}

                          {question.question_type === 'short_answer' && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Expected:</span> {question.correct_answer}
                            </div>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(question.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
