import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { useCourses } from '@/hooks/useCourses';
import { Course } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { CourseFormDialog } from '@/components/courses/CourseFormDialog';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';

export default function Courses() {
  const { courses, loading, createCourse, updateCourse, deleteCourse } = useCourses();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

  const columns = [
    {
      header: 'Code',
      accessor: 'course_code' as keyof Course,
    },
    {
      header: 'Course Name',
      accessor: 'course_name' as keyof Course,
    },
    {
      header: 'Instructor',
      accessor: (item: Course) =>
        item.teachers
          ? `${item.teachers.first_name} ${item.teachers.last_name}`
          : '-',
    },
    {
      header: 'Credits',
      accessor: 'credits' as keyof Course,
    },
    {
      header: 'Department',
      accessor: (item: Course) => item.department || '-',
    },
    {
      header: 'Status',
      accessor: (item: Course) => (
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            item.status === 'active'
              ? 'bg-success/10 text-success'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {item.status}
        </span>
      ),
    },
  ];

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingCourse) {
      await deleteCourse(deletingCourse.id);
      setDeletingCourse(null);
    }
  };

  const handleFormSubmit = async (data: any) => {
    if (editingCourse) {
      const success = await updateCourse(editingCourse.id, data);
      if (success) {
        setIsFormOpen(false);
        setEditingCourse(null);
      }
    } else {
      const success = await createCourse(data);
      if (success) {
        setIsFormOpen(false);
      }
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Courses"
        description="Manage course offerings"
      />

      <DataTable
        data={courses}
        columns={columns}
        searchPlaceholder="Search courses..."
        searchKey="course_name"
        onAdd={() => {
          setEditingCourse(null);
          setIsFormOpen(true);
        }}
        addButtonLabel="Add Course"
        loading={loading}
        emptyMessage="No courses found. Add your first course!"
        actions={(course: Course) => (
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(course)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeletingCourse(course)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <CourseFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        course={editingCourse}
        onSubmit={handleFormSubmit}
      />

      <DeleteConfirmDialog
        open={!!deletingCourse}
        onOpenChange={(open) => !open && setDeletingCourse(null)}
        onConfirm={handleDelete}
        title="Delete Course"
        description={`Are you sure you want to delete "${deletingCourse?.course_name}"? This action cannot be undone.`}
      />
    </DashboardLayout>
  );
}
