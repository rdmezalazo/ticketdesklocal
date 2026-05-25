import { useState, useEffect } from 'react';
import { useSettings } from './useSettings';

export type ViewMode = 'cards' | 'table' | 'inbox' | 'kanban';

interface UseViewSettingsReturn {
  enabledTicketViews: ViewMode[];
  enabledTiTaskViews: ViewMode[];
  isViewEnabled: (module: 'tickets' | 'ti-tasks', view: ViewMode) => boolean;
  getDefaultView: (module: 'tickets' | 'ti-tasks') => ViewMode;
  loading: boolean;
}

export function useViewSettings(): UseViewSettingsReturn {
  const { getSettingValue, loading } = useSettings();
  const [enabledTicketViews, setEnabledTicketViews] = useState<ViewMode[]>([]);
  const [enabledTiTaskViews, setEnabledTiTaskViews] = useState<ViewMode[]>([]);

  useEffect(() => {
    if (!loading) {
      // Get enabled views for tickets
      const ticketViewSettings = getSettingValue('ticket_enabled_views', {
        cards: true,
        table: true,
        inbox: true,
        kanban: true
      });

      // Get enabled views for TI tasks
      const tiTaskViewSettings = getSettingValue('ti_task_enabled_views', {
        cards: true,
        table: true,
        inbox: true,
        kanban: true
      });

      // Convert to arrays of enabled views
      const enabledTickets = Object.entries(ticketViewSettings)
        .filter(([_, enabled]) => enabled)
        .map(([view]) => view as ViewMode);

      const enabledTiTasks = Object.entries(tiTaskViewSettings)
        .filter(([_, enabled]) => enabled)
        .map(([view]) => view as ViewMode);

      setEnabledTicketViews(enabledTickets);
      setEnabledTiTaskViews(enabledTiTasks);
    }
  }, [getSettingValue, loading]);

  const isViewEnabled = (module: 'tickets' | 'ti-tasks', view: ViewMode): boolean => {
    const enabledViews = module === 'tickets' ? enabledTicketViews : enabledTiTaskViews;
    return enabledViews.includes(view);
  };

  const getDefaultView = (module: 'tickets' | 'ti-tasks'): ViewMode => {
    const enabledViews = module === 'tickets' ? enabledTicketViews : enabledTiTaskViews;
    
    // Priority order for default view
    const priorityOrder: ViewMode[] = ['cards', 'table', 'inbox', 'kanban'];
    
    for (const view of priorityOrder) {
      if (enabledViews.includes(view)) {
        return view;
      }
    }
    
    // Fallback to first enabled view or 'cards' if none enabled
    return enabledViews[0] || 'cards';
  };

  return {
    enabledTicketViews,
    enabledTiTaskViews,
    isViewEnabled,
    getDefaultView,
    loading
  };
}