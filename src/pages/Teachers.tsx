import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { useTeachers } from '@/hooks/useTeachers';
import { Teacher } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { TeacherFormDialog } from '@/components/teachers/TeacherFormDialog';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Teachers() {
  const { teachers, loading, createTeacher, updateTeacher, deleteTeacher } = useTeachers();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);

  const columns = [
    {
      header: 'Teacher ID',
      accessor: 'teacher_id' as keyof Teacher,
    },
    {
      header: 'Name',
      accessor: (item: Teacher) => (
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
      accessor: 'email' as keyof Teacher,
    },
    {
      header: 'Department',
      accessor: (item: Teacher) => item.department || '-',
    },
    {
      header: 'Status',
      accessor: (item: Teacher) => (
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

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingTeacher) {
      await deleteTeacher(deletingTeacher.id);
      setDeletingTeacher(null);
    }
  };

  const handleFormSubmit = async (data: any) => {
    if (editingTeacher) {
      const success = await updateTeacher(editingTeacher.id, data);
      if (success) {
        setIsFormOpen(false);
        setEditingTeacher(null);
      }
    } else {
      const success = await createTeacher(data);
      if (success) {
        setIsFormOpen(false);
      }
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Teachers"
        description="Manage faculty and instructors"
      />

      <DataTable
        data={teachers}
        columns={columns}
        searchPlaceholder="Search teachers..."
        searchKey="first_name"
        onAdd={() => {
          setEditingTeacher(null);
          setIsFormOpen(true);
        }}
        addButtonLabel="Add Teacher"
        loading={loading}
        emptyMessage="No teachers found. Add your first teacher!"
        actions={(teacher: Teacher) => (
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(teacher)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeletingTeacher(teacher)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <TeacherFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        teacher={editingTeacher}
        onSubmit={handleFormSubmit}
      />

      <DeleteConfirmDialog
        open={!!deletingTeacher}
        onOpenChange={(open) => !open && setDeletingTeacher(null)}
        onConfirm={handleDelete}
        title="Delete Teacher"
        description={`Are you sure you want to delete ${deletingTeacher?.first_name} ${deletingTeacher?.last_name}? This action cannot be undone.`}
      />
    </DashboardLayout>
  );
}
