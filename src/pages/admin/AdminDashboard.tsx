import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users, GraduationCap, BookOpen, ClipboardList,
  UserPlus, Shield, FileText, AlertTriangle, Bell,
  Activity, ArrowRight, Calendar, MessageSquare,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useAuditLogs, AuditLogEntry } from '@/hooks/useAuditLog';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  login: { label: 'Logged in', color: 'bg-info/10 text-info' },
  logout: { label: 'Logged out', color: 'bg-muted text-muted-foreground' },
  leave_approved: { label: 'Leave approved', color: 'bg-success/10 text-success' },
  leave_rejected: { label: 'Leave rejected', color: 'bg-destructive/10 text-destructive' },
  grade_updated: { label: 'Grade updated', color: 'bg-warning/10 text-warning' },
  grade_published: { label: 'Results published', color: 'bg-primary/10 text-primary' },
  attendance_edited: { label: 'Attendance edited', color: 'bg-warning/10 text-warning' },
  attendance_marked: { label: 'Attendance marked', color: 'bg-success/10 text-success' },
  user_created: { label: 'User created', color: 'bg-primary/10 text-primary' },
  password_reset: { label: 'Password reset', color: 'bg-warning/10 text-warning' },
  profile_approved: { label: 'Profile approved', color: 'bg-success/10 text-success' },
  profile_rejected: { label: 'Profile rejected', color: 'bg-destructive/10 text-destructive' },
  student_created: { label: 'Student added', color: 'bg-primary/10 text-primary' },
  teacher_created: { label: 'Teacher added', color: 'bg-info/10 text-info' },
  book_issued: { label: 'Book issued', color: 'bg-success/10 text-success' },
  book_returned: { label: 'Book returned', color: 'bg-info/10 text-info' },
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ students: 0, teachers: 0, courses: 0, enrollments: 0 });
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [overdueBooks, setOverdueBooks] = useState(0);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const { fetchLogs } = useAuditLogs();

  useEffect(() => {
    async function fetchAll() {
      try {
        const [s, t, c, e, approvals, leaves, bookIssues, logs] = await Promise.all([
          supabase.from('students').select('id', { count: 'exact', head: true }),
          supabase.from('teachers').select('id', { count: 'exact', head: true }),
          supabase.from('courses').select('id', { count: 'exact', head: true }),
          supabase.from('course_enrollments').select('id', { count: 'exact', head: true }),
          supabase.from('profile_update_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('book_issues').select('id, due_date').eq('status', 'issued'),
          fetchLogs(15),
        ]);

        setStats({
          students: s.count ?? 0,
          teachers: t.count ?? 0,
          courses: c.count ?? 0,
          enrollments: e.count ?? 0,
        });
        setPendingApprovals(approvals.count ?? 0);
        setPendingLeaves(leaves.count ?? 0);
        const overdue = (bookIssues.data || []).filter((i: any) => new Date(i.due_date) < new Date()).length;
        setOverdueBooks(overdue);
        setAuditEntries(logs);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [fetchLogs]);

  const quickActions = useMemo(() => [
    { label: 'Add Student', href: '/students', icon: UserPlus, color: 'bg-success' },
    { label: 'Add Teacher', href: '/teachers', icon: Users, color: 'bg-info' },
    { label: 'Add Course', href: '/courses', icon: BookOpen, color: 'bg-primary' },
    { label: 'Enrollments', href: '/enrollments', icon: ClipboardList, color: 'bg-accent' },
  ], []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Admin Dashboard" description="System overview and management">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Shield className="h-4 w-4" />
          Full Access
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Link to="/students">
          <StatCard title="Students" value={stats.students} icon={GraduationCap} />
        </Link>
        <Link to="/teachers">
          <StatCard title="Teachers" value={stats.teachers} icon={Users} variant="info" />
        </Link>
        <Link to="/courses">
          <StatCard title="Courses" value={stats.courses} icon={BookOpen} variant="warning" />
        </Link>
        <Link to="/enrollments">
          <StatCard title="Enrollments" value={stats.enrollments} icon={ClipboardList} variant="success" />
        </Link>
      </div>

      {/* Pending Actions */}
      {(pendingApprovals > 0 || pendingLeaves > 0 || overdueBooks > 0) && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {pendingApprovals > 0 && (
            <Link to="/admin/profile-approvals">
              <Card className="border-warning/30 bg-warning/5 hover:bg-warning/10 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="p-2 rounded-lg bg-warning/20"><FileText className="h-5 w-5 text-warning" /></div>
                  <div>
                    <p className="font-semibold text-sm">{pendingApprovals} Profile Approvals</p>
                    <p className="text-xs text-muted-foreground">Pending review</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {pendingLeaves > 0 && (
            <Card className="border-info/30 bg-info/5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2 rounded-lg bg-info/20"><ClipboardList className="h-5 w-5 text-info" /></div>
                <div>
                  <p className="font-semibold text-sm">{pendingLeaves} Leave Requests</p>
                  <p className="text-xs text-muted-foreground">Awaiting approval</p>
                </div>
              </CardContent>
            </Card>
          )}
          {overdueBooks > 0 && (
            <Link to="/admin/library">
              <Card className="border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="p-2 rounded-lg bg-destructive/20"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
                  <div>
                    <p className="font-semibold text-sm">{overdueBooks} Overdue Books</p>
                    <p className="text-xs text-muted-foreground">Needs attention</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Activity Log */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Recent System Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            {auditEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No activity recorded yet</p>
            ) : (
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto">
                {auditEntries.map((entry) => {
                  const info = ACTION_LABELS[entry.action] ?? { label: entry.action, color: 'bg-muted text-muted-foreground' };
                  return (
                    <div key={entry.id} className="flex items-start gap-3 text-sm py-1.5">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 shrink-0 ${info.color}`}>
                        {info.label}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.entity_type}{entry.entity_id ? ` · ${entry.entity_id}` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="grid gap-3 grid-cols-2">
              {quickActions.map((a) => (
                <Link key={a.label} to={a.href}>
                  <Button variant="outline" className="w-full h-auto py-3 flex flex-col items-center gap-1.5 hover:bg-muted/50 transition-all group active:scale-[0.97]">
                    <div className={`p-2 rounded-lg ${a.color} text-white`}>
                      <a.icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-xs">{a.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
