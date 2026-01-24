import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isPast, isFuture } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { SessionFormDialog } from '@/components/live-sessions/SessionFormDialog';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { useLiveSessions, useDeleteSession, LiveSession } from '@/hooks/useLiveSessions';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import {
  Video,
  Calendar,
  Users,
  Plus,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  ExternalLink,
  MonitorPlay,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-500', icon: Clock },
  waiting: { label: 'Waiting', color: 'bg-yellow-500', icon: Clock },
  live: { label: 'Live', color: 'bg-success', icon: Play },
  ended: { label: 'Ended', color: 'bg-muted', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-destructive', icon: XCircle },
};

export default function LiveSessions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isTeacher } = useUserRole();
  const { sessions, isLoading, refetch } = useLiveSessions();
  const deleteSession = useDeleteSession();

  const [formOpen, setFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<LiveSession | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canManage = isAdmin || isTeacher;

  // Categorize sessions
  const upcomingSessions = sessions.filter(s => 
    s.status === 'scheduled' && isFuture(new Date(s.scheduled_start))
  );
  const liveSessions = sessions.filter(s => s.status === 'live' || s.status === 'waiting');
  const pastSessions = sessions.filter(s => s.status === 'ended' || s.status === 'cancelled');
  const mySessions = sessions.filter(s => s.host_id === user?.id);

  const handleEdit = (session: LiveSession) => {
    setEditingSession(session);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteSession.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleJoin = (sessionId: string) => {
    navigate(`/live-room/${sessionId}`);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageHeader title="Live Sessions" description="Loading..." />
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Live Sessions"
        description="Manage live classes and interviews"
      >
        {canManage && (
          <Button onClick={() => { setEditingSession(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Session
          </Button>
        )}
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Live Now"
          value={liveSessions.length}
          icon={Play}
          variant="success"
          description="Active sessions"
        />
        <StatCard
          title="Upcoming"
          value={upcomingSessions.length}
          icon={Calendar}
          variant="info"
          description="Scheduled sessions"
        />
        <StatCard
          title="My Sessions"
          value={mySessions.length}
          icon={MonitorPlay}
          variant="warning"
          description="Sessions you're hosting"
        />
        <StatCard
          title="Total"
          value={sessions.length}
          icon={Video}
          description="All sessions"
        />
      </div>

      {/* Live sessions alert */}
      {liveSessions.length > 0 && (
        <Card className="mb-6 border-success bg-success/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-success">
              <Play className="h-5 w-5" />
              Live Now ({liveSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {liveSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-card border"
                >
                  <div>
                    <p className="font-medium">{session.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.courses?.course_name || 'No course'}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => handleJoin(session.id)}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Join
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming
            {upcomingSessions.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {upcomingSessions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-sessions" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            My Sessions
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Past
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <SessionsTable
            sessions={upcomingSessions}
            onEdit={handleEdit}
            onDelete={setDeleteId}
            onJoin={handleJoin}
            canManage={canManage}
            emptyMessage="No upcoming sessions scheduled"
          />
        </TabsContent>

        <TabsContent value="my-sessions">
          <SessionsTable
            sessions={mySessions}
            onEdit={handleEdit}
            onDelete={setDeleteId}
            onJoin={handleJoin}
            canManage={true}
            emptyMessage="You haven't created any sessions yet"
          />
        </TabsContent>

        <TabsContent value="past">
          <SessionsTable
            sessions={pastSessions}
            onEdit={handleEdit}
            onDelete={setDeleteId}
            onJoin={handleJoin}
            canManage={canManage}
            emptyMessage="No past sessions"
          />
        </TabsContent>

        <TabsContent value="all">
          <SessionsTable
            sessions={sessions}
            onEdit={handleEdit}
            onDelete={setDeleteId}
            onJoin={handleJoin}
            canManage={canManage}
            emptyMessage="No sessions found"
          />
        </TabsContent>
      </Tabs>

      <SessionFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingSession(null);
        }}
        session={editingSession}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Session"
        description="Are you sure you want to delete this session? This action cannot be undone."
      />
    </DashboardLayout>
  );
}

interface SessionsTableProps {
  sessions: LiveSession[];
  onEdit: (session: LiveSession) => void;
  onDelete: (id: string) => void;
  onJoin: (id: string) => void;
  canManage: boolean;
  emptyMessage: string;
}

function SessionsTable({ sessions, onEdit, onDelete, onJoin, canManage, emptyMessage }: SessionsTableProps) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => {
                const statusConfig = STATUS_CONFIG[session.status];
                const StatusIcon = statusConfig.icon;

                return (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{session.title}</p>
                        {session.courses && (
                          <p className="text-sm text-muted-foreground">
                            {session.courses.course_code} - {session.courses.course_name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {session.session_type === 'live_class' ? 'Live Class' : 'Interview'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{format(new Date(session.scheduled_start), 'MMM d, yyyy')}</p>
                        <p className="text-muted-foreground">
                          {format(new Date(session.scheduled_start), 'h:mm a')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'flex items-center gap-1 w-fit',
                          session.status === 'live' && 'bg-success text-success-foreground'
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(session.status === 'live' || session.status === 'scheduled') && (
                          <Button size="sm" onClick={() => onJoin(session.id)}>
                            <ExternalLink className="h-4 w-4 mr-1" />
                            {session.status === 'live' ? 'Join' : 'Start'}
                          </Button>
                        )}
                        {canManage && session.status === 'scheduled' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onEdit(session)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDelete(session.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
