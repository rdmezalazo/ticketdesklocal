import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ChartType = 'pie' | 'bar' | 'area' | 'line';

export interface ChartConfig {
  enabled: boolean;
  type: ChartType;
  dateRange: boolean;
}

export interface GeneralReportConfig {
  filters: {
    dates: boolean;
    areas: boolean;
    categories: boolean;
    productivity: boolean;
  };
  ticketCharts: {
    byStatus: ChartConfig;
    byPriority: ChartConfig;
    byAreas: ChartConfig;
    byCategories: ChartConfig;
    byProductivity: ChartConfig;
    byPending: ChartConfig;
  };
  tiTaskCharts: {
    byStatus: ChartConfig;
    byPriority: ChartConfig;
    byAreas: ChartConfig;
    byCategories: ChartConfig;
    byProductivity: ChartConfig;
    byPending: ChartConfig;
    ganttChart: { enabled: boolean };
  };
}

const defaultConfig: GeneralReportConfig = {
  filters: {
    dates: true,
    areas: true,
    categories: true,
    productivity: true,
  },
  ticketCharts: {
    byStatus: { enabled: true, type: 'pie', dateRange: false },
    byPriority: { enabled: true, type: 'bar', dateRange: false },
    byAreas: { enabled: true, type: 'pie', dateRange: false },
    byCategories: { enabled: true, type: 'bar', dateRange: false },
    byProductivity: { enabled: true, type: 'area', dateRange: false },
    byPending: { enabled: true, type: 'pie', dateRange: false },
  },
  tiTaskCharts: {
    byStatus: { enabled: true, type: 'pie', dateRange: false },
    byPriority: { enabled: true, type: 'bar', dateRange: false },
    byAreas: { enabled: true, type: 'pie', dateRange: false },
    byCategories: { enabled: true, type: 'bar', dateRange: false },
    byProductivity: { enabled: true, type: 'area', dateRange: false },
    byPending: { enabled: true, type: 'pie', dateRange: false },
    ganttChart: { enabled: true },
  },
};

export const useGeneralReportConfig = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<GeneralReportConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);

  const fetchConfig = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'general_report_config')
        .eq('module', 'reports')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data && data.value) {
        const savedConfig = data.value as any;
        
        // Merge configs with proper defaults for chart configurations
        const mergedTicketCharts: any = {};
        const mergedTiTaskCharts: any = {};
        
        // Merge ticket charts
        Object.keys(defaultConfig.ticketCharts).forEach(key => {
          const savedChart = savedConfig.ticketCharts?.[key];
          if (savedChart && typeof savedChart === 'object' && 'enabled' in savedChart) {
            mergedTicketCharts[key] = {
              enabled: savedChart.enabled,
              type: savedChart.type || defaultConfig.ticketCharts[key as keyof typeof defaultConfig.ticketCharts].type,
              dateRange: savedChart.dateRange || false
            };
          } else if (typeof savedChart === 'boolean') {
            // Backward compatibility: convert old boolean format
            mergedTicketCharts[key] = {
              enabled: savedChart,
              type: defaultConfig.ticketCharts[key as keyof typeof defaultConfig.ticketCharts].type,
              dateRange: false
            };
          } else {
            mergedTicketCharts[key] = defaultConfig.ticketCharts[key as keyof typeof defaultConfig.ticketCharts];
          }
        });
        
        // Merge TI task charts
        Object.keys(defaultConfig.tiTaskCharts).forEach(key => {
          const savedChart = savedConfig.tiTaskCharts?.[key];
          if (key === 'ganttChart') {
            // Special handling for ganttChart
            mergedTiTaskCharts[key] = savedChart && typeof savedChart === 'object' 
              ? { enabled: savedChart.enabled ?? true }
              : { enabled: true };
          } else if (savedChart && typeof savedChart === 'object' && 'enabled' in savedChart) {
            mergedTiTaskCharts[key] = {
              enabled: savedChart.enabled,
              type: savedChart.type || (defaultConfig.tiTaskCharts[key as keyof typeof defaultConfig.tiTaskCharts] as ChartConfig).type,
              dateRange: savedChart.dateRange || false
            };
          } else if (typeof savedChart === 'boolean') {
            // Backward compatibility: convert old boolean format
            mergedTiTaskCharts[key] = {
              enabled: savedChart,
              type: (defaultConfig.tiTaskCharts[key as keyof typeof defaultConfig.tiTaskCharts] as ChartConfig).type,
              dateRange: false
            };
          } else {
            mergedTiTaskCharts[key] = defaultConfig.tiTaskCharts[key as keyof typeof defaultConfig.tiTaskCharts];
          }
        });
        
        setConfig({
          filters: { ...defaultConfig.filters, ...savedConfig.filters },
          ticketCharts: mergedTicketCharts as GeneralReportConfig['ticketCharts'],
          tiTaskCharts: mergedTiTaskCharts as GeneralReportConfig['tiTaskCharts']
        });
      } else {
        setConfig(defaultConfig);
      }
    } catch (error) {
      console.error('Error fetching general report config:', error);
      setConfig(defaultConfig);
    }
  };

  const saveConfig = async (newConfig: GeneralReportConfig) => {
    if (!user) return false;

    setLoading(true);
    try {
      // First, try to check if record exists
      const { data: existingRecord } = await supabase
        .from('app_settings')
        .select('id')
        .eq('key', 'general_report_config')
        .eq('module', 'reports')
        .maybeSingle();

      let result;
      
      if (existingRecord) {
        // Update existing record
        result = await supabase
          .from('app_settings')
          .update({
            value: newConfig as any,
            description: 'Configuración general para reportes',
            updated_at: new Date().toISOString()
          })
          .eq('key', 'general_report_config')
          .eq('module', 'reports');
      } else {
        // Insert new record
        result = await supabase
          .from('app_settings')
          .insert({
            key: 'general_report_config',
            module: 'reports',
            value: newConfig as any,
            description: 'Configuración general para reportes'
          });
      }

      if (result.error) throw result.error;

      setConfig(newConfig);
      return true;
    } catch (error) {
      console.error('Error saving general report config:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [user]);

  return { config, loading, refetch: fetchConfig, saveConfig };
};