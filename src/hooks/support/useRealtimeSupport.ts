import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SupportConversation } from './types';
import { useNotifications } from '@/hooks/useNotifications';

interface UseRealtimeSupportProps {
  user: any;
  conversation: SupportConversation | null;
  loadMessages: (conversationId: string) => Promise<void>;
  loadParticipants: (conversationId: string, targetUser?: any) => Promise<void>;
  loadAllUsers: () => Promise<void>;
}

export const useRealtimeSupport = ({
  user,
  conversation,
  loadMessages,
  loadParticipants,
  loadAllUsers,
}: UseRealtimeSupportProps) => {
  const { showChatNotification } = useNotifications();
  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('support-messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'support_messages'
        }, 
        async (payload) => {
          const newMessage = payload.new;
          
          // Reload messages if it's for current conversation
          if (conversation && conversation.id === newMessage.conversation_id) {
            await loadMessages(conversation.id);
          }
          
          // Show notification if message is not from current user
          if (newMessage.sender_id !== user.id && conversation && conversation.id === newMessage.conversation_id) {
            // Get sender info
            const { data: sender } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', newMessage.sender_id)
              .maybeSingle();
            
            // Show enhanced notification with sound
            await showChatNotification(
              sender?.full_name || 'Usuario',
              newMessage.content || 'Archivo adjunto',
              true
            );
          }
        }
      )
      .subscribe();

    // Subscribe to participant updates
    const participantsChannel = supabase
      .channel('support-participants')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'support_participants'
        }, 
        async () => {
          if (conversation) {
            await loadParticipants(conversation.id);
          }
          await loadAllUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [user, conversation, loadMessages, loadParticipants, loadAllUsers]);
};