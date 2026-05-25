import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from './types';
import { toast } from 'sonner';

export const useChatMessages = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Add new message to existing messages without full reload
  const addNewMessage = useCallback(async (newMessage: any) => {
    console.log('Adding new message to chat:', newMessage);
    
    // Get sender profile
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('user_id', newMessage.sender_id)
      .maybeSingle();

    const transformedMessage = {
      ...newMessage,
      sender: senderProfile || { full_name: 'Usuario', email: '' }
    };

    setMessages(prev => {
      // Check if message already exists to avoid duplicates
      const exists = prev.some(msg => msg.id === newMessage.id);
      if (exists) return prev;
      
      // Add new message and sort by created_at
      return [...prev, transformedMessage].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        return;
      }

      // Get unique sender IDs
      const senderIds = [...new Set(messagesData.map(msg => msg.sender_id))];
      
      // Load sender profiles
      const { data: senderProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', senderIds);

      if (profilesError) throw profilesError;

      // Create a map of sender profiles
      const profilesMap = (senderProfiles || []).reduce((acc: any, profile: any) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {});

      // Transform messages with sender info
      const transformedMessages = messagesData.map((msg: any) => ({
        ...msg,
        sender: profilesMap[msg.sender_id] || { full_name: 'Usuario', email: '' }
      }));

      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  }, []);

  const sendMessage = useCallback(async (conversationId: string, userId: string, content: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content,
          message_type: 'text',
        })
        .select()
        .single();

      if (error) throw error;
      
      // Optimistic update: Add the message immediately to current user's view
      if (data) {
        console.log('Message sent successfully, adding optimistically:', data);
        await addNewMessage(data);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar mensaje');
    }
  }, [addNewMessage]);

  const sendFile = useCallback(async (conversationId: string, userId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('support-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('support-files')
        .getPublicUrl(fileName);

      // Determine message type based on file
      let messageType = 'file';
      let content = `Archivo: ${file.name}`;
      
      if (file.type.startsWith('image/')) {
        messageType = 'image';
        content = 'Imagen compartida';
      }

      // Save message with file info
      const { data, error: messageError } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content,
          message_type: messageType,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
        })
        .select()
        .single();

      if (messageError) throw messageError;
      
      // Optimistic update: Add the file message immediately to current user's view
      if (data) {
        console.log('File message sent successfully, adding optimistically:', data);
        await addNewMessage(data);
      }
      
      toast.success('Archivo enviado correctamente');
    } catch (error) {
      console.error('Error sending file:', error);
      toast.error('Error al enviar archivo');
    }
  }, [addNewMessage]);

  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Mensaje copiado al portapapeles');
  }, []);

  return {
    messages,
    setMessages,
    loadMessages,
    addNewMessage,
    sendMessage,
    sendFile,
    copyMessage,
  };
};