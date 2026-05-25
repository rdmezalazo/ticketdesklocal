import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface UserPreferences {
  dashboard_show_all_tickets: boolean;
  page_show_all_tickets: boolean;
}

export const useUserPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<UserPreferences>({
    dashboard_show_all_tickets: false,
    page_show_all_tickets: false
  });
  const [loading, setLoading] = useState(true);

  const fetchUserPreferences = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('dashboard_show_all_tickets, page_show_all_tickets')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user preferences:', error);
        return;
      }

      if (data) {
        setPreferences({
          dashboard_show_all_tickets: data.dashboard_show_all_tickets ?? false,
          page_show_all_tickets: data.page_show_all_tickets ?? false
        });
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las preferencias del usuario",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPreferences();
  }, [user]);

  return {
    preferences,
    loading,
    refreshPreferences: fetchUserPreferences
  };
};