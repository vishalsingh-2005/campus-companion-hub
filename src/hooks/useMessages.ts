import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  body: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  sender_name?: string;
  sender_email?: string;
  recipient_name?: string;
  recipient_email?: string;
}

export function useMessages() {
  const { user } = useAuth();
  const [inbox, setInbox] = useState<Message[]>([]);
  const [sent, setSent] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch inbox
      const { data: inboxData, error: inboxError } = await supabase
        .from('messages')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (inboxError) throw inboxError;

      // Fetch sent
      const { data: sentData, error: sentError } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;

      // Enrich with profile names
      const allUserIds = new Set<string>();
      inboxData?.forEach(m => { allUserIds.add(m.sender_id); allUserIds.add(m.recipient_id); });
      sentData?.forEach(m => { allUserIds.add(m.sender_id); allUserIds.add(m.recipient_id); });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', Array.from(allUserIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichMessage = (m: any): Message => ({
        ...m,
        sender_name: profileMap.get(m.sender_id)?.full_name || 'Unknown',
        sender_email: profileMap.get(m.sender_id)?.email || '',
        recipient_name: profileMap.get(m.recipient_id)?.full_name || 'Unknown',
        recipient_email: profileMap.get(m.recipient_id)?.email || '',
      });

      const enrichedInbox = (inboxData || []).map(enrichMessage);
      const enrichedSent = (sentData || []).map(enrichMessage);

      setInbox(enrichedInbox);
      setSent(enrichedSent);
      setUnreadCount(enrichedInbox.filter(m => !m.is_read).length);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
        () => { fetchMessages(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `sender_id=eq.${user.id}` },
        () => { fetchMessages(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchMessages]);

  const sendMessage = async (recipientId: string, subject: string, body: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('messages')
        .insert({ sender_id: user.id, recipient_id: recipientId, subject, body });

      if (error) throw error;
      toast.success('Message sent!');
      await fetchMessages();
    } catch (error: any) {
      toast.error('Failed to send message: ' + error.message);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
      
      setInbox(prev => prev.map(m => m.id === messageId ? { ...m, is_read: true } : m));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      toast.success('Message deleted');
      await fetchMessages();
    } catch (error: any) {
      toast.error('Failed to delete message');
    }
  };

  return { inbox, sent, loading, unreadCount, sendMessage, markAsRead, deleteMessage, refetch: fetchMessages };
}
