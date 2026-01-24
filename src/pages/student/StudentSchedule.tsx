import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Clock, MapPin, BookOpen, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { DAYS_OF_WEEK } from '@/types/schedule';
import { cn } from '@/lib/utils';

interface ScheduleData {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  course_id: string;
  courses: {
    course_name: string;
    course_code: string;
    teachers: {
      first_name: string;
      last_name: string;
    } | null;
  } | null;
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export default function StudentSchedule() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        // Get student ID
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!student) {
          setLoading(false);
          return;
        }

        setStudentId(student.id);

        // Get enrolled courses
        const { data: enrollments } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('student_id', student.id)
          .eq('status', 'enrolled');

        const courseIds = enrollments?.map(e => e.course_id) || [];
        setEnrolledCourseIds(courseIds);

        if (courseIds.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch schedules for enrolled courses
        const { data: scheduleData, error } = await supabase
          .from('class_schedules')
          .select(`
            id,
            day_of_week,
            start_time,
            end_time,
            room,
            course_id,
            courses (
              course_name,
              course_code,
              teachers (
                first_name,
                last_name
              )
            )
          `)
          .in('course_id', courseIds)
          .order('day_of_week')
          .order('start_time');

        if (error) throw error;
        setSchedules(scheduleData || []);
      } catch (error) {
        console.error('Error fetching schedule:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const today = new Date().getDay();
  const todaySchedules = schedules.filter(s => s.day_of_week === (today === 0 ? 7 : today));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!studentId) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <GraduationCap className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Student Profile Found</h2>
          <p className="text-muted-foreground">
            Your account is not linked to a student profile. Please contact your administrator.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="My Schedule"
          description="View your weekly class schedule"
        />

        {/* Today's Classes */}
        {todaySchedules.length > 0 && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <CalendarDays className="h-5 w-5" />
                Today's Classes ({DAYS_OF_WEEK[today === 0 ? 7 : today]})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todaySchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background border"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{schedule.courses?.course_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {schedule.courses?.course_code}
                        {schedule.courses?.teachers && (
                          <> • {schedule.courses.teachers.first_name} {schedule.courses.teachers.last_name}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <Clock className="h-4 w-4" />
                      {formatTime(schedule.start_time.slice(0, 5))} - {formatTime(schedule.end_time.slice(0, 5))}
                    </div>
                    {schedule.room && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-4 w-4" />
                        {schedule.room}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Weekly Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Classes Scheduled</h3>
                <p className="text-muted-foreground">
                  {enrolledCourseIds.length === 0
                    ? 'You are not enrolled in any courses yet.'
                    : 'No class schedules have been set for your courses.'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {[1, 2, 3, 4, 5, 6, 7].map((dayIndex) => {
                  const daySchedules = schedules.filter(s => s.day_of_week === dayIndex);
                  if (daySchedules.length === 0) return null;

                  const isToday = dayIndex === (today === 0 ? 7 : today);

                  return (
                    <div key={dayIndex}>
                      <h4 className={cn(
                        "font-semibold text-sm mb-3 pb-2 border-b",
                        isToday && "text-primary"
                      )}>
                        {DAYS_OF_WEEK[dayIndex]}
                        {isToday && <span className="ml-2 text-xs font-normal">(Today)</span>}
                      </h4>
                      <div className="space-y-2">
                        {daySchedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors",
                              isToday && "border-primary/30 bg-primary/5"
                            )}
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
    </DashboardLayout>
  );
}
