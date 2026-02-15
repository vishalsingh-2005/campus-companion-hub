import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, GraduationCap, Calendar, ClipboardList, FileText, Award, ArrowRight, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import type { Course } from '@/types/database';

interface TeacherData {
  id: string;
  first_name: string;
  last_name: string;
  teacher_id: string;
  email: string;
  department: string | null;
  qualification: string | null;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [assignedCourses, setAssignedCourses] = useState<Course[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [enrollmentCounts, setEnrollmentCounts] = useState<{ course: string; students: number }[]>([]);

  useEffect(() => {
    async function fetchTeacherData() {
      if (!user) return;

      try {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        setTeacherData(teacher);

        if (teacher) {
          const [coursesRes, leavesRes, assignmentsRes] = await Promise.all([
            supabase.from('courses').select('*').eq('teacher_id', teacher.id),
            supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('teacher_id', teacher.id),
          ]);

          const courses = coursesRes.data || [];
          setAssignedCourses(courses);
          setPendingLeaves(leavesRes.count ?? 0);
          setAssignmentCount(assignmentsRes.count ?? 0);

          // Get enrollment counts per course
          if (courses.length > 0) {
            const enrollmentPromises = courses.map(async (c) => {
              const { count } = await supabase
                .from('course_enrollments')
                .select('id', { count: 'exact', head: true })
                .eq('course_id', c.id)
                .eq('status', 'enrolled');
              return { course: c.course_code, students: count ?? 0 };
            });
            const counts = await Promise.all(enrollmentPromises);
            setEnrollmentCounts(counts);
          }
        }
      } catch (error) {
        console.error('Error fetching teacher data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTeacherData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const activeCourses = assignedCourses.filter((c) => c.status === 'active').length;

  const quickLinks = [
    { label: 'Marks Entry', href: '/teacher/marks', icon: Award },
    { label: 'Assignments', href: '/teacher/assignments', icon: FileText },
    { label: 'Coding Labs', href: '/teacher/coding-labs', icon: BookOpen },
    { label: 'Tests', href: '/teacher/tests', icon: ClipboardList },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Welcome, ${teacherData?.first_name || 'Teacher'}!`}
        description={teacherData?.department ? `Department of ${teacherData.department}` : 'Manage your courses, marks, and assignments'}
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="My Courses" value={assignedCourses.length} icon={BookOpen} />
        <StatCard title="Active Courses" value={activeCourses} icon={Calendar} variant="success" />
        <StatCard title="Assignments" value={assignmentCount} icon={FileText} variant="info" />
        <StatCard title="Pending Leaves" value={pendingLeaves} icon={ClipboardList} variant={pendingLeaves > 0 ? 'warning' : 'default'} description={pendingLeaves > 0 ? 'Needs review' : undefined} />
      </div>

      {/* Pending Actions */}
      {pendingLeaves > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="font-semibold text-sm">{pendingLeaves} leave requests pending</p>
                <p className="text-xs text-muted-foreground">Review and approve/reject student leave requests</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/teacher/leave">Review</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Students per Course Chart */}
        {enrollmentCounts.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Students per Course
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={enrollmentCounts}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="course" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Bar dataKey="students" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickLinks.map((link) => (
              <Link key={link.label} to={link.href}>
                <Button variant="ghost" className="w-full justify-between h-11 group">
                  <span className="flex items-center gap-2">
                    <link.icon className="h-4 w-4 text-primary" />
                    {link.label}
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* My Courses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Assigned Courses</CardTitle>
        </CardHeader>
        <CardContent>
          {assignedCourses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No courses assigned yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {assignedCourses.map((course) => (
                <div key={course.id} className="p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{course.course_name}</p>
                      <p className="text-sm text-muted-foreground">{course.course_code}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">{course.credits} credits</span>
                        <Badge variant={course.status === 'active' ? 'default' : 'secondary'} className="text-xs">{course.status}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
