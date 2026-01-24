import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CourseEnrollment } from '@/types/database';

interface GradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollment: CourseEnrollment | null;
  onSubmit: (grade: string, status: string) => void;
}

export function GradeDialog({
  open,
  onOpenChange,
  enrollment,
  onSubmit,
}: GradeDialogProps) {
  const [grade, setGrade] = useState('');
  const [status, setStatus] = useState('enrolled');

  useEffect(() => {
    if (enrollment) {
      setGrade(enrollment.grade || '');
      setStatus(enrollment.status);
    }
  }, [enrollment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(grade, status);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Enrollment</DialogTitle>
        </DialogHeader>
        {enrollment && (
          <div className="mb-4 p-3 rounded-lg bg-muted/50">
            <p className="font-medium">
              {enrollment.students?.first_name} {enrollment.students?.last_name}
            </p>
            <p className="text-sm text-muted-foreground">
              {enrollment.courses?.course_name}
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Grade</Label>
            <Input
              placeholder="A, B+, C, etc."
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Update</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
