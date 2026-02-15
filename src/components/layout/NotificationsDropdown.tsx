import { Link } from 'react-router-dom';
import { Bell, BookOpen, CalendarDays, ClipboardList, CheckCircle, FileText, Megaphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useNotifications } from '@/hooks/useNotifications';
import { useMessages } from '@/hooks/useMessages';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, typeof Bell> = {
  assignment: FileText,
  leave: ClipboardList,
  library: BookOpen,
  event: CalendarDays,
  announcement: Megaphone,
  general: Bell,
};

const TYPE_COLORS: Record<string, string> = {
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  error: 'bg-destructive text-destructive-foreground',
  info: 'bg-info text-info-foreground',
};

export function NotificationsDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { unreadCount: unreadMessages } = useMessages();

  const totalUnread = unreadCount + unreadMessages;
  const recentNotifications = notifications.slice(0, 8);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl h-9 w-9 hover:bg-primary/5">
          <Bell className="h-4.5 w-4.5 text-muted-foreground" />
          {totalUnread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 rounded-full gradient-primary text-white text-[10px] font-bold flex items-center justify-center shadow-glow">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-2xl p-0 overflow-hidden">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3 bg-muted/30">
          <span className="font-semibold font-display">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-primary hover:text-primary/80 font-semibold"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />

        {recentNotifications.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Bell className="h-5 w-5 opacity-40" />
            </div>
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">No new notifications</p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[360px]">
              {recentNotifications.map((notif) => {
                const Icon = CATEGORY_ICONS[notif.category] || Bell;
                const colorClass = TYPE_COLORS[notif.type] || 'gradient-primary';
                return (
                  <DropdownMenuItem
                    key={notif.id}
                    className={cn(
                      'flex items-start gap-3 p-4 cursor-pointer hover:bg-primary/5 focus:bg-primary/5 rounded-none border-b border-border/30 last:border-0',
                      !notif.is_read && 'bg-primary/[0.03]'
                    )}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm', colorClass)}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{notif.title}</p>
                        {!notif.is_read && <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(parseISO(notif.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </ScrollArea>
            <div className="p-2 bg-muted/20">
              <Link
                to="/messages"
                className="flex items-center justify-center w-full py-2 text-sm font-semibold text-primary hover:text-primary/80 rounded-xl hover:bg-primary/5 transition-colors"
              >
                View all messages
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
