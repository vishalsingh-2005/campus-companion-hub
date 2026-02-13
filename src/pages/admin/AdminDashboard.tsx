import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users, GraduationCap, BookOpen, ClipboardList,
  ArrowRight, UserPlus, Shield,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ students: 0, teachers: 0, courses: 0, enrollments: 0 });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [s, t, c, e] = await Promise.all([
          supabase.from('students').select('id', { count: 'exact', head: true }),
          supabase.from('teachers').select('id', { count: 'exact', head: true }),
          supabase.from('courses').select('id', { count: 'exact', head: true }),
          supabase.from('course_enrollments').select('id', { count: 'exact', head: true }),
        ]);
        setStats({
          students: s.count ?? 0,
          teachers: t.count ?? 0,
          courses: c.count ?? 0,
          enrollments: e.count ?? 0,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton className="h-10 sm:h-12 w-48 sm:w-64" />
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 sm:h-32" />)}
        </div>
      </div>
    );
  }

  const quickActions = [
    { label: 'Add Student', href: '/students', icon: UserPlus, color: 'bg-emerald-500' },
    { label: 'Add Teacher', href: '/teachers', icon: Users, color: 'bg-blue-500' },
    { label: 'Add Course', href: '/courses', icon: BookOpen, color: 'bg-purple-500' },
    { label: 'Enrollments', href: '/enrollments', icon: ClipboardList, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <PageHeader title="Admin Dashboard" description="System overview and management">
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
          <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Full Access
        </div>
      </PageHeader>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Students" value={stats.students} icon={GraduationCap} />
        <StatCard title="Teachers" value={stats.teachers} icon={Users} variant="info" />
        <StatCard title="Courses" value={stats.courses} icon={BookOpen} variant="warning" />
        <StatCard title="Enrollments" value={stats.enrollments} icon={ClipboardList} variant="success" />
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-2xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            {quickActions.map((a) => (
              <Link key={a.label} to={a.href}>
                <Button variant="outline" className="w-full h-auto py-3 sm:py-4 flex flex-col items-center gap-1.5 sm:gap-2 hover:bg-muted/50 transition-all group active:scale-[0.97]">
                  <div className={`p-2 sm:p-3 rounded-lg ${a.color} text-white`}>
                    <a.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="font-medium text-xs sm:text-sm">{a.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
