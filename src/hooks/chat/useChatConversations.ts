import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatConversation } from './types';
import { toast } from 'sonner';

export const useChatConversations = () => {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);

  const findOrCreateConversation = useCallback(async (currentUserId: string, targetUserId: string, targetUserName: string) => {
    if (!currentUserId || !targetUserId) return null;

    try {
      // Look for existing conversation between these users
      const { data: existingConversations, error: searchError } = await supabase
        .from('support_conversations')
        .select('*')
        .or(`and(created_by.eq.${currentUserId},assigned_to.eq.${targetUserId}),and(created_by.eq.${targetUserId},assigned_to.eq.${currentUserId})`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (searchError) throw searchError;

      let conversationData = null;
      
      if (existingConversations && existingConversations.length > 0) {
        // Use existing conversation
        conversationData = existingConversations[0];
      } else {
        // Create new conversation
        const conversationTitle = `Chat con ${targetUserName}`;

        const { data: newConversation, error: createError } = await supabase
          .from('support_conversations')
          .insert({
            title: conversationTitle,
            created_by: currentUserId,
            assigned_to: targetUserId,
            status: 'active'
          })
          .select()
          .single();

        if (createError) throw createError;

        // Add both users as participants
        const { error: participantsError } = await supabase
          .from('support_participants')
          .insert([
            {
              conversation_id: newConversation.id,
              user_id: currentUserId,
              is_online: true,
            },
            {
              conversation_id: newConversation.id,
              user_id: targetUserId,
              is_online: false,
            }
          ]);

        if (participantsError) {
          console.error('Error adding participants:', participantsError);
        }

        conversationData = newConversation;
      }

      setConversation(conversationData);
      return conversationData.id;
    } catch (error) {
      console.error('Error finding/creating conversation:', error);
      toast.error('Error al inicializar conversación');
      return null;
    }
  }, []);

  const updateParticipantPresence = useCallback(async (conversationId: string, userId: string, isOnline: boolean) => {
    if (!conversationId || !userId) return;

    try {
      await supabase
        .from('support_participants')
        .update({
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, []);

  return {
    conversation,
    findOrCreateConversation,
    updateParticipantPresence,
  };
};