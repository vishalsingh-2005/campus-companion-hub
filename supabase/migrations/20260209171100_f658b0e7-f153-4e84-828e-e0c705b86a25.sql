
-- Create messages table for inter-role communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Sender can view their sent messages
CREATE POLICY "Users can view sent messages"
ON public.messages FOR SELECT
USING (sender_id = auth.uid());

-- Recipient can view their received messages
CREATE POLICY "Users can view received messages"
ON public.messages FOR SELECT
USING (recipient_id = auth.uid());

-- Authenticated users can send messages
CREATE POLICY "Authenticated users can send messages"
ON public.messages FOR INSERT
WITH CHECK (sender_id = auth.uid());

-- Recipients can update (mark as read)
CREATE POLICY "Recipients can update messages"
ON public.messages FOR UPDATE
USING (recipient_id = auth.uid());

-- Senders can delete their own messages
CREATE POLICY "Senders can delete messages"
ON public.messages FOR DELETE
USING (sender_id = auth.uid());

-- Admins can manage all messages
CREATE POLICY "Admins can manage all messages"
ON public.messages FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Timestamp trigger
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
