import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SupportParticipant } from './types';

export const useUsers = () => {
  const [allUsers, setAllUsers] = useState<SupportParticipant[]>([]);

  const loadAllUsers = useCallback(async (currentUserId: string) => {
    if (!currentUserId) return;

    try {
      // Load all active users except current user
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('active', true)
        .neq('user_id', currentUserId);

      if (error) throw error;

      const transformedUsers = (data || []).map(profile => ({
        id: profile.id,
        conversation_id: '',
        user_id: profile.user_id,
        joined_at: profile.created_at,
        last_seen: profile.last_login || profile.created_at,
        is_online: profile.status === 'En Línea',
        is_typing: false,
        user: {
          full_name: profile.full_name,
          email: profile.email,
          role: profile.role,
          area: profile.area,
          status: profile.status
        }
      })) as SupportParticipant[];
      
      setAllUsers(transformedUsers);
    } catch (error) {
      console.error('Error loading all users:', error);
      setAllUsers([]);
    }
  }, []);

  return {
    allUsers,
    loadAllUsers,
  };
};