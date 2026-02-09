import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useMessages, Message } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  MessageSquare, Send, Inbox, SendHorizontal, Mail, MailOpen,
  Trash2, Plus, Search, Clock, User, Loader2
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

function ComposeDialog({ onSend }: { onSend: (recipientId: string, subject: string, body: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (!open) return;
    async function fetchUsers() {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .neq('user_id', user?.id || '');

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      setUsers(
        (profiles || [])
          .filter(p => p.full_name)
          .map(p => ({
            id: p.user_id,
            name: p.full_name || 'Unknown',
            email: p.email || '',
            role: roleMap.get(p.user_id) || 'user',
          }))
      );
    }
    fetchUsers();
  }, [open, user]);

  const handleSend = async () => {
    if (!recipientId || !body.trim()) {
      toast.error('Please select a recipient and write a message');
      return;
    }
    setSending(true);
    await onSend(recipientId, subject, body);
    setSending(false);
    setRecipientId('');
    setSubject('');
    setBody('');
    setOpen(false);
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = { admin: 'Admin', teacher: 'Teacher', student: 'Student', event_organizer: 'Organizer' };
    return labels[role] || role;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Compose
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            New Message
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>To</Label>
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2"
            />
            {recipientId && (
              <Badge variant="secondary" className="mb-2">
                {users.find(u => u.id === recipientId)?.name}
                <button onClick={() => setRecipientId('')} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            {!recipientId && searchTerm && (
              <ScrollArea className="h-32 border rounded-md">
                {filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setRecipientId(u.id); setSearchTerm(''); }}
                    className="w-full flex items-center gap-3 p-2 hover:bg-muted/50 text-left"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{u.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{roleLabel(u.role)}</Badge>
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
                )}
              </ScrollArea>
            )}
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              placeholder="Message subject (optional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Write your message..."
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <Button onClick={handleSend} disabled={sending} className="w-full gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            Send Message
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MessageCard({ message, type, onRead, onDelete }: {
  message: Message;
  type: 'inbox' | 'sent';
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isUnread = type === 'inbox' && !message.is_read;
  const displayName = type === 'inbox' ? message.sender_name : message.recipient_name;
  const displayEmail = type === 'inbox' ? message.sender_email : message.recipient_email;

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all cursor-pointer hover:shadow-sm',
        isUnread ? 'bg-primary/5 border-primary/20' : 'bg-card hover:bg-muted/30'
      )}
      onClick={() => {
        setExpanded(!expanded);
        if (isUnread) onRead(message.id);
      }}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarFallback className={cn(
            'text-sm',
            isUnread ? 'bg-primary/20 text-primary' : 'bg-muted'
          )}>
            {displayName?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn('font-medium truncate', isUnread && 'font-semibold')}>
              {displayName}
            </p>
            {isUnread && <Badge className="bg-primary/20 text-primary text-[10px] px-1.5">New</Badge>}
          </div>
          {message.subject && (
            <p className="text-sm font-medium truncate">{message.subject}</p>
          )}
          <p className={cn('text-sm text-muted-foreground', expanded ? '' : 'line-clamp-1')}>
            {message.body}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(parseISO(message.created_at), { addSuffix: true })}
          </span>
          {type === 'inbox' ? (
            message.is_read ? <MailOpen className="h-4 w-4 text-muted-foreground" /> : <Mail className="h-4 w-4 text-primary" />
          ) : (
            <SendHorizontal className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">
              {format(parseISO(message.created_at), 'PPp')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive gap-1"
              onClick={(e) => { e.stopPropagation(); onDelete(message.id); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  const { inbox, sent, loading, unreadCount, sendMessage, markAsRead, deleteMessage } = useMessages();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInbox = inbox.filter(m =>
    m.sender_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSent = sent.filter(m =>
    m.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Messages" description="Communicate with admins, teachers, and students">
          <ComposeDialog onSend={sendMessage} />
        </PageHeader>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Tabs defaultValue="inbox">
          <TabsList>
            <TabsTrigger value="inbox" className="gap-2">
              <Inbox className="h-4 w-4" />
              Inbox
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <SendHorizontal className="h-4 w-4" />
              Sent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredInbox.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Inbox className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-lg">No messages yet</p>
                  <p className="text-muted-foreground mt-1">Your inbox is empty</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredInbox.map(msg => (
                  <MessageCard key={msg.id} message={msg} type="inbox" onRead={markAsRead} onDelete={deleteMessage} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredSent.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <SendHorizontal className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-lg">No sent messages</p>
                  <p className="text-muted-foreground mt-1">Messages you send will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredSent.map(msg => (
                  <MessageCard key={msg.id} message={msg} type="sent" onRead={markAsRead} onDelete={deleteMessage} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
