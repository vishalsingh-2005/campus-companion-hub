import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  CalendarDays, 
  MapPin,
  Video,
  QrCode,
  Eye,
  Bell,
  AlertTriangle,
  ChevronRight,
  Percent,
  Calendar,
  Megaphone,
  PartyPopper,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isToday, parseISO, isFuture } from 'date-fns';
import { cn } from '@/lib/utils';
import { DAYS_OF_WEEK } from '@/types/schedule';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useMessages } from '@/hooks/useMessages';

interface StudentData {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  email: string;
  phone: string | null;
  status: string;
  avatar_url: string | null;
  gender: string | null;
  address: string | null;
  date_of_birth: string | null;
  enrollment_date: string | null;
}

interface EnrollmentData {
  id: string;
  grade: string | null;
  status: string;
  courses: {
    id: string;
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
    id: string;
    course_name: string;
    course_code: string;
  } | null;
}

interface LiveSessionData {
  id: string;
  title: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string | null;
}

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  created_at: string;
  is_read: boolean;
}

interface AnnouncementData {
  id: string;
  title: string;
  message: string;
  priority: string;
  is_global: boolean;
  created_at: string;
  events?: {
    title: string;
  } | null;
}

interface EventData {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  venue: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  is_public: boolean;
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
  const { unreadCount: unreadMessages } = useMessages();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [attendance, setAttendance] = useState<AttendanceData[]>([]);
  const [todaySchedules, setTodaySchedules] = useState<ScheduleData[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSessionData[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventData[]>([]);

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
                id,
                course_name,
                course_code,
                credits
              )
            `)
            .eq('student_id', student.id);

          if (enrollmentError) throw enrollmentError;
          setEnrollments(enrollmentData || []);

          // Get enrolled course IDs
          const enrolledCourseIds = enrollmentData?.map(e => e.courses?.id).filter(Boolean) as string[];

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
            .order('attendance_date', { ascending: false });

          if (attendanceError) throw attendanceError;
          setAttendance(attendanceData || []);

          // Fetch today's schedules for enrolled courses
          const today = new Date().getDay();
          if (enrolledCourseIds.length > 0) {
            const { data: scheduleData, error: scheduleError } = await supabase
              .from('class_schedules')
              .select(`
                id,
                day_of_week,
                start_time,
                end_time,
                room,
                courses (
                  id,
                  course_name,
                  course_code
                )
              `)
              .eq('day_of_week', today)
              .in('course_id', enrolledCourseIds)
              .order('start_time');

            if (scheduleError) throw scheduleError;
            setTodaySchedules(scheduleData || []);
          }

          // Fetch upcoming live sessions
          const { data: sessionData, error: sessionError } = await supabase
            .from('live_sessions')
            .select('id, title, status, scheduled_start, scheduled_end')
            .in('status', ['scheduled', 'waiting', 'live'])
            .order('scheduled_start')
            .limit(5);

          if (sessionError) throw sessionError;
          setLiveSessions(sessionData || []);

          // Fetch notifications (mock for now - can be connected to a notifications table later)
          setNotifications([
            {
              id: '1',
              title: 'Attendance Reminder',
              message: 'Remember to mark your attendance for today\'s classes',
              type: 'info',
              created_at: new Date().toISOString(),
              is_read: false,
            },
          ]);
        }

        // Fetch announcements (global or for public events)
        const { data: announcementsData, error: announcementsError } = await supabase
          .from('event_announcements')
          .select('id, title, message, priority, is_global, created_at, events(title)')
          .order('created_at', { ascending: false })
          .limit(5);

        if (!announcementsError) {
          setAnnouncements(announcementsData || []);
        }

        // Fetch upcoming public events
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('id, title, description, event_type, venue, start_date, end_date, status, is_public')
          .eq('is_public', true)
          .eq('status', 'published')
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(5);

        if (!eventsError) {
          setUpcomingEvents(eventsData || []);
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
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const enrolledCourses = enrollments.filter((e) => e.status === 'enrolled').length;
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

  const isLowAttendance = attendanceRate < 75;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
            {studentData?.avatar_url ? (
              <AvatarImage src={studentData.avatar_url} alt={studentData?.first_name} />
            ) : (
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {studentData?.first_name?.charAt(0)}{studentData?.last_name?.charAt(0)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold">
              Welcome back, {studentData?.first_name}! 👋
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-muted-foreground">
              <span className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4" />
                {studentData?.student_id}
              </span>
              {studentData?.gender && (
                <span>• {studentData.gender}</span>
              )}
              <Badge variant="secondary">{studentData?.status}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="sm" asChild className="gap-2">
              <Link to="/student/mark-attendance">
                <QrCode className="h-4 w-4" />
                Mark Attendance
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link to="/live-sessions">
                <Video className="h-4 w-4" />
                Join Class
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Low Attendance Warning */}
        {isLowAttendance && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">
              Your attendance is below 75%. Please attend classes regularly to avoid academic issues.
            </span>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          icon={Percent}
          variant={isLowAttendance ? 'destructive' : 'success'}
          description={isLowAttendance ? 'Below required' : 'Good standing'}
        />
        <StatCard
          title="Enrolled Courses"
          value={enrolledCourses}
          icon={BookOpen}
          variant="info"
        />
        <StatCard
          title="Total Credits"
          value={totalCredits}
          icon={GraduationCap}
          variant="warning"
        />
        <StatCard
          title="Today's Classes"
          value={todaySchedules.length}
          icon={Calendar}
          description={todaySchedules.length === 0 ? 'No classes today' : undefined}
        />
      </div>

      {/* Attendance Charts */}
      {attendance.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Attendance Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Percent className="h-5 w-5 text-primary" />
                Attendance Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Present', value: attendanceStats.present, fill: 'hsl(var(--success))' },
                        { name: 'Absent', value: attendanceStats.absent, fill: 'hsl(var(--destructive))' },
                        { name: 'Late', value: attendanceStats.late, fill: 'hsl(var(--warning))' },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="h-3 w-3 rounded-full bg-success" />
                  Present ({attendanceStats.present})
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="h-3 w-3 rounded-full bg-destructive" />
                  Absent ({attendanceStats.absent})
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="h-3 w-3 rounded-full bg-warning" />
                  Late ({attendanceStats.late})
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Per-Course Attendance Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-5 w-5 text-primary" />
                Attendance by Course
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(() => {
                    const courseMap = new Map<string, { present: number; total: number; code: string }>();
                    attendance.forEach(a => {
                      const code = a.courses?.course_code || 'N/A';
                      const existing = courseMap.get(code) || { present: 0, total: 0, code };
                      existing.total++;
                      if (a.status === 'present' || a.status === 'late') existing.present++;
                      courseMap.set(code, existing);
                    });
                    return Array.from(courseMap.values()).map(c => ({
                      course: c.code,
                      rate: c.total > 0 ? Math.round((c.present / c.total) * 100) : 0,
                    }));
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="course" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <RechartsTooltip />
                    <Bar dataKey="rate" name="Attendance %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Link to="/student/mark-attendance" className="group">
          <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <QrCode className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Mark Attendance</p>
                <p className="text-sm text-muted-foreground">Scan QR code</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/live-sessions" className="group">
          <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center group-hover:bg-info/20 transition-colors">
                <Video className="h-6 w-6 text-info" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Live Classes</p>
                <p className="text-sm text-muted-foreground">{liveSessions.filter(s => s.status === 'live').length} live now</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-info transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/student/attendance" className="group">
          <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                <Eye className="h-6 w-6 text-success" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">View Attendance</p>
                <p className="text-sm text-muted-foreground">Full history</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-success transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/messages" className="group">
          <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors relative">
                <MessageSquare className="h-6 w-6 text-violet-500" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold">Messages</p>
                <p className="text-sm text-muted-foreground">{unreadMessages > 0 ? `${unreadMessages} unread` : 'Inbox'}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-violet-500 transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/student/profile" className="group">
          <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
                <GraduationCap className="h-6 w-6 text-warning" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">My Profile</p>
                <p className="text-sm text-muted-foreground">View details</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-warning transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Classes */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Today's Classes
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/student/schedule">View Full Schedule</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {todaySchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <CalendarDays className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium">No classes scheduled today</p>
                <p className="text-sm text-muted-foreground mt-1">Enjoy your day off! 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{schedule.courses?.course_name}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{schedule.courses?.course_code}</span>
                        <span>•</span>
                        <span>{formatTime(schedule.start_time.slice(0, 5))} - {formatTime(schedule.end_time.slice(0, 5))}</span>
                      </div>
                    </div>
                    {schedule.room && (
                      <Badge variant="secondary" className="gap-1">
                        <MapPin className="h-3 w-3" />
                        {schedule.room}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Live Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liveSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Video className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium">No live sessions</p>
                <p className="text-sm text-muted-foreground mt-1">Check back later</p>
              </div>
            ) : (
              <ScrollArea className="h-[250px]">
                <div className="space-y-3 pr-4">
                  {liveSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium line-clamp-2">{session.title}</p>
                        <Badge 
                          variant={session.status === 'live' ? 'destructive' : 'secondary'}
                          className={session.status === 'live' ? 'animate-pulse' : ''}
                        >
                          {session.status === 'live' ? '🔴 LIVE' : session.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(parseISO(session.scheduled_start), 'MMM d, h:mm a')}
                      </p>
                      {session.status === 'live' && (
                        <Button size="sm" className="w-full mt-2" asChild>
                          <Link to={`/live-room/${session.id}`}>Join Now</Link>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Recent Attendance
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/student/attendance">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No attendance records yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {attendance.slice(0, 6).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0',
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
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{record.courses?.course_code}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(record.attendance_date), 'MMM d')}
                    </p>
                  </div>
                  <Badge 
                    variant="secondary"
                    className={cn(
                      'capitalize',
                      record.status === 'present' && 'bg-success/10 text-success',
                      record.status === 'absent' && 'bg-destructive/10 text-destructive',
                      record.status === 'late' && 'bg-warning/10 text-warning',
                      record.status === 'excused' && 'bg-info/10 text-info'
                    )}
                  >
                    {record.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Announcements & Upcoming Events Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Announcements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Announcements
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/student/notices">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Megaphone className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium">No announcements</p>
                <p className="text-sm text-muted-foreground mt-1">Check back later for updates</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-3 pr-4">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className={cn(
                        'p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors',
                        announcement.priority === 'high' && 'border-destructive/30 bg-destructive/5'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                            announcement.priority === 'high' ? 'bg-destructive/10' : 'bg-primary/10'
                          )}>
                            <Megaphone className={cn(
                              'h-4 w-4',
                              announcement.priority === 'high' ? 'text-destructive' : 'text-primary'
                            )} />
                          </div>
                          <div>
                            <p className="font-semibold line-clamp-1">{announcement.title}</p>
                            {announcement.events?.title && (
                              <p className="text-xs text-muted-foreground">{announcement.events.title}</p>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            'capitalize text-xs',
                            announcement.priority === 'high' && 'bg-destructive/10 text-destructive',
                            announcement.priority === 'urgent' && 'bg-destructive text-destructive-foreground'
                          )}
                        >
                          {announcement.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{announcement.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(parseISO(announcement.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-primary" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <PartyPopper className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium">No upcoming events</p>
                <p className="text-sm text-muted-foreground mt-1">Stay tuned for future events!</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-3 pr-4">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-primary">
                            {format(parseISO(event.start_date), 'MMM')}
                          </span>
                          <span className="text-lg font-bold text-primary leading-none">
                            {format(parseISO(event.start_date), 'd')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold line-clamp-1">{event.title}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs capitalize">
                              {event.event_type}
                            </Badge>
                            {event.venue && (
                              <span className="flex items-center gap-1 text-xs">
                                <MapPin className="h-3 w-3" />
                                {event.venue}
                              </span>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                              {event.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(parseISO(event.start_date), 'EEEE, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border',
                    !notification.is_read && 'bg-primary/5 border-primary/20'
                  )}
                >
                  <div className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0',
                    notification.type === 'info' && 'bg-info/10',
                    notification.type === 'warning' && 'bg-warning/10',
                    notification.type === 'success' && 'bg-success/10'
                  )}>
                    <Bell className={cn(
                      'h-5 w-5',
                      notification.type === 'info' && 'text-info',
                      notification.type === 'warning' && 'text-warning',
                      notification.type === 'success' && 'text-success'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(parseISO(notification.created_at), 'h:mm a')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
