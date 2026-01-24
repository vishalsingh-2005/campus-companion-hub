import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubmitInterviewFeedback } from '@/hooks/useLiveSessions';
import { toast } from 'sonner';

const feedbackSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  feedback: z.string().trim().min(1, 'Please provide feedback').max(2000, 'Feedback must be less than 2000 characters'),
  interview_notes: z.string().trim().max(5000, 'Notes must be less than 5000 characters').optional(),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface InterviewFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  candidateName?: string;
  onSubmitSuccess?: () => void;
}

export function InterviewFeedbackDialog({
  open,
  onOpenChange,
  sessionId,
  candidateName,
  onSubmitSuccess,
}: InterviewFeedbackDialogProps) {
  const [hoveredRating, setHoveredRating] = useState(0);
  const submitFeedback = useSubmitInterviewFeedback();

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      rating: 0,
      feedback: '',
      interview_notes: '',
    },
  });

  const currentRating = form.watch('rating');

  const handleSubmit = async (data: FeedbackFormData) => {
    try {
      await submitFeedback.mutateAsync({
        sessionId,
        rating: data.rating,
        feedback: data.feedback,
        interviewNotes: data.interview_notes,
      });
      toast.success('Feedback submitted successfully');
      form.reset();
      onOpenChange(false);
      onSubmitSuccess?.();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    }
  };

  const getRatingLabel = (rating: number) => {
    const labels = {
      1: 'Poor',
      2: 'Below Average',
      3: 'Average',
      4: 'Good',
      5: 'Excellent',
    };
    return labels[rating as keyof typeof labels] || '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Interview Feedback</DialogTitle>
          <DialogDescription>
            {candidateName
              ? `Provide your feedback for ${candidateName}'s interview.`
              : 'Provide your feedback for this interview session.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Star Rating */}
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Rating *</FormLabel>
                  <FormControl>
                    <div className="flex flex-col items-start gap-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            onClick={() => field.onChange(star)}
                            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                          >
                            <Star
                              className={cn(
                                'h-8 w-8 transition-colors',
                                (hoveredRating || currentRating) >= star
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-muted-foreground'
                              )}
                            />
                          </button>
                        ))}
                      </div>
                      {(hoveredRating || currentRating) > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {getRatingLabel(hoveredRating || currentRating)}
                        </span>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Feedback */}
            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide your overall assessment of the candidate..."
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Share your evaluation of the candidate's performance, skills, and fit.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Interview Notes */}
            <FormField
              control={form.control}
              name="interview_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interview Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes about the interview..."
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional: Add detailed notes, questions asked, or specific observations.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitFeedback.isPending}>
                {submitFeedback.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
