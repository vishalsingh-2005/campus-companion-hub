import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  TrendingUp,
  Percent,
  BookOpen,
} from 'lucide-react';
import { format, subDays, startOfMonth } from 'date-fns';
import type { AttendanceStatus } from '@/types/attendance';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; icon: React.ComponentType<any>; color: string }> = {
  present: { label: 'Present', icon: CheckCircle2, color: 'hsl(142, 76%, 36%)' },
  absent: { label: 'Absent', icon: XCircle, color: 'hsl(0, 84%, 60%)' },
  late: { label: 'Late', icon: Clock, color: 'hsl(38, 92%, 50%)' },
  excused: { label: 'Excused', icon: FileText, color: 'hsl(199, 89%, 48%)' },
};

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  status: AttendanceStatus;
  notes: string | null;
  courses: {
    course_name: string;
    course_code: string;
  } | null;
}

export default function MyAttendance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month');
  const [selectedCourse, setSelectedCourse] = useState<string>('');

  useEffect(() => {
    async function fetchAttendance() {
      if (!user) return;

      try {
        setLoading(true);

        // First get the student record for this user
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (studentError) throw studentError;
        if (!student) {
          setLoading(false);
          return;
        }

        setStudentId(student.id);

        // Fetch attendance records
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select(`
            id,
            attendance_date,
            status,
            notes,
            courses (
              course_name,
              course_code
            )
          `)
          .eq('student_id', student.id)
          .order('attendance_date', { ascending: false });

        if (attendanceError) throw attendanceError;
        setAttendance(attendanceData || []);
      } catch (error) {
        console.error('Error fetching attendance:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAttendance();
  }, [user]);

  // Get unique courses for filter
  const courses = Array.from(
    new Map(
      attendance
        .filter((a) => a.courses)
        .map((a) => [a.courses!.course_code, a.courses!])
    ).values()
  );

  // Filter by date range
  const getDateFilter = () => {
    const today = new Date();
    switch (dateRange) {
      case 'week':
        return format(subDays(today, 7), 'yyyy-MM-dd');
      case 'month':
        return format(startOfMonth(today), 'yyyy-MM-dd');
      default:
        return undefined;
    }
  };

  const filteredAttendance = attendance.filter((a) => {
    const startDate = getDateFilter();
    const matchesDate = !startDate || a.attendance_date >= startDate;
    const matchesCourse = !selectedCourse || a.courses?.course_code === selectedCourse;
    return matchesDate && matchesCourse;
  });

  // Calculate statistics
  const stats = {
    total: filteredAttendance.length,
    present: filteredAttendance.filter((a) => a.status === 'present').length,
    absent: filteredAttendance.filter((a) => a.status === 'absent').length,
    late: filteredAttendance.filter((a) => a.status === 'late').length,
    excused: filteredAttendance.filter((a) => a.status === 'excused').length,
  };

  const attendanceRate = stats.total > 0
    ? Math.round(((stats.present + stats.late) / stats.total) * 100)
    : 100;

  // Prepare chart data
  const pieData = [
    { name: 'Present', value: stats.present, color: STATUS_CONFIG.present.color },
    { name: 'Absent', value: stats.absent, color: STATUS_CONFIG.absent.color },
    { name: 'Late', value: stats.late, color: STATUS_CONFIG.late.color },
    { name: 'Excused', value: stats.excused, color: STATUS_CONFIG.excused.color },
  ].filter((d) => d.value > 0);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!studentId) {
    return (
      <DashboardLayout>
        <PageHeader
          title="My Attendance"
          description="View your attendance records"
        />
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Student Profile Found</p>
              <p>Your account is not linked to a student record. Please contact an administrator.</p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="My Attendance"
        description="View your attendance history and statistics"
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="All courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Courses</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.course_code} value={course.course_code}>
                      {course.course_code} - {course.course_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <Percent className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{attendanceRate}%</p>
              <p className="text-sm text-muted-foreground">Attendance Rate</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-success mb-2" />
              <p className="text-2xl font-bold text-success">{stats.present}</p>
              <p className="text-sm text-muted-foreground">Present</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
              <p className="text-2xl font-bold text-destructive">{stats.absent}</p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto text-warning mb-2" />
              <p className="text-2xl font-bold text-warning">{stats.late}</p>
              <p className="text-sm text-muted-foreground">Late</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-info/5 border-info/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-8 w-8 mx-auto text-info mb-2" />
              <p className="text-2xl font-bold text-info">{stats.excused}</p>
              <p className="text-sm text-muted-foreground">Excused</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart & Records */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-sm">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-muted-foreground">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
            <CardDescription>Your recent attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAttendance.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No attendance records found</p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.map((record) => {
                      const config = STATUS_CONFIG[record.status];
                      const Icon = config.icon;
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(record.attendance_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{record.courses?.course_name}</p>
                              <p className="text-xs text-muted-foreground">{record.courses?.course_code}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                                record.status === 'present' && 'bg-success/10 text-success',
                                record.status === 'absent' && 'bg-destructive/10 text-destructive',
                                record.status === 'late' && 'bg-warning/10 text-warning',
                                record.status === 'excused' && 'bg-info/10 text-info'
                              )}
                            >
                              <Icon className="h-3 w-3" />
                              {config.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {record.notes || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
