import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, GraduationCap, ClipboardList, Award, CheckCircle2, XCircle, Clock, CalendarDays, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DAYS_OF_WEEK } from '@/types/schedule';

interface StudentData {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  email: string;
  status: string;
}

interface EnrollmentData {
  id: string;
  grade: string | null;
  status: string;
  courses: {
    course_name: string;
    course_code: string;
    credits: number;
  } | null;
}

interface AttendanceData {
  id: string;
  attendance_date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  courses: {
    course_name: string;
    course_code: string;
  } | null;
}

interface ScheduleData {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  courses: {
    course_name: string;
    course_code: string;
  } | null;
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [attendance, setAttendance] = useState<AttendanceData[]>([]);
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);

  useEffect(() => {
    async function fetchStudentData() {
      if (!user) return;

      try {
        // Fetch student profile linked to this user
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (studentError) throw studentError;
        setStudentData(student);

        if (student) {
          // Fetch enrollments for this student
          const { data: enrollmentData, error: enrollmentError } = await supabase
            .from('course_enrollments')
            .select(`
              id,
              grade,
              status,
              courses (
                course_name,
                course_code,
                credits
              )
            `)
            .eq('student_id', student.id);

          if (enrollmentError) throw enrollmentError;
          setEnrollments(enrollmentData || []);

          // Fetch attendance for this student
          const { data: attendanceData, error: attendanceError } = await supabase
            .from('attendance')
            .select(`
              id,
              attendance_date,
              status,
              courses (
                course_name,
                course_code
              )
            `)
            .eq('student_id', student.id)
            .order('attendance_date', { ascending: false })
            .limit(10);

          if (attendanceError) throw attendanceError;
          setAttendance(attendanceData || []);

          // Fetch schedules for enrolled courses
          const enrolledCourseIds = enrollmentData?.map(e => e.courses?.course_code ? e.courses : null).filter(Boolean).map(() => {
            return enrollmentData.map(e => e.id);
          });
          
          // Fetch schedules using course_enrollments
          const { data: scheduleData, error: scheduleError } = await supabase
            .from('class_schedules')
            .select(`
              id,
              day_of_week,
              start_time,
              end_time,
              room,
              courses (
                course_name,
                course_code
              )
            `)
            .order('day_of_week')
            .order('start_time');

          if (scheduleError) throw scheduleError;
          setSchedules(scheduleData || []);
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStudentData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const enrolledCourses = enrollments.filter((e) => e.status === 'enrolled').length;
  const completedCourses = enrollments.filter((e) => e.status === 'completed').length;
  const totalCredits = enrollments.reduce((acc, e) => acc + (e.courses?.credits || 0), 0);
  
  // Calculate attendance rate
  const attendanceStats = {
    present: attendance.filter((a) => a.status === 'present').length,
    absent: attendance.filter((a) => a.status === 'absent').length,
    late: attendance.filter((a) => a.status === 'late').length,
    total: attendance.length,
  };
  const attendanceRate = attendanceStats.total > 0
    ? Math.round(((attendanceStats.present + attendanceStats.late) / attendanceStats.total) * 100)
    : 100;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Welcome, ${studentData?.first_name || 'Student'}!`}
        description="View your academic progress and enrolled courses"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Enrolled Courses"
          value={enrolledCourses}
          icon={BookOpen}
          trend={{ value: enrolledCourses, isPositive: true }}
        />
        <StatCard
          title="Completed"
          value={completedCourses}
          icon={GraduationCap}
          variant="success"
        />
        <StatCard
          title="Total Credits"
          value={totalCredits}
          icon={ClipboardList}
          variant="warning"
        />
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          icon={CheckCircle2}
          variant="info"
        />
      </div>

      {/* Profile Card */}
      {studentData && (
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Student ID</p>
                <p className="font-medium">{studentData.student_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{studentData.first_name} {studentData.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{studentData.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  studentData.status === 'active'
                    ? 'bg-success/10 text-success'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {studentData.status}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enrolled Courses */}
      <Card>
        <CardHeader>
          <CardTitle>My Courses</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              You are not enrolled in any courses yet.
            </p>
          ) : (
            <div className="space-y-4">
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{enrollment.courses?.course_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {enrollment.courses?.course_code} • {enrollment.courses?.credits} credits
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      enrollment.status === 'enrolled'
                        ? 'bg-info/10 text-info'
                        : enrollment.status === 'completed'
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {enrollment.status}
                    </span>
                    {enrollment.grade && (
                      <p className="text-sm font-medium mt-1">Grade: {enrollment.grade}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Recent Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No attendance records yet.
            </p>
          ) : (
            <div className="space-y-3">
              {attendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-10 w-10 rounded-lg flex items-center justify-center',
                      record.status === 'present' && 'bg-success/10',
                      record.status === 'absent' && 'bg-destructive/10',
                      record.status === 'late' && 'bg-warning/10',
                      record.status === 'excused' && 'bg-info/10'
                    )}>
                      {record.status === 'present' && <CheckCircle2 className="h-5 w-5 text-success" />}
                      {record.status === 'absent' && <XCircle className="h-5 w-5 text-destructive" />}
                      {record.status === 'late' && <Clock className="h-5 w-5 text-warning" />}
                      {record.status === 'excused' && <BookOpen className="h-5 w-5 text-info" />}
                    </div>
                    <div>
                      <p className="font-medium">{record.courses?.course_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(record.attendance_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    'inline-flex px-3 py-1 rounded-full text-sm font-medium capitalize',
                    record.status === 'present' && 'bg-success/10 text-success',
                    record.status === 'absent' && 'bg-destructive/10 text-destructive',
                    record.status === 'late' && 'bg-warning/10 text-warning',
                    record.status === 'excused' && 'bg-info/10 text-info'
                  )}>
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            My Class Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No classes scheduled yet.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Group by day */}
              {[1, 2, 3, 4, 5].map((dayIndex) => {
                const daySchedules = schedules.filter(s => s.day_of_week === dayIndex);
                if (daySchedules.length === 0) return null;
                
                return (
                  <div key={dayIndex}>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">
                      {DAYS_OF_WEEK[dayIndex]}
                    </h4>
                    <div className="space-y-2">
                      {daySchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Clock className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{schedule.courses?.course_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatTime(schedule.start_time.slice(0, 5))} - {formatTime(schedule.end_time.slice(0, 5))}
                              </p>
                            </div>
                          </div>
                          {schedule.room && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              {schedule.room}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
