import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users, GraduationCap, BookOpen, ClipboardList,
  UserPlus, Shield, FileText, AlertTriangle, Bell,
  Activity, ArrowRight, Calendar, MessageSquare, Search,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useAuditLogs, AuditLogEntry } from '@/hooks/useAuditLog';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';

const ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  login: { label: 'Logged in', color: 'bg-info/10 text-info', icon: '🔑' },
  logout: { label: 'Logged out', color: 'bg-muted text-muted-foreground', icon: '🚪' },
  leave_approved: { label: 'Leave approved', color: 'bg-success/10 text-success', icon: '✅' },
  leave_rejected: { label: 'Leave rejected', color: 'bg-destructive/10 text-destructive', icon: '❌' },
  grade_updated: { label: 'Grade updated', color: 'bg-warning/10 text-warning', icon: '📝' },
  grade_published: { label: 'Results published', color: 'bg-primary/10 text-primary', icon: '📊' },
  attendance_edited: { label: 'Attendance edited', color: 'bg-warning/10 text-warning', icon: '✏️' },
  attendance_marked: { label: 'Attendance marked', color: 'bg-success/10 text-success', icon: '✓' },
  user_created: { label: 'User created', color: 'bg-primary/10 text-primary', icon: '👤' },
  password_reset: { label: 'Password reset', color: 'bg-warning/10 text-warning', icon: '🔒' },
  profile_approved: { label: 'Profile approved', color: 'bg-success/10 text-success', icon: '✅' },
  profile_rejected: { label: 'Profile rejected', color: 'bg-destructive/10 text-destructive', icon: '❌' },
  student_created: { label: 'Student added', color: 'bg-primary/10 text-primary', icon: '🎓' },
  teacher_created: { label: 'Teacher added', color: 'bg-info/10 text-info', icon: '👨‍🏫' },
  book_issued: { label: 'Book issued', color: 'bg-success/10 text-success', icon: '📚' },
  book_returned: { label: 'Book returned', color: 'bg-info/10 text-info', icon: '📖' },
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ students: 0, teachers: 0, courses: 0, enrollments: 0 });
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [overdueBooks, setOverdueBooks] = useState(0);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [activityFilter, setActivityFilter] = useState('');
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
          fetchLogs(20),
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

  const filteredEntries = useMemo(() => {
    if (!activityFilter.trim()) return auditEntries;
    const q = activityFilter.toLowerCase();
    return auditEntries.filter(e => {
      const info = ACTION_LABELS[e.action];
      const label = info?.label || e.action;
      return label.toLowerCase().includes(q) || e.entity_type.toLowerCase().includes(q) || e.action.toLowerCase().includes(q);
    });
  }, [auditEntries, activityFilter]);

  const quickActions = useMemo(() => [
    { label: 'Add Student', href: '/students', icon: UserPlus, color: 'bg-success text-success-foreground' },
    { label: 'Add Teacher', href: '/teachers', icon: Users, color: 'bg-info text-info-foreground' },
    { label: 'Add Course', href: '/courses', icon: BookOpen, color: 'bg-primary text-primary-foreground' },
    { label: 'Enrollments', href: '/enrollments', icon: ClipboardList, color: 'bg-accent text-accent-foreground' },
  ], []);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-6 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader title="Admin Dashboard" description="System overview and management">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
          <Shield className="h-4 w-4" />
          Full Access
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
        <Link to="/students" className="block">
          <StatCard
            title="Total Students"
            value={stats.students}
            icon={GraduationCap}
            trend={{ value: 5, isPositive: true }}
          />
        </Link>
        <Link to="/teachers" className="block">
          <StatCard
            title="Total Teachers"
            value={stats.teachers}
            icon={Users}
            variant="info"
            trend={{ value: 2, isPositive: true }}
          />
        </Link>
        <Link to="/courses" className="block">
          <StatCard
            title="Active Courses"
            value={stats.courses}
            icon={BookOpen}
            variant="warning"
          />
        </Link>
        <Link to="/enrollments" className="block">
          <StatCard
            title="Enrollments"
            value={stats.enrollments}
            icon={ClipboardList}
            variant="success"
            trend={{ value: 12, isPositive: true }}
          />
        </Link>
      </div>

      {/* Pending Actions */}
      {(pendingApprovals > 0 || pendingLeaves > 0 || overdueBooks > 0) && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {pendingApprovals > 0 && (
            <Link to="/admin/profile-approvals">
              <Card className="border-warning/30 bg-warning/5 hover:bg-warning/10 transition-all duration-300 cursor-pointer card-hover">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="p-2.5 rounded-xl bg-warning/20"><FileText className="h-5 w-5 text-warning" /></div>
                  <div>
                    <p className="font-semibold text-sm">{pendingApprovals} Profile Approvals</p>
                    <p className="text-xs text-muted-foreground">Pending review</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            </Link>
          )}
          {pendingLeaves > 0 && (
            <Card className="border-info/30 bg-info/5 card-hover">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2.5 rounded-xl bg-info/20"><ClipboardList className="h-5 w-5 text-info" /></div>
                <div>
                  <p className="font-semibold text-sm">{pendingLeaves} Leave Requests</p>
                  <p className="text-xs text-muted-foreground">Awaiting approval</p>
                </div>
              </CardContent>
            </Card>
          )}
          {overdueBooks > 0 && (
            <Link to="/admin/library">
              <Card className="border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-all duration-300 cursor-pointer card-hover">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="p-2.5 rounded-xl bg-destructive/20"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
                  <div>
                    <p className="font-semibold text-sm">{overdueBooks} Overdue Books</p>
                    <p className="text-xs text-muted-foreground">Needs attention</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Activity Log */}
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader className="p-4 sm:p-6 pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
            </div>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter activity..."
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="pl-9 h-9 text-sm rounded-xl bg-muted/40 border-border/50"
              />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            {filteredEntries.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No Activity"
                description={activityFilter ? 'No matching activity found' : 'No activity recorded yet'}
                className="py-8"
              />
            ) : (
              <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
                {filteredEntries.map((entry, idx) => {
                  const info = ACTION_LABELS[entry.action] ?? { label: entry.action, color: 'bg-muted text-muted-foreground', icon: '📋' };
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 text-sm py-2.5 px-2 rounded-lg hover:bg-muted/30 transition-colors"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <span className="text-base flex-shrink-0">{info.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{info.label}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.entity_type}{entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}…` : ''}
                        </p>
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap font-medium">
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
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="grid gap-3 grid-cols-2">
              {quickActions.map((a) => (
                <Link key={a.label} to={a.href}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-muted/50 transition-all duration-300 group rounded-xl border-border/50 btn-interact"
                  >
                    <div className={cn('p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110', a.color)}>
                      <a.icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="font-medium text-sm">{a.label}</span>
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
