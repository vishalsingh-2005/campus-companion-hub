import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useSchedules } from '@/hooks/useSchedules';
import { useUserRole } from '@/hooks/useUserRole';
import { TimetableGrid } from '@/components/schedules/TimetableGrid';
import { ScheduleFormDialog } from '@/components/schedules/ScheduleFormDialog';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { Navigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Clock,
  MapPin,
  List,
  LayoutGrid,
} from 'lucide-react';
import { DAYS_OF_WEEK } from '@/types/schedule';
import type { ClassSchedule } from '@/types/schedule';

function formatTime(time: string) {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export default function Schedules() {
  const { isAdmin, isTeacher, isLoading: roleLoading } = useUserRole();
  const { schedules, isLoading, createSchedule, updateSchedule, deleteSchedule } = useSchedules();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<ClassSchedule | null>(null);

  const handleEdit = (schedule: ClassSchedule) => {
    setEditingSchedule(schedule);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingSchedule) {
      await deleteSchedule.mutateAsync(deletingSchedule.id);
      setDeletingSchedule(null);
    }
  };

  const handleFormSubmit = async (data: {
    course_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    room?: string;
    notes?: string;
  }) => {
    if (editingSchedule) {
      await updateSchedule.mutateAsync({ id: editingSchedule.id, ...data });
    } else {
      await createSchedule.mutateAsync(data);
    }
    setIsFormOpen(false);
    setEditingSchedule(null);
  };

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin && !isTeacher) {
    return <Navigate to="/access-denied" replace />;
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Class Schedules"
        description="Manage and view class timetables"
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <Tabs value={view} onValueChange={(v) => setView(v as 'grid' | 'list')}>
          <TabsList>
            <TabsTrigger value="grid" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Grid View
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isAdmin && (
          <Button onClick={() => { setEditingSchedule(null); setIsFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Schedule
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Schedules Yet</p>
              <p>Add your first class schedule to get started</p>
              {isAdmin && (
                <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Schedule
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : view === 'grid' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Weekly Timetable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimetableGrid
              schedules={schedules}
              onScheduleClick={isAdmin ? handleEdit : undefined}
              showTeacher={true}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5 text-primary" />
              Schedule List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Teacher</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{schedule.courses?.course_code}</p>
                          <p className="text-sm text-muted-foreground">{schedule.courses?.course_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>{DAYS_OF_WEEK[schedule.day_of_week]}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatTime(schedule.start_time.slice(0, 5))} - {formatTime(schedule.end_time.slice(0, 5))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {schedule.room ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {schedule.room}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {schedule.courses?.teachers
                          ? `${schedule.courses.teachers.first_name} ${schedule.courses.teachers.last_name}`
                          : '-'}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(schedule)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingSchedule(schedule)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <>
          <ScheduleFormDialog
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            schedule={editingSchedule}
            onSubmit={handleFormSubmit}
          />

          <DeleteConfirmDialog
            open={!!deletingSchedule}
            onOpenChange={(open) => !open && setDeletingSchedule(null)}
            onConfirm={handleDelete}
            title="Delete Schedule"
            description={`Are you sure you want to delete this schedule for ${deletingSchedule?.courses?.course_name}? This action cannot be undone.`}
          />
        </>
      )}
    </DashboardLayout>
  );
}
