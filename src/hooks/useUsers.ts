import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  area: string;
  status: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, role, area, status')
        .eq('active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    users,
    loading,
    fetchUsers,
  };
};