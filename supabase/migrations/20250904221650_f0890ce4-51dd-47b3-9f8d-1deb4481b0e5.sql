-- Fix RLS policies for support_conversations to allow proper conversation creation

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "TI and gerencia can update conversations" ON public.support_conversations;

-- Create new improved policies
CREATE POLICY "Users can create their own conversations" 
ON public.support_conversations 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "TI users can create conversations for any user" 
ON public.support_conversations 
FOR INSERT 
WITH CHECK (is_ti_user_safe(auth.uid()));

CREATE POLICY "Users can view conversations they created or are assigned to" 
ON public.support_conversations 
FOR SELECT 
USING (
  auth.uid() = created_by 
  OR auth.uid() = assigned_to 
  OR is_ti_user_safe(auth.uid()) 
  OR is_gerencia_user_safe(auth.uid())
);

CREATE POLICY "TI and gerencia can update all conversations" 
ON public.support_conversations 
FOR UPDATE 
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE POLICY "Users can update their own conversations" 
ON public.support_conversations 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Improve support_participants policies
DROP POLICY IF EXISTS "Users can add participants to their conversations" ON public.support_participants;

CREATE POLICY "Users can add participants to conversations they created" 
ON public.support_participants 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_conversations sc
    WHERE sc.id = support_participants.conversation_id 
    AND (sc.created_by = auth.uid() OR is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
  )
);