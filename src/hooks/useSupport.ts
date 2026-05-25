import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useMessages } from './support/useMessages';
import { useUsers } from './support/useUsers';
import { useConversations } from './support/useConversations';
import { useRealtimeSupport } from './support/useRealtimeSupport';
import { SupportParticipant } from './support/types';

export const useSupport = () => {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<SupportParticipant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  const { messages, loadMessages, sendMessage: sendMessageBase, sendFile: sendFileBase } = useMessages();
  const { allUsers, loadAllUsers } = useUsers();
  const { 
    conversation, 
    participants, 
    loadParticipants, 
    initializeConversationWithUser, 
    updatePresence 
  } = useConversations();

  // Set up real-time subscriptions
  useRealtimeSupport({
    user,
    conversation,
    loadMessages,
    loadParticipants,
    loadAllUsers: () => loadAllUsers(user?.id || ''),
  });

  // Wrapper functions to include required parameters
  const sendMessage = useCallback(async (content: string) => {
    if (!user || !conversation) return;
    setIsLoading(true);
    try {
      await sendMessageBase(conversation.id, user.id, content);
    } finally {
      setIsLoading(false);
    }
  }, [user, conversation, sendMessageBase]);

  const sendFile = useCallback(async (file: File) => {
    if (!user || !conversation) return;
    setIsLoading(true);
    try {
      await sendFileBase(conversation.id, user.id, file);
    } finally {
      setIsLoading(false);
    }
  }, [user, conversation, sendFileBase]);

  // Select user and initialize conversation
  const selectUser = useCallback(async (targetUser: SupportParticipant) => {
    if (!user) return;
    
    setIsLoading(true);
    setSelectedUser(targetUser);
    try {
      const conversationId = await initializeConversationWithUser(user.id, targetUser);
      if (conversationId) {
        await loadMessages(conversationId);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, initializeConversationWithUser, loadMessages]);

  // Initialize on mount
  useEffect(() => {
    if (!user) return;

    const init = async () => {
      try {
        // Load user role
        const { data: roleData } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const role = roleData?.role || '';
        setUserRole(role);

        // Load all available users
        await loadAllUsers(user.id);
      } catch (error) {
        console.error('Error during initialization:', error);
      }
    };

    init();
  }, [user, loadAllUsers]);

  // Handle presence on mount/unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (conversation && user) {
        updatePresence(conversation.id, user.id, false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      if (conversation && user) {
        updatePresence(conversation.id, user.id, false);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [updatePresence, conversation, user]);

  return {
    messages,
    participants,
    allUsers,
    conversation,
    selectedUser,
    isLoading,
    userRole,
    sendMessage,
    sendFile,
    updatePresence: (isOnline: boolean, isTyping: boolean = false) => {
      if (conversation && user) {
        updatePresence(conversation.id, user.id, isOnline, isTyping);
      }
    },
    selectUser,
  };
};

// Export types for convenience
export type { SupportMessage, SupportParticipant, SupportConversation } from './support/types';