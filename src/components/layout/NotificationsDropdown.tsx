import { Link } from 'react-router-dom';
import { Bell, CheckCircle2, AlertTriangle, Info, Megaphone, MessageSquare, Mail } from 'lucide-react';
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
import { useMessages } from '@/hooks/useMessages';

export function NotificationsDropdown() {
  const { inbox, unreadCount, markAsRead } = useMessages();
  const unreadMessages = inbox.filter(m => !m.is_read).slice(0, 5);

  const markAllAsRead = async () => {
    for (const msg of unreadMessages) {
      await markAsRead(msg.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
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
        
        {unreadMessages.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No new notifications</p>
          </div>
        ) : (
          <>
            {unreadMessages.map((message) => (
              <DropdownMenuItem 
                key={message.id}
                className="flex items-start gap-3 p-3 cursor-pointer bg-primary/5"
                onClick={() => markAsRead(message.id)}
              >
                <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">
                      {message.sender_name}
                    </p>
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-primary/10 text-primary">
                      New
                    </Badge>
                  </div>
                  <p className="text-xs font-medium truncate">{message.subject || 'No subject'}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {message.body}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(parseISO(message.created_at), { addSuffix: true })}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link 
                to="/messages" 
                className="w-full text-center text-sm text-primary hover:text-primary"
              >
                View all messages
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
