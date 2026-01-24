import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  ArrowRight,
  TrendingUp,
  UserPlus,
  Shield,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalEnrollments: number;
  activeStudents: number;
  activeTeachers: number;
  activeCourses: number;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    activeStudents: 0,
    activeTeachers: 0,
    activeCourses: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [studentsRes, teachersRes, coursesRes, enrollmentsRes] = await Promise.all([
          supabase.from('students').select('id, status'),
          supabase.from('teachers').select('id, status'),
          supabase.from('courses').select('id, status'),
          supabase.from('course_enrollments').select('id'),
        ]);

        const students = studentsRes.data || [];
        const teachers = teachersRes.data || [];
        const courses = coursesRes.data || [];
        const enrollments = enrollmentsRes.data || [];

        setStats({
          totalStudents: students.length,
          totalTeachers: teachers.length,
          totalCourses: courses.length,
          totalEnrollments: enrollments.length,
          activeStudents: students.filter((s) => s.status === 'active').length,
          activeTeachers: teachers.filter((t) => t.status === 'active').length,
          activeCourses: courses.filter((c) => c.status === 'active').length,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

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

  const quickActions = [
    { label: 'Add Student', href: '/students', icon: UserPlus, color: 'bg-emerald-500' },
    { label: 'Add Teacher', href: '/teachers', icon: Users, color: 'bg-blue-500' },
    { label: 'Add Course', href: '/courses', icon: BookOpen, color: 'bg-purple-500' },
    { label: 'Manage Enrollments', href: '/enrollments', icon: ClipboardList, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Administrator Dashboard"
        description="Complete system overview and management"
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Shield className="h-4 w-4" />
          Full Access
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={GraduationCap}
          trend={{
            value: stats.activeStudents,
            isPositive: true,
          }}
          description={`${stats.activeStudents} active`}
        />
        <StatCard
          title="Total Teachers"
          value={stats.totalTeachers}
          icon={Users}
          variant="info"
          description={`${stats.activeTeachers} active`}
        />
        <StatCard
          title="Total Courses"
          value={stats.totalCourses}
          icon={BookOpen}
          variant="warning"
          description={`${stats.activeCourses} active`}
        />
        <StatCard
          title="Enrollments"
          value={stats.totalEnrollments}
          icon={ClipboardList}
          variant="success"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.label} to={action.href}>
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-muted/50 transition-all group"
                >
                  <div className={`p-3 rounded-lg ${action.color} text-white`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium">{action.label}</span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Database Connection</span>
              <span className="flex items-center gap-2 text-success">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Authentication</span>
              <span className="flex items-center gap-2 text-success">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Role-Based Access</span>
              <span className="flex items-center gap-2 text-success">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                Enabled
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Create and manage user accounts
              </li>
              <li className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Full CRUD on students, teachers, courses
              </li>
              <li className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Assign courses to students
              </li>
              <li className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                View all system data and statistics
              </li>
              <li className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Manage grades and enrollments
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
