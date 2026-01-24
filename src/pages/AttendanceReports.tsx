import { useState } from 'react';
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
import { useAttendance } from '@/hooks/useAttendance';
import { useCourses } from '@/hooks/useCourses';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Download,
  Filter,
  TrendingUp,
  Users,
  Percent,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import type { AttendanceStatus } from '@/types/attendance';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; icon: React.ComponentType<any>; color: string }> = {
  present: { label: 'Present', icon: CheckCircle2, color: 'hsl(142, 76%, 36%)' },
  absent: { label: 'Absent', icon: XCircle, color: 'hsl(0, 84%, 60%)' },
  late: { label: 'Late', icon: Clock, color: 'hsl(38, 92%, 50%)' },
  excused: { label: 'Excused', icon: FileText, color: 'hsl(199, 89%, 48%)' },
};

export default function AttendanceReports() {
  const { isAdmin, isTeacher, isLoading: roleLoading } = useUserRole();
  const { courses, loading: coursesLoading } = useCourses();
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month');

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

  const { attendance, isLoading: attendanceLoading } = useAttendance(
    selectedCourse || undefined
  );

  // Filter attendance by date range
  const filteredAttendance = attendance.filter((a) => {
    const startDate = getDateFilter();
    if (!startDate) return true;
    return a.attendance_date >= startDate;
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
    : 0;

  // Prepare chart data
  const pieData = [
    { name: 'Present', value: stats.present, color: STATUS_CONFIG.present.color },
    { name: 'Absent', value: stats.absent, color: STATUS_CONFIG.absent.color },
    { name: 'Late', value: stats.late, color: STATUS_CONFIG.late.color },
    { name: 'Excused', value: stats.excused, color: STATUS_CONFIG.excused.color },
  ].filter((d) => d.value > 0);

  // Group by date for trend chart
  const dateGroups: Record<string, { date: string; present: number; absent: number; late: number; excused: number }> = {};
  filteredAttendance.forEach((a) => {
    if (!dateGroups[a.attendance_date]) {
      dateGroups[a.attendance_date] = { date: a.attendance_date, present: 0, absent: 0, late: 0, excused: 0 };
    }
    dateGroups[a.attendance_date][a.status]++;
  });

  const trendData = Object.values(dateGroups)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14) // Last 14 days
    .map((d) => ({
      ...d,
      date: format(new Date(d.date), 'MMM d'),
    }));

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
        title="Attendance Reports"
        description="View attendance statistics and trends"
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="All courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Courses</SelectItem>
                  {courses?.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
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

            <div className="flex items-end">
              <Button variant="outline" className="w-full" disabled>
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Records</p>
            </div>
          </CardContent>
        </Card>

        <Card>
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
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Distribution</CardTitle>
            <CardDescription>Breakdown by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No attendance data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
          </CardContent>
        </Card>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Attendance Trend
            </CardTitle>
            <CardDescription>Daily attendance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {trendData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No attendance data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="present" stackId="a" fill={STATUS_CONFIG.present.color} name="Present" />
                    <Bar dataKey="late" stackId="a" fill={STATUS_CONFIG.late.color} name="Late" />
                    <Bar dataKey="absent" stackId="a" fill={STATUS_CONFIG.absent.color} name="Absent" />
                    <Bar dataKey="excused" stackId="a" fill={STATUS_CONFIG.excused.color} name="Excused" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance Records</CardTitle>
          <CardDescription>Latest attendance entries</CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filteredAttendance.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No attendance records found</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.slice(0, 20).map((record) => {
                    const config = STATUS_CONFIG[record.status];
                    const Icon = config.icon;
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{format(new Date(record.attendance_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-medium">
                          {record.students?.first_name} {record.students?.last_name}
                        </TableCell>
                        <TableCell>{record.courses?.course_name}</TableCell>
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
                        <TableCell className="text-muted-foreground">
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
    </DashboardLayout>
  );
}
