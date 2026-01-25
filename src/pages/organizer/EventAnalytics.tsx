import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Users,
  TrendingUp,
  BarChart3,
  PieChart,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { useEvents } from '@/hooks/useEvents';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

export default function EventAnalytics() {
  const { events, isLoading } = useEvents({ createdByMe: true });

  // Calculate stats
  const totalEvents = events.length;
  const publishedEvents = events.filter((e) => e.status === 'published').length;
  const completedEvents = events.filter((e) => e.status === 'completed').length;
  const totalRegistrations = events.reduce((sum, e) => sum + (e.registration_count || 0), 0);

  // Event type distribution
  const eventTypeData = events.reduce((acc, event) => {
    const type = event.event_type;
    const existing = acc.find((item) => item.name === type);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: type, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Status distribution
  const statusData = [
    { name: 'Draft', value: events.filter((e) => e.status === 'draft').length, color: 'hsl(var(--muted-foreground))' },
    { name: 'Published', value: events.filter((e) => e.status === 'published').length, color: 'hsl(var(--success))' },
    { name: 'Completed', value: events.filter((e) => e.status === 'completed').length, color: 'hsl(var(--info))' },
    { name: 'Cancelled', value: events.filter((e) => e.status === 'cancelled').length, color: 'hsl(var(--destructive))' },
  ].filter((item) => item.value > 0);

  // Monthly events (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const month = format(date, 'MMM');
    const count = events.filter((e) => {
      const eventDate = new Date(e.start_date);
      return (
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    }).length;
    return { month, events: count };
  });

  // Top events by registration
  const topEvents = [...events]
    .sort((a, b) => (b.registration_count || 0) - (a.registration_count || 0))
    .slice(0, 5);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Event Analytics"
          description="Insights and reports for your events"
          showBackButton
        />

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Events"
            value={totalEvents}
            icon={Calendar}
            description="All time"
          />
          <StatCard
            title="Published"
            value={publishedEvents}
            icon={CheckCircle}
            description="Currently active"
          />
          <StatCard
            title="Completed"
            value={completedEvents}
            icon={Clock}
            description="Successfully held"
          />
          <StatCard
            title="Total Registrations"
            value={totalRegistrations}
            icon={Users}
            description="All events"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Monthly Events Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Events Over Time
              </CardTitle>
              <CardDescription>Last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis allowDecimals={false} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="events" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Event Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Event Status
              </CardTitle>
              <CardDescription>Distribution by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event Type & Top Events */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Event Types */}
          <Card>
            <CardHeader>
              <CardTitle>Event Types</CardTitle>
              <CardDescription>Distribution by category</CardDescription>
            </CardHeader>
            <CardContent>
              {eventTypeData.length > 0 ? (
                <div className="space-y-3">
                  {eventTypeData.map((type, index) => (
                    <div key={type.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="capitalize">{type.name}</span>
                      </div>
                      <Badge variant="secondary">{type.value}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No events yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Top Events
              </CardTitle>
              <CardDescription>By registrations</CardDescription>
            </CardHeader>
            <CardContent>
              {topEvents.length > 0 ? (
                <div className="space-y-3">
                  {topEvents.map((event, index) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.start_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{event.registration_count || 0}</p>
                        <p className="text-xs text-muted-foreground">registrations</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No events yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">
                  {totalRegistrations > 0
                    ? Math.round(totalRegistrations / Math.max(totalEvents, 1))
                    : 0}
                </p>
                <p className="text-sm text-muted-foreground">Avg. Registrations/Event</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-success">
                  {totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-info">{eventTypeData.length}</p>
                <p className="text-sm text-muted-foreground">Event Categories</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-warning">
                  {events.filter((e) => new Date(e.start_date) > new Date()).length}
                </p>
                <p className="text-sm text-muted-foreground">Upcoming Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
