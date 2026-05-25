import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SupportMessage } from './types';
import { toast } from 'sonner';

export const useMessages = () => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);

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
      const { error } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content,
          message_type: 'text',
        });

      if (error) throw error;
      toast.success('Mensaje enviado');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar mensaje');
    }
  }, []);

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

      // Save message with file info
      const messageType = file.type.startsWith('image/') ? 'image' : 'file';
      
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: messageType === 'image' ? 'Imagen compartida' : `Archivo: ${file.name}`,
          message_type: messageType,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
        });

      if (messageError) throw messageError;
      toast.success('Archivo enviado');
    } catch (error) {
      console.error('Error sending file:', error);
      toast.error('Error al enviar archivo');
    }
  }, []);

  return {
    messages,
    loadMessages,
    sendMessage,
    sendFile,
  };
};