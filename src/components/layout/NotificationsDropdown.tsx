import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle2, AlertTriangle, Info, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'announcement';
  created_at: string;
  is_read: boolean;
}

// Mock notifications - In production, fetch from database
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Attendance Reminder',
    message: 'Don\'t forget to mark your attendance',
    type: 'info',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    is_read: false,
  },
  {
    id: '2',
    title: 'Low Attendance Alert',
    message: 'Your attendance is below 75%',
    type: 'warning',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    is_read: false,
  },
];

const typeConfig = {
  info: { icon: Info, color: 'text-info', bg: 'bg-info/10' },
  warning: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
  success: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  announcement: { icon: Megaphone, color: 'text-primary', bg: 'bg-primary/10' },
};

export function NotificationsDropdown() {
  const { isStudent } = useUserRole();
  const [notifications, setNotifications] = useState<Notification[]>(
    isStudent ? mockNotifications : []
  );
  
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, is_read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <>
            {notifications.slice(0, 5).map((notification) => {
              const config = typeConfig[notification.type];
              const Icon = config.icon;
              
              return (
                <DropdownMenuItem 
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 p-3 cursor-pointer',
                    !notification.is_read && 'bg-primary/5'
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className={cn(
                    'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    config.bg
                  )}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{notification.title}</p>
                      {!notification.is_read && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-primary/10 text-primary">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(parseISO(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })}
            
            {isStudent && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link 
                    to="/student/notices" 
                    className="w-full text-center text-sm text-primary hover:text-primary"
                  >
                    View all notifications
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
