import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface QuestionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  onSuccess: () => void;
}

interface MCQOption {
  id: string;
  text: string;
}

export function QuestionFormDialog({
  open,
  onOpenChange,
  testId,
  onSuccess,
}: QuestionFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [questionType, setQuestionType] = useState<'mcq' | 'true_false' | 'short_answer'>('mcq');
  const [questionText, setQuestionText] = useState('');
  const [marks, setMarks] = useState(1);
  
  // MCQ specific
  const [options, setOptions] = useState<MCQOption[]>([
    { id: '1', text: '' },
    { id: '2', text: '' },
    { id: '3', text: '' },
    { id: '4', text: '' },
  ]);
  const [correctOption, setCorrectOption] = useState('1');
  
  // True/False specific
  const [trueFalseAnswer, setTrueFalseAnswer] = useState('true');
  
  // Short answer specific
  const [shortAnswer, setShortAnswer] = useState('');

  const resetForm = () => {
    setQuestionType('mcq');
    setQuestionText('');
    setMarks(1);
    setOptions([
      { id: '1', text: '' },
      { id: '2', text: '' },
      { id: '3', text: '' },
      { id: '4', text: '' },
    ]);
    setCorrectOption('1');
    setTrueFalseAnswer('true');
    setShortAnswer('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let correctAnswer = '';
      let optionsJson = null;

      if (questionType === 'mcq') {
        correctAnswer = correctOption;
        optionsJson = options.filter(o => o.text.trim());
      } else if (questionType === 'true_false') {
        correctAnswer = trueFalseAnswer;
      } else {
        correctAnswer = shortAnswer;
      }

      const { error } = await supabase
        .from('test_questions')
        .insert({
          test_id: testId,
          question_type: questionType,
          question_text: questionText,
          options: optionsJson,
          correct_answer: correctAnswer,
          marks,
        });

      if (error) throw error;

      toast({
        title: 'Question Added',
        description: 'The question has been added successfully',
      });

      resetForm();
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add question',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    const newId = (options.length + 1).toString();
    setOptions([...options, { id: newId, text: '' }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions(options.filter(o => o.id !== id));
    if (correctOption === id) {
      setCorrectOption(options[0].id);
    }
  };

  const updateOption = (id: string, text: string) => {
    setOptions(options.map(o => (o.id === id ? { ...o, text } : o)));
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) resetForm();
      onOpenChange(value);
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Question</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Question Type</Label>
            <Select
              value={questionType}
              onValueChange={(value: 'mcq' | 'true_false' | 'short_answer') =>
                setQuestionType(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">Multiple Choice</SelectItem>
                <SelectItem value="true_false">True/False</SelectItem>
                <SelectItem value="short_answer">Short Answer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Textarea
              id="question"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter your question..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marks">Marks</Label>
            <Input
              id="marks"
              type="number"
              value={marks}
              onChange={(e) => setMarks(parseInt(e.target.value) || 1)}
              min={1}
              required
            />
          </div>

          {questionType === 'mcq' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Options (select correct answer)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>
              <RadioGroup value={correctOption} onValueChange={setCorrectOption}>
                {options.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <RadioGroupItem value={option.id} id={`option-${option.id}`} />
                    <Input
                      value={option.text}
                      onChange={(e) => updateOption(option.id, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                      required
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(option.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {questionType === 'true_false' && (
            <div className="space-y-2">
              <Label>Correct Answer</Label>
              <RadioGroup value={trueFalseAnswer} onValueChange={setTrueFalseAnswer}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="true" />
                  <Label htmlFor="true" className="font-normal">True</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="false" />
                  <Label htmlFor="false" className="font-normal">False</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {questionType === 'short_answer' && (
            <div className="space-y-2">
              <Label htmlFor="short_answer">Expected Answer</Label>
              <Textarea
                id="short_answer"
                value={shortAnswer}
                onChange={(e) => setShortAnswer(e.target.value)}
                placeholder="Enter the expected answer..."
                rows={2}
                required
              />
              <p className="text-xs text-muted-foreground">
                This will be shown to teachers for grading reference
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Question
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
