import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { useEnrollments } from '@/hooks/useEnrollments';
import { CourseEnrollment } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { EnrollmentFormDialog } from '@/components/enrollments/EnrollmentFormDialog';
import { GradeDialog } from '@/components/enrollments/GradeDialog';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';

export default function Enrollments() {
  const { enrollments, loading, createEnrollment, updateEnrollment, deleteEnrollment } = useEnrollments();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [gradingEnrollment, setGradingEnrollment] = useState<CourseEnrollment | null>(null);
  const [deletingEnrollment, setDeletingEnrollment] = useState<CourseEnrollment | null>(null);

  const columns = [
    {
      header: 'Student',
      accessor: (item: CourseEnrollment) =>
        item.students
          ? `${item.students.first_name} ${item.students.last_name}`
          : '-',
    },
    {
      header: 'Student ID',
      accessor: (item: CourseEnrollment) => item.students?.student_id || '-',
    },
    {
      header: 'Course',
      accessor: (item: CourseEnrollment) => item.courses?.course_name || '-',
    },
    {
      header: 'Course Code',
      accessor: (item: CourseEnrollment) => item.courses?.course_code || '-',
    },
    {
      header: 'Grade',
      accessor: (item: CourseEnrollment) =>
        item.grade ? (
          <span className="font-medium text-primary">{item.grade}</span>
        ) : (
          <span className="text-muted-foreground">Not graded</span>
        ),
    },
    {
      header: 'Status',
      accessor: (item: CourseEnrollment) => (
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            item.status === 'enrolled'
              ? 'bg-success/10 text-success'
              : item.status === 'completed'
              ? 'bg-info/10 text-info'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {item.status}
        </span>
      ),
    },
  ];

  const handleGrade = (enrollment: CourseEnrollment) => {
    setGradingEnrollment(enrollment);
  };

  const handleDelete = async () => {
    if (deletingEnrollment) {
      await deleteEnrollment(deletingEnrollment.id);
      setDeletingEnrollment(null);
    }
  };

  const handleEnrollmentSubmit = async (studentId: string, courseId: string) => {
    const success = await createEnrollment(studentId, courseId);
    if (success) {
      setIsFormOpen(false);
    }
  };

  const handleGradeSubmit = async (grade: string, status: string) => {
    if (gradingEnrollment) {
      const success = await updateEnrollment(gradingEnrollment.id, { grade, status });
      if (success) {
        setGradingEnrollment(null);
      }
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Enrollments"
        description="Manage course enrollments and grades"
      />

      <DataTable
        data={enrollments}
        columns={columns}
        searchPlaceholder="Search enrollments..."
        onAdd={() => setIsFormOpen(true)}
        addButtonLabel="Enroll Student"
        loading={loading}
        emptyMessage="No enrollments found. Enroll your first student!"
        actions={(enrollment: CourseEnrollment) => (
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleGrade(enrollment)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeletingEnrollment(enrollment)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <EnrollmentFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleEnrollmentSubmit}
      />

      <GradeDialog
        open={!!gradingEnrollment}
        onOpenChange={(open) => !open && setGradingEnrollment(null)}
        enrollment={gradingEnrollment}
        onSubmit={handleGradeSubmit}
      />

      <DeleteConfirmDialog
        open={!!deletingEnrollment}
        onOpenChange={(open) => !open && setDeletingEnrollment(null)}
        onConfirm={handleDelete}
        title="Remove Enrollment"
        description="Are you sure you want to remove this enrollment? This action cannot be undone."
      />
    </DashboardLayout>
  );
}
