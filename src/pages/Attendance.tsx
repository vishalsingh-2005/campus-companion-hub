import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAttendance, useCourseStudents } from '@/hooks/useAttendance';
import { useCourses } from '@/hooks/useCourses';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Save,
  Users,
  BookOpen,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
import type { AttendanceStatus, AttendanceRecord } from '@/types/attendance';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; icon: React.ComponentType<any>; color: string }> = {
  present: { label: 'Present', icon: CheckCircle2, color: 'text-success bg-success/10' },
  absent: { label: 'Absent', icon: XCircle, color: 'text-destructive bg-destructive/10' },
  late: { label: 'Late', icon: Clock, color: 'text-warning bg-warning/10' },
  excused: { label: 'Excused', icon: FileText, color: 'text-info bg-info/10' },
};

export default function Attendance() {
  const { isAdmin, isTeacher, isLoading: roleLoading } = useUserRole();
  const { courses, loading: coursesLoading } = useCourses();
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [isRecording, setIsRecording] = useState(false);

  const { data: courseStudents, isLoading: studentsLoading } = useCourseStudents(selectedCourse);
  const { attendance, isLoading: attendanceLoading, recordAttendance } = useAttendance(
    selectedCourse,
    selectedDate
  );

  // Initialize attendance records when students or existing attendance changes
  useEffect(() => {
    if (!courseStudents || !selectedCourse) return;

    const newRecords = new Map<string, AttendanceRecord>();

    courseStudents.forEach((student: any) => {
      const existingRecord = attendance?.find(
        (a) => a.student_id === student.id
      );

      newRecords.set(student.id, {
        studentId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        studentCode: student.student_id,
        status: existingRecord?.status || 'present',
        notes: existingRecord?.notes || '',
      });
    });

    setAttendanceRecords(newRecords);
  }, [courseStudents, attendance, selectedCourse]);

  const updateStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceRecords((prev) => {
      const newMap = new Map(prev);
      const record = newMap.get(studentId);
      if (record) {
        newMap.set(studentId, { ...record, status });
      }
      return newMap;
    });
  };

  const updateStudentNotes = (studentId: string, notes: string) => {
    setAttendanceRecords((prev) => {
      const newMap = new Map(prev);
      const record = newMap.get(studentId);
      if (record) {
        newMap.set(studentId, { ...record, notes });
      }
      return newMap;
    });
  };

  const handleSaveAttendance = async () => {
    if (!selectedCourse || attendanceRecords.size === 0) return;

    setIsRecording(true);
    try {
      const records = Array.from(attendanceRecords.values()).map((record) => ({
        student_id: record.studentId,
        course_id: selectedCourse,
        attendance_date: selectedDate,
        status: record.status,
        notes: record.notes || undefined,
      }));

      await recordAttendance.mutateAsync(records);
    } finally {
      setIsRecording(false);
    }
  };

  const markAllAs = (status: AttendanceStatus) => {
    setAttendanceRecords((prev) => {
      const newMap = new Map(prev);
      newMap.forEach((record, id) => {
        newMap.set(id, { ...record, status });
      });
      return newMap;
    });
  };

  // Calculate summary stats
  const summary = {
    present: Array.from(attendanceRecords.values()).filter((r) => r.status === 'present').length,
    absent: Array.from(attendanceRecords.values()).filter((r) => r.status === 'absent').length,
    late: Array.from(attendanceRecords.values()).filter((r) => r.status === 'late').length,
    excused: Array.from(attendanceRecords.values()).filter((r) => r.status === 'excused').length,
    total: attendanceRecords.size,
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
        title="Attendance Tracking"
        description="Record and monitor student attendance for courses"
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Select Course & Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {coursesLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    courses?.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.course_code} - {course.course_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleSaveAttendance}
                disabled={!selectedCourse || attendanceRecords.size === 0 || isRecording}
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                {isRecording ? 'Saving...' : 'Save Attendance'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedCourse && (
        <>
          {/* Quick Actions & Summary */}
          <div className="grid gap-4 md:grid-cols-5 mb-6">
            <Card className="md:col-span-1">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold">{summary.total}</p>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                </div>
              </CardContent>
            </Card>

            {(Object.entries(STATUS_CONFIG) as [AttendanceStatus, typeof STATUS_CONFIG['present']][]).map(
              ([status, config]) => (
                <Card
                  key={status}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => markAllAs(status)}
                >
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <config.icon className={cn('h-8 w-8 mx-auto mb-2', config.color.split(' ')[0])} />
                      <p className="text-2xl font-bold">{summary[status]}</p>
                      <p className="text-sm text-muted-foreground">{config.label}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>

          {/* Attendance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Student Attendance
              </CardTitle>
              <CardDescription>
                Click status buttons to toggle attendance. Click summary cards above to mark all students.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {studentsLoading || attendanceLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : attendanceRecords.size === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No students enrolled in this course</p>
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from(attendanceRecords.values()).map((record) => (
                        <TableRow key={record.studentId}>
                          <TableCell className="font-mono">{record.studentCode}</TableCell>
                          <TableCell className="font-medium">{record.studentName}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {(Object.entries(STATUS_CONFIG) as [AttendanceStatus, typeof STATUS_CONFIG['present']][]).map(
                                ([status, config]) => {
                                  const Icon = config.icon;
                                  const isSelected = record.status === status;
                                  return (
                                    <Button
                                      key={status}
                                      size="sm"
                                      variant={isSelected ? 'default' : 'outline'}
                                      className={cn(
                                        'h-8 w-8 p-0',
                                        isSelected && config.color
                                      )}
                                      onClick={() => updateStudentStatus(record.studentId, status)}
                                      title={config.label}
                                    >
                                      <Icon className="h-4 w-4" />
                                    </Button>
                                  );
                                }
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Add notes..."
                              value={record.notes}
                              onChange={(e) => updateStudentNotes(record.studentId, e.target.value)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedCourse && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Select a Course</p>
              <p>Choose a course above to start recording attendance</p>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
