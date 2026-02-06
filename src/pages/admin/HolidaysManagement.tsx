import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import { HolidayFormDialog } from '@/components/holidays/HolidayFormDialog';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { useHolidays, type Holiday, type HolidayFormData } from '@/hooks/useHolidays';
import { cn } from '@/lib/utils';

const TYPE_BADGE: Record<string, string> = {
  national: 'bg-destructive/15 text-destructive border-destructive/30',
  academic: 'bg-primary/15 text-primary border-primary/30',
  religious: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  exam: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  general: 'bg-muted text-muted-foreground border-border',
};

export default function HolidaysManagement() {
  const { holidays, isLoading, createHoliday, updateHoliday, deleteHoliday } = useHolidays();
  const [formOpen, setFormOpen] = useState(false);
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSubmit = (data: HolidayFormData) => {
    if (editHoliday) {
      updateHoliday.mutate({ ...data, id: editHoliday.id }, {
        onSuccess: () => { setFormOpen(false); setEditHoliday(null); },
      });
    } else {
      createHoliday.mutate(data, {
        onSuccess: () => setFormOpen(false),
      });
    }
  };

  const handleEdit = (h: Holiday) => {
    setEditHoliday(h);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteHoliday.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const columns = [
    { header: 'Title', accessor: 'title' as keyof Holiday },
    {
      header: 'Date',
      accessor: (h: Holiday) => {
        const d = new Date(h.holiday_date + 'T00:00:00');
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      },
    },
    {
      header: 'Type',
      accessor: (h: Holiday) => (
        <Badge variant="outline" className={cn('capitalize', TYPE_BADGE[h.holiday_type] || TYPE_BADGE.general)}>
          {h.holiday_type}
        </Badge>
      ),
    },
    {
      header: 'Recurring',
      accessor: (h: Holiday) => (
        <Badge variant={h.is_recurring ? 'default' : 'secondary'}>
          {h.is_recurring ? 'Yes' : 'No'}
        </Badge>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Holiday Calendar"
        description="Manage academic holidays and important dates"
      />
      <DataTable
        data={holidays}
        columns={columns}
        searchPlaceholder="Search holidays..."
        searchKey="title"
        onAdd={() => { setEditHoliday(null); setFormOpen(true); }}
        addButtonLabel="Add Holiday"
        loading={isLoading}
        emptyMessage="No holidays added yet"
        actions={(h: Holiday) => (
          <div className="flex items-center gap-1 justify-end">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(h)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteId(h.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      />

      <HolidayFormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditHoliday(null); }}
        onSubmit={handleSubmit}
        holiday={editHoliday}
        isSubmitting={createHoliday.isPending || updateHoliday.isPending}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        onConfirm={handleDelete}
        title="Delete Holiday"
        description="Are you sure you want to delete this holiday? This action cannot be undone."
      />
    </DashboardLayout>
  );
}
