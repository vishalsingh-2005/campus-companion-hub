import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  Megaphone, 
  Calendar, 
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'announcement' | 'reminder' | 'alert' | 'info';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  expires_at: string | null;
  is_read: boolean;
}

// Mock notices for demonstration - In production, this would come from a database
const mockNotices: Notice[] = [
  {
    id: '1',
    title: 'Semester Exam Schedule Released',
    content: 'The final examination schedule for the current semester has been published. Please check the academic portal for your exam dates and timings. Ensure you have registered for all required courses.',
    type: 'announcement',
    priority: 'high',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    expires_at: null,
    is_read: false,
  },
  {
    id: '2',
    title: 'Low Attendance Warning',
    content: 'Your attendance in CS301 - Data Structures is below 75%. Please attend classes regularly to meet the minimum attendance requirement.',
    type: 'alert',
    priority: 'high',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    expires_at: null,
    is_read: false,
  },
  {
    id: '3',
    title: 'Library Books Due Tomorrow',
    content: 'You have 2 books due for return tomorrow. Please return them to avoid late fees.',
    type: 'reminder',
    priority: 'medium',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    expires_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    is_read: true,
  },
  {
    id: '4',
    title: 'Campus WiFi Maintenance',
    content: 'Scheduled maintenance will be performed on campus WiFi networks this weekend from Saturday 10 PM to Sunday 6 AM. Plan accordingly.',
    type: 'info',
    priority: 'low',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    expires_at: null,
    is_read: true,
  },
  {
    id: '5',
    title: 'Sports Day Registration Open',
    content: 'Annual Sports Day registrations are now open. Register for your favorite events through the student portal. Last date for registration is next Friday.',
    type: 'announcement',
    priority: 'medium',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    expires_at: null,
    is_read: true,
  },
];

const typeConfig = {
  announcement: { icon: Megaphone, color: 'text-primary', bg: 'bg-primary/10' },
  reminder: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  alert: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  info: { icon: Info, color: 'text-info', bg: 'bg-info/10' },
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', color: 'bg-warning/10 text-warning' },
  high: { label: 'Urgent', color: 'bg-destructive/10 text-destructive' },
};

export default function StudentNotices() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    // Simulate loading from database
    const timer = setTimeout(() => {
      setNotices(mockNotices);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const filteredNotices = filter === 'unread' 
    ? notices.filter(n => !n.is_read)
    : notices;

  const unreadCount = notices.filter(n => !n.is_read).length;

  const markAsRead = (noticeId: string) => {
    setNotices(notices.map(n => 
      n.id === noticeId ? { ...n, is_read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotices(notices.map(n => ({ ...n, is_read: true })));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Notices & Notifications"
          description="Stay updated with college announcements and alerts"
        />
        
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{notices.length}</p>
              <p className="text-sm text-muted-foreground">Total Notices</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unreadCount}</p>
              <p className="text-sm text-muted-foreground">Unread</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <Megaphone className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {notices.filter(n => n.type === 'announcement').length}
              </p>
              <p className="text-sm text-muted-foreground">Announcements</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {notices.filter(n => n.type === 'reminder').length}
              </p>
              <p className="text-sm text-muted-foreground">Reminders</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
        <TabsList>
          <TabsTrigger value="all">
            All Notices
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-2">
            Unread
            {unreadCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {filteredNotices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium">No notices</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {filter === 'unread' ? 'All caught up!' : 'Check back later for updates'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredNotices.map((notice) => {
                const config = typeConfig[notice.type];
                const priority = priorityConfig[notice.priority];
                const Icon = config.icon;

                return (
                  <Card 
                    key={notice.id}
                    className={cn(
                      'transition-all',
                      !notice.is_read && 'border-primary/30 bg-primary/5'
                    )}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          'h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0',
                          config.bg
                        )}>
                          <Icon className={cn('h-6 w-6', config.color)} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold">{notice.title}</h3>
                            {!notice.is_read && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary">
                                New
                              </Badge>
                            )}
                            <Badge variant="secondary" className={priority.color}>
                              {priority.label}
                            </Badge>
                          </div>
                          
                          <p className="text-muted-foreground mb-3">
                            {notice.content}
                          </p>
                          
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {formatDistanceToNow(parseISO(notice.created_at), { addSuffix: true })}
                              </span>
                              {notice.expires_at && (
                                <>
                                  <span>•</span>
                                  <span>
                                    Expires {format(parseISO(notice.expires_at), 'MMM d, yyyy')}
                                  </span>
                                </>
                              )}
                            </div>
                            
                            {!notice.is_read && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => markAsRead(notice.id)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark as Read
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
