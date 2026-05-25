import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatUser } from './types';

export const useChatUsers = () => {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadUsers = useCallback(async (currentUserId: string) => {
    if (!currentUserId) {
      console.warn('No current user ID provided to loadUsers');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Loading users for chat, excluding current user:', currentUserId);
      
      // Primero obtenemos el rol del usuario actual
      const { data: currentUserData, error: currentUserError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', currentUserId)
        .single();

      if (currentUserError) {
        console.error('Error getting current user role:', currentUserError);
        throw currentUserError;
      }

      const currentUserRole = currentUserData?.role;
      console.log('Current user role:', currentUserRole);

      let query = supabase
        .from('profiles')
        .select('*')
        .eq('active', true)
        .neq('user_id', currentUserId);

      // Solo los usuarios con rol 'ti' son administradores
      if (currentUserRole === 'usuario' || currentUserRole === 'gerencia') {
        // Usuarios regulares y gerencia solo pueden ver al administrador (rol 'ti')
        query = query.eq('role', 'ti');
      }
      // Si es admin (ti), mostrar todos los usuarios sin filtro de rol
      // (solo excluyen usuarios inactivos y a sí mismos)

      const { data, error } = await query.order('full_name', { ascending: true });

      if (error) {
        console.error('Supabase error loading users:', error);
        throw error;
      }

      console.log('Raw user data from profiles:', data);

      const transformedUsers = (data || []).map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
        area: profile.area,
        status: profile.status || 'No disponible',
        last_seen: profile.last_login || profile.created_at,
        is_online: profile.status === 'En Línea',
        avatar_url: profile.avatar_url
      })) as ChatUser[];

      console.log('Transformed users for chat:', transformedUsers);
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error loading users for chat:', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUserOnlineStatus = useCallback((userId: string, isOnline: boolean) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.user_id === userId 
          ? { ...user, is_online: isOnline, status: isOnline ? 'En Línea' : 'No disponible' }
          : user
      )
    );
  }, []);

  const moveUserToTop = useCallback((selectedUserId: string) => {
    setUsers(prevUsers => {
      const selectedUser = prevUsers.find(user => user.user_id === selectedUserId);
      if (!selectedUser) return prevUsers;
      
      const otherUsers = prevUsers.filter(user => user.user_id !== selectedUserId);
      return [selectedUser, ...otherUsers];
    });
  }, []);

  return {
    users,
    isLoading,
    loadUsers,
    updateUserOnlineStatus,
    moveUserToTop,
  };
};