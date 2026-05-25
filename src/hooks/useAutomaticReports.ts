import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface AutomaticReportConfig {
  id: string;
  name: string;
  report_type: 'tickets' | 'ti_tasks' | 'both';
  recipient_emails: string[];
  work_start_time: string;
  work_end_time: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  period_type: 'daily' | 'weekly' | 'monthly' | 'date_range';
  start_date?: string;
  end_date?: string;
  send_time: string;
  is_active: boolean;
  include_status_filter: boolean;
  include_priority_filter: boolean;
  include_category_filter: boolean;
  include_assignee_filter: boolean;
  include_area_filter: boolean;
  include_charts: boolean;
  include_summary: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface SentReportHistory {
  id: string;
  config_id: string;
  report_type: string;
  recipient_emails: string[];
  sent_at: string;
  frequency?: string;
  period_type?: string;
  report_start_date?: string;
  report_end_date?: string;
  report_data?: any;
  email_subject?: string;
  email_status: string;
  error_message?: string;
  created_by: string;
}

export const useAutomaticReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [configs, setConfigs] = useState<AutomaticReportConfig[]>([]);
  const [sentHistory, setSentHistory] = useState<SentReportHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('automatic_report_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfigs((data || []) as AutomaticReportConfig[]);
    } catch (error) {
      console.error('Error fetching report configs:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las configuraciones de reportes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSentHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sent_reports_history')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSentHistory(data || []);
    } catch (error) {
      console.error('Error fetching sent reports history:', error);
    }
  };

  const createConfig = async (config: Omit<AutomaticReportConfig, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('automatic_report_configs')
        .insert({
          ...config,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      await fetchConfigs();
      toast({
        title: "Éxito",
        description: "Configuración de reporte creada correctamente"
      });

      return data;
    } catch (error) {
      console.error('Error creating report config:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la configuración de reporte",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateConfig = async (id: string, config: Partial<AutomaticReportConfig>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('automatic_report_configs')
        .update(config)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchConfigs();
      toast({
        title: "Éxito",
        description: "Configuración de reporte actualizada correctamente"
      });

      return data;
    } catch (error) {
      console.error('Error updating report config:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración de reporte",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteConfig = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('automatic_report_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchConfigs();
      toast({
        title: "Éxito",
        description: "Configuración de reporte eliminada correctamente"
      });
    } catch (error) {
      console.error('Error deleting report config:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la configuración de reporte",
        variant: "destructive"
      });
      throw error;
    }
  };

  const testReportSend = async (configId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('test-automatic-report', {
        body: { configId }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error testing report send:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el reporte de prueba",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      fetchConfigs();
      fetchSentHistory();
    }
  }, [user]);

  return {
    configs,
    sentHistory,
    loading,
    createConfig,
    updateConfig,
    deleteConfig,
    testReportSend,
    refreshConfigs: fetchConfigs,
    refreshHistory: fetchSentHistory
  };
};