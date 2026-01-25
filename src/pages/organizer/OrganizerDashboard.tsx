import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/hooks/useEvents';
import {
  Calendar,
  Users,
  Ticket,
  TrendingUp,
  Plus,
  Clock,
  MapPin,
  CalendarDays,
} from 'lucide-react';
import { format } from 'date-fns';

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { events, isLoading } = useEvents({ createdByMe: true });

  const totalRegistrations = events.reduce((sum, e) => sum + (e.registration_count || 0), 0);
  const publishedEvents = events.filter((e) => e.status === 'published');
  const upcomingEvents = events.filter(
    (e) => e.status === 'published' && new Date(e.start_date) > new Date()
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Event Organizer Dashboard"
        description="Manage your events and track registrations"
        showBackButton={false}
        actions={
          <Button onClick={() => navigate('/organizer/events')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Events"
          value={events.length}
          icon={Calendar}
          description="All time events"
        />
        <StatCard
          title="Published Events"
          value={publishedEvents.length}
          icon={CalendarDays}
          description="Live and visible"
        />
        <StatCard
          title="Total Registrations"
          value={totalRegistrations}
          icon={Users}
          description="All participants"
        />
        <StatCard
          title="Upcoming Events"
          value={upcomingEvents.length}
          icon={Ticket}
          description="Scheduled ahead"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming events</p>
                <p className="text-sm mt-1">Create your first event to get started</p>
                <Button className="mt-4" variant="outline" onClick={() => navigate('/organizer/events')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/organizer/events')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.start_date), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{event.registration_count || 0}</p>
                      <p className="text-xs text-muted-foreground">registrations</p>
                    </div>
                  </div>
                ))}
                {upcomingEvents.length > 4 && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => navigate('/organizer/events')}
                  >
                    View all {upcomingEvents.length} upcoming events
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/organizer/events')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Manage Events
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/live-sessions')}
            >
              <Clock className="h-4 w-4 mr-2" />
              Live Sessions
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Card */}
      <Card className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-200 dark:border-violet-900">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Welcome, Event Organizer!</h3>
              <p className="text-muted-foreground">
                Start creating and managing events for your college community. 
                You can organize workshops, seminars, cultural events, and more.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}