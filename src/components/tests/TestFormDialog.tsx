import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Test {
  id: string;
  title: string;
  description: string | null;
  test_type: string;
  total_marks: number;
  passing_marks: number;
  scheduled_date: string;
  duration_minutes: number;
  course_id: string;
}

interface Course {
  id: string;
  course_code: string;
  course_name: string;
}

interface TestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: Test | null;
  courses: Course[];
  onSuccess: () => void;
}

export function TestFormDialog({
  open,
  onOpenChange,
  test,
  courses,
  onSuccess,
}: TestFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    test_type: 'quiz',
    total_marks: 100,
    passing_marks: 40,
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    course_id: '',
  });

  useEffect(() => {
    if (test) {
      const date = new Date(test.scheduled_date);
      setFormData({
        title: test.title,
        description: test.description || '',
        test_type: test.test_type,
        total_marks: test.total_marks,
        passing_marks: test.passing_marks,
        scheduled_date: date.toISOString().split('T')[0],
        scheduled_time: date.toTimeString().slice(0, 5),
        duration_minutes: test.duration_minutes,
        course_id: test.course_id,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        test_type: 'quiz',
        total_marks: 100,
        passing_marks: 40,
        scheduled_date: '',
        scheduled_time: '',
        duration_minutes: 60,
        course_id: courses[0]?.id || '',
      });
    }
  }, [test, open, courses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const scheduledDateTime = new Date(
        `${formData.scheduled_date}T${formData.scheduled_time}`
      ).toISOString();

      const testData = {
        title: formData.title,
        description: formData.description || null,
        test_type: formData.test_type,
        total_marks: formData.total_marks,
        passing_marks: formData.passing_marks,
        scheduled_date: scheduledDateTime,
        duration_minutes: formData.duration_minutes,
        course_id: formData.course_id,
      };

      if (test) {
        const { error } = await supabase
          .from('tests')
          .update(testData)
          .eq('id', test.id);

        if (error) throw error;

        toast({
          title: 'Test Updated',
          description: 'The test has been updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('tests')
          .insert(testData);

        if (error) throw error;

        toast({
          title: 'Test Created',
          description: 'The test has been created successfully',
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save test',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{test ? 'Edit Test' : 'Create Test'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="course">Course</Label>
            <Select
              value={formData.course_id}
              onValueChange={(value) =>
                setFormData({ ...formData, course_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.course_code} - {course.course_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g., Midterm Exam"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Test instructions..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test_type">Type</Label>
              <Select
                value={formData.test_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, test_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="midterm">Midterm</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration_minutes: parseInt(e.target.value) || 60,
                  })
                }
                min={5}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Date</Label>
              <Input
                id="scheduled_date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) =>
                  setFormData({ ...formData, scheduled_date: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_time">Time</Label>
              <Input
                id="scheduled_time"
                type="time"
                value={formData.scheduled_time}
                onChange={(e) =>
                  setFormData({ ...formData, scheduled_time: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_marks">Total Marks</Label>
              <Input
                id="total_marks"
                type="number"
                value={formData.total_marks}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    total_marks: parseInt(e.target.value) || 100,
                  })
                }
                min={1}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passing_marks">Passing Marks</Label>
              <Input
                id="passing_marks"
                type="number"
                value={formData.passing_marks}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    passing_marks: parseInt(e.target.value) || 40,
                  })
                }
                min={0}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {test ? 'Update Test' : 'Create Test'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
