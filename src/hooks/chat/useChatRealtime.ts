import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatConversation } from './types';
import { useNotifications } from '@/hooks/useNotifications';

interface UseChatRealtimeProps {
  user: any;
  conversation: ChatConversation | null;
  loadMessages: (conversationId: string) => Promise<void>;
  addNewMessage: (message: any) => Promise<void>;
  loadUsers: (currentUserId: string) => Promise<void>;
  updateUserOnlineStatus: (userId: string, isOnline: boolean) => void;
}

export const useChatRealtime = ({
  user,
  conversation,
  loadMessages,
  addNewMessage,
  loadUsers,
  updateUserOnlineStatus,
}: UseChatRealtimeProps) => {
  const { showChatNotification } = useNotifications();
  
  useEffect(() => {
    if (!user?.id) {
      console.log('No user available for realtime subscriptions');
      return;
    }

    console.log('Setting up realtime subscriptions for user:', user.id);

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('chat-messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'support_messages'
        }, 
        async (payload) => {
          const newMessage = payload.new;
          console.log('New message received via realtime:', newMessage);
          
          // Add message to current conversation if it matches
          if (conversation && conversation.id === newMessage.conversation_id) {
            console.log('Adding message to current conversation');
            await addNewMessage(newMessage);
          }
          
          // Show notification if message is not from current user
          if (newMessage.sender_id !== user.id && conversation && conversation.id === newMessage.conversation_id) {
            // Get sender info for notification
            const { data: sender } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', newMessage.sender_id)
              .maybeSingle();
            
            // Show enhanced notification with sound
            await showChatNotification(
              sender?.full_name || 'Usuario',
              newMessage.content || 'Archivo adjunto',
              false
            );
          }
        }
      )
      .subscribe();

    // Subscribe to user status changes
    const profilesChannel = supabase
      .channel('chat-profiles')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles'
        }, 
        async (payload) => {
          const updatedProfile = payload.new;
          
          // Update user online status in real time
          if (updatedProfile.status) {
            updateUserOnlineStatus(updatedProfile.user_id, updatedProfile.status === 'En Línea');
          }
          
          // Reload users list to get updated status
          await loadUsers(user.id);
        }
      )
      .subscribe();

    // Subscribe to participant presence updates
    const participantsChannel = supabase
      .channel('chat-participants')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'support_participants'
        }, 
        async (payload) => {
          const updatedParticipant = payload.new;
          
          // Update user online status based on participant data
          updateUserOnlineStatus(updatedParticipant.user_id, updatedParticipant.is_online);
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscriptions for user:', user?.id);
      try {
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(profilesChannel);
        supabase.removeChannel(participantsChannel);
      } catch (error) {
        console.error('Error cleaning up realtime subscriptions:', error);
      }
    };
  }, [user?.id, conversation?.id, loadMessages, addNewMessage, loadUsers, updateUserOnlineStatus]);

  // Notification permission is now handled by useNotifications hook
};