import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useStudents } from '@/hooks/useStudents';
import { useCourses } from '@/hooks/useCourses';

interface EnrollmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (studentId: string, courseId: string) => void;
}

export function EnrollmentFormDialog({
  open,
  onOpenChange,
  onSubmit,
}: EnrollmentFormDialogProps) {
  const { students } = useStudents();
  const { courses } = useCourses();
  const [studentId, setStudentId] = useState('');
  const [courseId, setCourseId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentId && courseId) {
      onSubmit(studentId, courseId);
      setStudentId('');
      setCourseId('');
    }
  };

  const activeStudents = students.filter((s) => s.status === 'active');
  const activeCourses = courses.filter((c) => c.status === 'active');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enroll Student in Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {activeStudents.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name} ({student.student_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {activeCourses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.course_name} ({course.course_code})
                  </SelectItem>
                ))}
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
            <Button type="submit" disabled={!studentId || !courseId}>
              Enroll Student
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
