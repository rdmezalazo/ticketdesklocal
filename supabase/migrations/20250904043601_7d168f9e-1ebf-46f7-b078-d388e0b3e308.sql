-- Create support conversations table
CREATE TABLE public.support_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'resolved')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_message_at timestamp with time zone DEFAULT now()
);

-- Create support messages table
CREATE TABLE public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  file_url text,
  file_name text,
  file_size bigint,
  file_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create support participants table for tracking who's online
CREATE TABLE public.support_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online boolean NOT NULL DEFAULT false,
  is_typing boolean NOT NULL DEFAULT false,
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_participants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for support_conversations
CREATE POLICY "Users can view conversations they participate in" 
ON public.support_conversations 
FOR SELECT 
USING (
  auth.uid() = created_by OR 
  auth.uid() = assigned_to OR
  EXISTS (
    SELECT 1 FROM public.support_participants 
    WHERE conversation_id = support_conversations.id AND user_id = auth.uid()
  ) OR
  is_ti_user_safe(auth.uid()) OR
  is_gerencia_user_safe(auth.uid())
);

CREATE POLICY "Users can create conversations" 
ON public.support_conversations 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "TI and gerencia can update conversations" 
ON public.support_conversations 
FOR UPDATE 
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

-- Create RLS policies for support_messages
CREATE POLICY "Users can view messages in their conversations" 
ON public.support_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.support_conversations sc
    WHERE sc.id = conversation_id AND (
      sc.created_by = auth.uid() OR 
      sc.assigned_to = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.support_participants sp
        WHERE sp.conversation_id = sc.id AND sp.user_id = auth.uid()
      )
    )
  ) OR
  is_ti_user_safe(auth.uid()) OR
  is_gerencia_user_safe(auth.uid())
);

CREATE POLICY "Users can create messages in their conversations" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.support_conversations sc
    WHERE sc.id = conversation_id AND (
      sc.created_by = auth.uid() OR 
      sc.assigned_to = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.support_participants sp
        WHERE sp.conversation_id = sc.id AND sp.user_id = auth.uid()
      )
    )
  )
);

-- Create RLS policies for support_participants  
CREATE POLICY "Users can view participants in their conversations" 
ON public.support_participants 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.support_conversations sc
    WHERE sc.id = conversation_id AND (
      sc.created_by = auth.uid() OR 
      sc.assigned_to = auth.uid()
    )
  ) OR
  is_ti_user_safe(auth.uid()) OR
  is_gerencia_user_safe(auth.uid())
);

CREATE POLICY "Users can manage their own participation" 
ON public.support_participants 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "TI and gerencia can manage all participation" 
ON public.support_participants 
FOR ALL 
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_support_conversations_created_by ON public.support_conversations(created_by);
CREATE INDEX idx_support_conversations_assigned_to ON public.support_conversations(assigned_to);
CREATE INDEX idx_support_conversations_status ON public.support_conversations(status);
CREATE INDEX idx_support_conversations_last_message_at ON public.support_conversations(last_message_at DESC);

CREATE INDEX idx_support_messages_conversation_id ON public.support_messages(conversation_id);
CREATE INDEX idx_support_messages_sender_id ON public.support_messages(sender_id);
CREATE INDEX idx_support_messages_created_at ON public.support_messages(created_at);

CREATE INDEX idx_support_participants_conversation_id ON public.support_participants(conversation_id);
CREATE INDEX idx_support_participants_user_id ON public.support_participants(user_id);
CREATE INDEX idx_support_participants_is_online ON public.support_participants(is_online);

-- Create triggers for updating timestamps
CREATE TRIGGER update_support_conversations_updated_at
  BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_messages_updated_at
  BEFORE UPDATE ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update conversation last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_conversations 
  SET last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to update conversation when new message is added
CREATE TRIGGER update_conversation_on_new_message
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();

-- Create storage bucket for support files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('support-files', 'support-files', false);

-- Create storage policies for support files
CREATE POLICY "Users can view support files in their conversations" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'support-files' AND
  EXISTS (
    SELECT 1 FROM public.support_messages sm
    JOIN public.support_conversations sc ON sm.conversation_id = sc.id
    WHERE sm.file_url LIKE '%' || name || '%' AND (
      sc.created_by = auth.uid() OR 
      sc.assigned_to = auth.uid() OR
      sm.sender_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.support_participants sp
        WHERE sp.conversation_id = sc.id AND sp.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can upload support files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'support-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own support files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'support-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Enable realtime for all support tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;  
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_participants;

-- Set replica identity for realtime updates
ALTER TABLE public.support_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER TABLE public.support_participants REPLICA IDENTITY FULL;