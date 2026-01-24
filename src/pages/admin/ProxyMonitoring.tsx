import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/ui/stat-card';
import { useProxyAttempts, useAttemptTypes, SuspiciousPattern } from '@/hooks/useProxyAttempts';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  Shield,
  AlertTriangle,
  Users,
  Wifi,
  Smartphone,
  Search,
  RefreshCw,
  Eye,
  MapPin,
  Clock,
  TrendingUp,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = [
  'hsl(0, 84%, 60%)',
  'hsl(38, 92%, 50%)',
  'hsl(199, 89%, 48%)',
  'hsl(142, 76%, 36%)',
  'hsl(262, 83%, 58%)',
  'hsl(173, 58%, 39%)',
];

const SEVERITY_COLORS = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-blue-500 text-white',
};

const SEVERITY_ICONS = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: AlertTriangle,
  low: Eye,
};

export default function ProxyMonitoring() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [attemptType, setAttemptType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { attempts, stats, patterns, isLoading, refetch } = useProxyAttempts({
    dateRange,
    attemptType: attemptType === 'all' ? undefined : attemptType || undefined,
  });
  
  const { data: attemptTypes } = useAttemptTypes();

  // Filter by search query
  const filteredAttempts = attempts.filter(a => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.students?.first_name?.toLowerCase().includes(query) ||
      a.students?.last_name?.toLowerCase().includes(query) ||
      a.students?.student_id?.toLowerCase().includes(query) ||
      a.ip_address?.toLowerCase().includes(query) ||
      a.failure_reason.toLowerCase().includes(query) ||
      a.attempt_type.toLowerCase().includes(query)
    );
  });

  // Prepare chart data
  const attemptTypeData = stats?.attemptsByType
    ? Object.entries(stats.attemptsByType).map(([name, value]) => ({ name, value }))
    : [];

  const reasonData = stats?.attemptsByReason
    ? Object.entries(stats.attemptsByReason)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, value]) => ({ name: name.length > 25 ? name.slice(0, 25) + '...' : name, value }))
    : [];

  const hourlyData = stats?.hourlyDistribution
    ? Array.from({ length: 24 }, (_, i) => ({
        hour: i.toString().padStart(2, '0') + ':00',
        attempts: stats.hourlyDistribution[i.toString().padStart(2, '0')] || 0,
      }))
    : [];

  const trendData = stats?.recentTrend.map(d => ({
    ...d,
    date: format(new Date(d.date), 'MMM d'),
  })) || [];

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/access-denied" replace />;
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Proxy Monitoring Dashboard"
        description="Review suspicious activity and attendance fraud patterns"
      >
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student, IP, reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Last 24 hours</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={attemptType || 'all'} onValueChange={(v) => setAttemptType(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Attempt type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {attemptTypes?.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard
              title="Total Attempts"
              value={stats?.totalAttempts || 0}
              icon={Shield}
              variant="default"
              description="Proxy attempts detected"
            />
            <StatCard
              title="Unique Students"
              value={stats?.uniqueStudents || 0}
              icon={Users}
              variant="warning"
              description="Students involved"
            />
            <StatCard
              title="Unique IPs"
              value={stats?.uniqueIPs || 0}
              icon={Wifi}
              variant="info"
              description="Different IP addresses"
            />
            <StatCard
              title="Unique Devices"
              value={stats?.uniqueDevices || 0}
              icon={Smartphone}
              variant="success"
              description="Different device fingerprints"
            />
          </div>

          <Tabs defaultValue="patterns" className="space-y-6">
            <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-4 gap-2">
              <TabsTrigger value="patterns" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Patterns
                {patterns.length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {patterns.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Logs
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </TabsTrigger>
            </TabsList>

            {/* Suspicious Patterns Tab */}
            <TabsContent value="patterns" className="space-y-6">
              {patterns.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-success opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Suspicious Patterns Detected</h3>
                    <p className="text-muted-foreground">
                      All activity appears normal within the selected time range.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {patterns.map((pattern, index) => (
                    <PatternCard key={index} pattern={pattern} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Attempts by Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Attempts by Type
                    </CardTitle>
                    <CardDescription>Distribution of proxy attempt types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      {attemptTypeData.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          No data available
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={attemptTypeData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={2}
                              dataKey="value"
                              nameKey="name"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {attemptTypeData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Failure Reasons */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      Top Failure Reasons
                    </CardTitle>
                    <CardDescription>Most common reasons for failed attempts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      {reasonData.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          No data available
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reasonData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis
                              dataKey="name"
                              type="category"
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={11}
                              width={150}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                            <Bar dataKey="value" fill="hsl(0, 84%, 60%)" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 7-Day Trend */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      7-Day Trend
                    </CardTitle>
                    <CardDescription>Daily proxy attempts over the last week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                          <defs>
                            <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke="hsl(0, 84%, 60%)"
                            fillOpacity={1}
                            fill="url(#colorAttempts)"
                            name="Attempts"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle>Attempt Logs</CardTitle>
                  <CardDescription>
                    Showing {filteredAttempts.length} of {attempts.length} attempts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border overflow-hidden">
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-card z-10">
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Location</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAttempts.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                No proxy attempts found
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredAttempts.slice(0, 100).map((attempt) => (
                              <TableRow key={attempt.id}>
                                <TableCell className="whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    {format(new Date(attempt.created_at), 'MMM d, h:mm a')}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {attempt.students ? (
                                    <div>
                                      <p className="font-medium">
                                        {attempt.students.first_name} {attempt.students.last_name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {attempt.students.student_id}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">Unknown</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {attempt.attempt_type.replace(/_/g, ' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-destructive">
                                    {attempt.failure_reason.length > 40
                                      ? attempt.failure_reason.slice(0, 40) + '...'
                                      : attempt.failure_reason}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {attempt.ip_address ? (
                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                      {attempt.ip_address}
                                    </code>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {attempt.latitude && attempt.longitude ? (
                                    <div className="flex items-center gap-1 text-xs">
                                      <MapPin className="h-3 w-3" />
                                      {attempt.latitude.toFixed(4)}, {attempt.longitude.toFixed(4)}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  {filteredAttempts.length > 100 && (
                    <p className="text-sm text-muted-foreground mt-4 text-center">
                      Showing first 100 of {filteredAttempts.length} results
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Hourly Distribution
                  </CardTitle>
                  <CardDescription>When proxy attempts occur throughout the day</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="hour"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          interval={1}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [`${value} attempts`, 'Count']}
                        />
                        <Bar dataKey="attempts" fill="hsl(173, 58%, 39%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </DashboardLayout>
  );
}

function PatternCard({ pattern }: { pattern: SuspiciousPattern }) {
  const SeverityIcon = SEVERITY_ICONS[pattern.severity];
  
  return (
    <Card className={cn(
      'border-l-4',
      pattern.severity === 'critical' && 'border-l-destructive',
      pattern.severity === 'high' && 'border-l-orange-500',
      pattern.severity === 'medium' && 'border-l-yellow-500',
      pattern.severity === 'low' && 'border-l-blue-500'
    )}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={cn('p-2 rounded-lg', SEVERITY_COLORS[pattern.severity])}>
            <SeverityIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={SEVERITY_COLORS[pattern.severity]}>
                {pattern.severity.toUpperCase()}
              </Badge>
              <Badge variant="outline">
                {pattern.type.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="font-medium mb-2">{pattern.description}</p>
            <div className="text-sm text-muted-foreground space-y-1">
              {pattern.type === 'high_frequency' && (
                <p>Attempt count: {pattern.details.attemptCount}</p>
              )}
              {pattern.type === 'multiple_devices' && (
                <p>Device count: {pattern.details.deviceCount}</p>
              )}
              {(pattern.type === 'ip_sharing' || pattern.type === 'device_sharing') && (
                <>
                  <p>Students involved: {pattern.details.studentCount}</p>
                  {pattern.details.studentNames && (
                    <p>Names: {pattern.details.studentNames.join(', ')}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
