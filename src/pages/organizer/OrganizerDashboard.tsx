import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
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

export default function OrganizerDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Event Organizer Dashboard"
        description="Manage your events and track registrations"
        showBackButton={false}
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Events"
          value={0}
          icon={Calendar}
          description="All time events"
        />
        <StatCard
          title="Active Events"
          value={0}
          icon={CalendarDays}
          description="Currently running"
        />
        <StatCard
          title="Total Registrations"
          value={0}
          icon={Users}
          description="All participants"
        />
        <StatCard
          title="Tickets Sold"
          value={0}
          icon={Ticket}
          description="This month"
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
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming events</p>
              <p className="text-sm mt-1">Create your first event to get started</p>
              <Button className="mt-4" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm mt-1">Activity will appear here once you start organizing</p>
            </div>
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