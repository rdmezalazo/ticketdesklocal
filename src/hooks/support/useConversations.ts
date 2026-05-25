import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SupportConversation, SupportParticipant } from './types';
import { toast } from 'sonner';

export const useConversations = () => {
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [participants, setParticipants] = useState<SupportParticipant[]>([]);

  const loadParticipants = useCallback(async (conversationId: string, targetUser?: SupportParticipant) => {
    try {
      if (targetUser) {
        // Show the target user we're chatting with
        setParticipants([targetUser]);
        return;
      }

      // Load actual participants from database
      const { data: participantsData, error } = await supabase
        .from('support_participants')
        .select(`
          *,
          profiles!support_participants_user_id_fkey (
            user_id,
            full_name,
            email,
            role,
            area,
            status
          )
        `)
        .eq('conversation_id', conversationId);

      if (error) throw error;

      const transformedParticipants = (participantsData || []).map(p => ({
        id: p.id,
        conversation_id: p.conversation_id,
        user_id: p.user_id,
        joined_at: p.joined_at,
        last_seen: p.last_seen,
        is_online: p.is_online,
        is_typing: p.is_typing,
        user: {
          full_name: (p.profiles as any)?.full_name || 'Usuario',
          email: (p.profiles as any)?.email || '',
          role: (p.profiles as any)?.role || '',
          area: (p.profiles as any)?.area || '',
          status: (p.profiles as any)?.status
        }
      })) as SupportParticipant[];

      setParticipants(transformedParticipants);
    } catch (error) {
      console.error('Error loading participants:', error);
      setParticipants([]);
    }
  }, []);

  const initializeConversationWithUser = useCallback(async (currentUserId: string, targetUser: SupportParticipant) => {
    if (!currentUserId) return;

    try {
      // Look for existing conversation between current user and target user
      const { data: existingConversations, error: searchError } = await supabase
        .from('support_conversations')
        .select('*')
        .or(`and(created_by.eq.${currentUserId},assigned_to.eq.${targetUser.user_id}),and(created_by.eq.${targetUser.user_id},assigned_to.eq.${currentUserId})`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (searchError) throw searchError;

      let conversationData = null;
      if (existingConversations && existingConversations.length > 0) {
        conversationData = existingConversations[0];
      } else {
        // Create new conversation
        const conversationTitle = `Conversación con ${targetUser.user.full_name}`;

        const { data: newConversation, error: createError } = await supabase
          .from('support_conversations')
          .insert({
            title: conversationTitle,
            created_by: currentUserId,
            assigned_to: targetUser.user_id,
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
              user_id: targetUser.user_id,
              is_online: targetUser.user.status === 'En Línea',
            }
          ]);

        if (participantsError) throw participantsError;

        conversationData = newConversation;
      }

      setConversation(conversationData);
      await loadParticipants(conversationData.id, targetUser);
      return conversationData.id;
    } catch (error) {
      console.error('Error initializing conversation with user:', error);
      toast.error(`Error al iniciar conversación: ${error.message}`);
    }
  }, [loadParticipants]);

  const updatePresence = useCallback(async (conversationId: string, userId: string, isOnline: boolean, isTyping: boolean = false) => {
    if (!userId || !conversationId) return;

    try {
      await supabase
        .from('support_participants')
        .update({
          is_online: isOnline,
          is_typing: isTyping,
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
    participants,
    loadParticipants,
    initializeConversationWithUser,
    updatePresence,
  };
};