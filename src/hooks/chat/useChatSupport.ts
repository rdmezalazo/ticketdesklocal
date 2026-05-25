import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../useAuth';
import { useChatUsers } from './useChatUsers';
import { useChatMessages } from './useChatMessages';
import { useChatConversations } from './useChatConversations';
import { useChatRealtime } from './useChatRealtime';
import { ChatUser } from './types';

export const useChatSupport = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { users, isLoading: usersLoading, loadUsers, updateUserOnlineStatus, moveUserToTop } = useChatUsers();
  const { messages, setMessages, loadMessages, addNewMessage, sendMessage: sendMessageBase, sendFile: sendFileBase, copyMessage } = useChatMessages();
  const { conversation, findOrCreateConversation, updateParticipantPresence } = useChatConversations();

  // Set up real-time subscriptions
  useChatRealtime({
    user,
    conversation,
    loadMessages,
    addNewMessage,
    loadUsers: (userId: string) => loadUsers(userId),
    updateUserOnlineStatus,
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

  // Load conversation history with a specific user
  const loadConversationHistory = useCallback(async (targetUserId: string) => {
    if (!user) {
      console.warn('No user available for loading conversation');
      return;
    }

    console.log('Loading conversation history for user:', targetUserId);
    setIsLoading(true);
    setSelectedUserId(targetUserId);
    
    try {
      // Find target user info
      const targetUser = users.find(u => u.user_id === targetUserId);
      if (!targetUser) {
        console.warn('Target user not found in users list:', targetUserId);
        // Try to load users again if target user not found
        await loadUsers(user.id);
        return;
      }

      console.log('Found target user:', targetUser);

      // Find or create conversation
      const conversationId = await findOrCreateConversation(
        user.id, 
        targetUserId, 
        targetUser.full_name
      );
      
      if (conversationId) {
        console.log('Loading messages for conversation:', conversationId);
        // Clear current messages first to avoid mixing conversations
        setMessages([]);
        await loadMessages(conversationId);
        // Update presence when joining conversation
        await updateParticipantPresence(conversationId, user.id, true);
        console.log('Conversation loaded successfully');
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, users, findOrCreateConversation, loadMessages, setMessages, updateParticipantPresence, loadUsers]);

  // Initialize on mount and handle user changes
  useEffect(() => {
    if (!user?.id) {
      console.log('No user available, skipping chat initialization');
      return;
    }

    const init = async () => {
      console.log('Initializing chat support for user:', user.id);
      
      try {
        // Load user role and profile info
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name, email, area')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profileError) {
          console.error('Error loading user profile:', profileError);
        }
        
        const role = profileData?.role || 'usuario';
        setUserRole(role);
        setCurrentUser({
          id: user.id,
          email: user.email,
          full_name: profileData?.full_name || user.email,
          role: role,
          area: profileData?.area || 'General'
        });

        console.log('Current user profile loaded:', { role, full_name: profileData?.full_name });

        // Load all available users
        await loadUsers(user.id);
        
        // Force refresh user data periodically to handle database updates
        const interval = setInterval(() => {
          console.log('Auto-refreshing user data...');
          loadUsers(user.id);
        }, 30000); // Refresh every 30 seconds
        
        return () => clearInterval(interval);
        
        // If we had a selected user before, try to reload their conversation
        if (selectedUserId) {
          console.log('Restoring conversation with previously selected user:', selectedUserId);
          // Small delay to ensure users are loaded first
          setTimeout(() => {
            loadConversationHistory(selectedUserId);
          }, 100);
        }
      } catch (error) {
        console.error('Error during chat initialization:', error);
      }
    };

    init();
  }, [user?.id]); // Only depend on user.id to avoid infinite loops

  // Handle presence on mount/unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (conversation && user) {
        updateParticipantPresence(conversation.id, user.id, false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      if (conversation && user) {
        updateParticipantPresence(conversation.id, user.id, false);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [updateParticipantPresence, conversation, user]);

  // Add refresh function to force reload user data
  const refreshUsers = useCallback(async () => {
    if (user?.id) {
      console.log('Refreshing user data...');
      await loadUsers(user.id);
    }
  }, [user?.id, loadUsers]);

  return {
    users,
    messages,
    conversation,
    currentUser,
    userRole,
    isLoading: isLoading || usersLoading,
    selectedUserId,
    sendMessage,
    sendFile,
    copyMessage,
    loadConversationHistory,
    moveUserToTop,
    refreshUsers,
    updatePresence: (isOnline: boolean) => {
      if (conversation && user) {
        updateParticipantPresence(conversation.id, user.id, isOnline);
      }
    },
  };
};

// Export types for convenience
export type { ChatUser, ChatMessage, ChatConversation, MessageContextMenuAction } from './types';