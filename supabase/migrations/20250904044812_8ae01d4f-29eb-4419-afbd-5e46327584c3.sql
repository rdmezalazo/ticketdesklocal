-- Fix infinite recursion in support chat RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON support_conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON support_messages;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON support_participants;

-- Create simpler, non-recursive policies for support_conversations
CREATE POLICY "Users can view own conversations" 
ON support_conversations 
FOR SELECT 
USING (
  auth.uid() = created_by OR 
  auth.uid() = assigned_to OR 
  is_ti_user_safe(auth.uid()) OR 
  is_gerencia_user_safe(auth.uid())
);

-- Create simpler policies for support_messages
CREATE POLICY "Users can view messages in accessible conversations" 
ON support_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM support_conversations sc 
    WHERE sc.id = conversation_id AND (
      sc.created_by = auth.uid() OR 
      sc.assigned_to = auth.uid() OR 
      is_ti_user_safe(auth.uid()) OR 
      is_gerencia_user_safe(auth.uid())
    )
  )
);

-- Create simpler policies for support_participants  
CREATE POLICY "Users can view participants in accessible conversations" 
ON support_participants 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM support_conversations sc 
    WHERE sc.id = conversation_id AND (
      sc.created_by = auth.uid() OR 
      sc.assigned_to = auth.uid() OR 
      is_ti_user_safe(auth.uid()) OR 
      is_gerencia_user_safe(auth.uid())
    )
  )
);

-- Allow participants to be inserted by conversation participants
CREATE POLICY "Users can add participants to their conversations" 
ON support_participants 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_conversations sc 
    WHERE sc.id = conversation_id AND (
      sc.created_by = auth.uid() OR 
      is_ti_user_safe(auth.uid()) OR 
      is_gerencia_user_safe(auth.uid())
    )
  )
);