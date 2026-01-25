import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { GraduationCap, Users, BookOpen, ClipboardList, TrendingUp, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Import role-specific dashboard content
import StudentDashboard from './student/StudentDashboard';
import TeacherDashboard from './teacher/TeacherDashboard';
import OrganizerDashboard from './organizer/OrganizerDashboard';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalEnrollments: number;
  activeStudents: number;
  activeTeachers: number;
}

export default function Dashboard() {
  const { role, isLoading: roleLoading, isAdmin, isTeacher, isStudent, isEventOrganizer } = useUserRole();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    activeStudents: 0,
    activeTeachers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [recentCourses, setRecentCourses] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStats() {
      // Only fetch stats for admin
      if (!isAdmin) {
        setLoading(false);
        return;
      }

      try {
        const [
          { count: totalStudents },
          { count: totalTeachers },
          { count: totalCourses },
          { count: totalEnrollments },
          { count: activeStudents },
          { count: activeTeachers },
          { data: students },
          { data: courses },
        ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('teachers').select('*', { count: 'exact', head: true }),
          supabase.from('courses').select('*', { count: 'exact', head: true }),
          supabase.from('course_enrollments').select('*', { count: 'exact', head: true }),
          supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('students').select('*').order('created_at', { ascending: false }).limit(5),
          supabase.from('courses').select('*, teachers(first_name, last_name)').order('created_at', { ascending: false }).limit(5),
        ]);

        setStats({
          totalStudents: totalStudents || 0,
          totalTeachers: totalTeachers || 0,
          totalCourses: totalCourses || 0,
          totalEnrollments: totalEnrollments || 0,
          activeStudents: activeStudents || 0,
          activeTeachers: activeTeachers || 0,
        });
        setRecentStudents(students || []);
        setRecentCourses(courses || []);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    if (!roleLoading) {
      fetchStats();
    }
  }, [roleLoading, isAdmin]);

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Render role-specific dashboard
  if (isStudent) {
    return (
      <DashboardLayout>
        <StudentDashboard />
      </DashboardLayout>
    );
  }

  if (isTeacher) {
    return (
      <DashboardLayout>
        <TeacherDashboard />
      </DashboardLayout>
    );
  }

  if (isEventOrganizer) {
    return (
      <DashboardLayout>
        <OrganizerDashboard />
      </DashboardLayout>
    );
  }

  // Admin dashboard (default for admin role and fallback)
  return (
    <DashboardLayout>
      <PageHeader
        title="Administrator Dashboard"
        description="Welcome to the College Management System"
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Shield className="h-4 w-4" />
          Full Access
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Students"
          value={loading ? '...' : stats.totalStudents}
          subtitle={`${stats.activeStudents} active`}
          icon={GraduationCap}
          variant="info"
        />
        <StatCard
          title="Total Teachers"
          value={loading ? '...' : stats.totalTeachers}
          subtitle={`${stats.activeTeachers} active`}
          icon={Users}
          variant="success"
        />
        <StatCard
          title="Total Courses"
          value={loading ? '...' : stats.totalCourses}
          subtitle="Across all departments"
          icon={BookOpen}
          variant="warning"
        />
        <StatCard
          title="Enrollments"
          value={loading ? '...' : stats.totalEnrollments}
          subtitle="Course registrations"
          icon={ClipboardList}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Students</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {recentStudents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No students yet</p>
            ) : (
              <div className="space-y-4">
                {recentStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        student.status === 'active'
                          ? 'bg-success/10 text-success'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {student.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Courses</CardTitle>
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {recentCourses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No courses yet</p>
            ) : (
              <div className="space-y-4">
                {recentCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning text-sm font-bold">
                        {course.course_code?.substring(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{course.course_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {course.teachers
                            ? `${course.teachers.first_name} ${course.teachers.last_name}`
                            : 'No instructor'}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {course.credits} credits
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
