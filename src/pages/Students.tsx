import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { useStudents } from '@/hooks/useStudents';
import { Student } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { StudentFormDialog } from '@/components/students/StudentFormDialog';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Students() {
  const { students, loading, createStudent, updateStudent, deleteStudent } = useStudents();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  const columns = [
    {
      header: 'Student ID',
      accessor: 'student_id' as keyof Student,
    },
    {
      header: 'Name',
      accessor: (item: Student) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={item.avatar_url || undefined} alt={`${item.first_name} ${item.last_name}`} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {item.first_name[0]}{item.last_name[0]}
            </AvatarFallback>
          </Avatar>
          <span>{item.first_name} {item.last_name}</span>
        </div>
      ),
    },
    {
      header: 'Email',
      accessor: 'email' as keyof Student,
    },
    {
      header: 'Phone',
      accessor: (item: Student) => item.phone || '-',
    },
    {
      header: 'Status',
      accessor: (item: Student) => (
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

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingStudent) {
      await deleteStudent(deletingStudent.id);
      setDeletingStudent(null);
    }
  };

  const handleFormSubmit = async (data: any) => {
    if (editingStudent) {
      const success = await updateStudent(editingStudent.id, data);
      if (success) {
        setIsFormOpen(false);
        setEditingStudent(null);
      }
    } else {
      const success = await createStudent(data);
      if (success) {
        setIsFormOpen(false);
      }
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Students"
        description="Manage all enrolled students"
      />

      <DataTable
        data={students}
        columns={columns}
        searchPlaceholder="Search students..."
        searchKey="first_name"
        onAdd={() => {
          setEditingStudent(null);
          setIsFormOpen(true);
        }}
        addButtonLabel="Add Student"
        loading={loading}
        emptyMessage="No students found. Add your first student!"
        actions={(student: Student) => (
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(student)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeletingStudent(student)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <StudentFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        student={editingStudent}
        onSubmit={handleFormSubmit}
      />

      <DeleteConfirmDialog
        open={!!deletingStudent}
        onOpenChange={(open) => !open && setDeletingStudent(null)}
        onConfirm={handleDelete}
        title="Delete Student"
        description={`Are you sure you want to delete ${deletingStudent?.first_name} ${deletingStudent?.last_name}? This action cannot be undone.`}
      />
    </DashboardLayout>
  );
}
