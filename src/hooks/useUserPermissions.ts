import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserPermission {
  page_slug: string;
  can_access: boolean;
}

export function useUserPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!user) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_permissions')
          .select('page_slug, can_access')
          .eq('user_id', user.id);

        if (error) throw error;
        setPermissions(data || []);
      } catch (error) {
        console.error('Error fetching user permissions:', error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPermissions();
  }, [user]);

  const hasAccess = (pageSlug: string): boolean => {
    // Si no hay permisos configurados, permitir acceso (para compatibilidad con usuarios existentes)
    if (permissions.length === 0) return true;
    
    const permission = permissions.find(p => p.page_slug === pageSlug);
    return permission?.can_access || false;
  };

  const hasAnyAccess = (pageSlugs: string[]): boolean => {
    return pageSlugs.some(slug => hasAccess(slug));
  };

  return {
    permissions,
    loading,
    hasAccess,
    hasAnyAccess
  };
}