import { Link } from 'react-router-dom';
import { Bell, Mail } from 'lucide-react';
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
        <Button variant="ghost" size="icon" className="relative rounded-xl h-9 w-9 hover:bg-primary/5">
          <Bell className="h-4.5 w-4.5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 rounded-full gradient-primary text-white text-[10px] font-bold flex items-center justify-center shadow-glow">
              {unreadCount > 9 ? '9+' : unreadCount}
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
        
        {unreadMessages.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Bell className="h-5 w-5 opacity-40" />
            </div>
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">No new notifications</p>
          </div>
        ) : (
          <>
            {unreadMessages.map((message) => (
              <DropdownMenuItem 
                key={message.id}
                className="flex items-start gap-3 p-4 cursor-pointer hover:bg-primary/5 focus:bg-primary/5 rounded-none border-b border-border/30 last:border-0"
                onClick={() => markAsRead(message.id)}
              >
                <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 gradient-primary shadow-sm">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{message.sender_name}</p>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                  </div>
                  <p className="text-xs font-medium truncate mt-0.5">{message.subject || 'No subject'}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{message.body}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(parseISO(message.created_at), { addSuffix: true })}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
            
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