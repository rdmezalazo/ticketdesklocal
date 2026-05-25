import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AppSetting {
  id: string;
  key: string;
  value: any;
  description?: string;
  module: string;
}

export interface TicketCategory {
  id: string;
  name: string;
  color: string;
  description?: string;
  is_active: boolean;
}

export interface TicketPriority {
  id: string;
  name: string;
  level: number;
  color: string;
  description?: string;
  is_active: boolean;
}

export interface TicketStatus {
  id: string;
  name: string;
  slug: string;
  color: string;
  description?: string;
  is_active: boolean;
  order_index: number;
}

export interface TiTaskCategory {
  id: string;
  name: string;
  color: string;
  description?: string;
  is_active: boolean;
}

export interface TiTaskPriority {
  id: string;
  name: string;
  level: number;
  color: string;
  description?: string;
  is_active: boolean;
}

export interface TiTaskStatus {
  id: string;
  name: string;
  slug: string;
  color: string;
  description?: string;
  is_active: boolean;
  order_index: number;
}

export interface SystemArea {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  page_slug: string;
  can_access: boolean;
}

export interface NotificationRecipient {
  id: string;
  email: string;
  full_name: string | null;
  active: boolean;
  is_bcc: boolean;
  created_at: string;
  updated_at: string;
}

export function useSettings() {
  const [appSettings, setAppSettings] = useState<AppSetting[]>([]);
  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>([]);
  const [ticketPriorities, setTicketPriorities] = useState<TicketPriority[]>([]);
  const [ticketStatuses, setTicketStatuses] = useState<TicketStatus[]>([]);
  const [tiTaskCategories, setTiTaskCategories] = useState<TiTaskCategory[]>([]);
  const [tiTaskPriorities, setTiTaskPriorities] = useState<TiTaskPriority[]>([]);
  const [tiTaskStatuses, setTiTaskStatuses] = useState<TiTaskStatus[]>([]);
  const [systemAreas, setSystemAreas] = useState<SystemArea[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [notificationRecipients, setNotificationRecipients] = useState<NotificationRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch all settings
  const fetchSettings = async () => {
    try {
      setLoading(true);

      const [
        { data: settings, error: settingsError },
        { data: categories, error: categoriesError },
        { data: priorities, error: prioritiesError },
        { data: statuses, error: statusesError },
        { data: tiTaskCategories, error: tiTaskCategoriesError },
        { data: tiTaskPriorities, error: tiTaskPrioritiesError },
        { data: tiTaskStatuses, error: tiTaskStatusesError },
        { data: systemAreas, error: systemAreasError },
        { data: permissions, error: permissionsError },
        { data: recipients, error: recipientsError }
      ] = await Promise.all([
        supabase.from('app_settings').select('*').order('module, key'),
        supabase.from('ticket_categories').select('*').order('name'),
        supabase.from('ticket_priorities').select('*').order('level'),
        supabase.from('ticket_statuses').select('*').order('order_index'),
        supabase.from('ti_task_categories').select('*').order('name'),
        supabase.from('ti_task_priorities').select('*').order('level'),
        supabase.from('ti_task_statuses').select('*').order('order_index'),
        supabase.from('system_areas').select('*').order('name'),
        supabase.from('user_permissions').select('*'),
        supabase.from('notification_recipients').select('*').order('email')
      ]);

      if (settingsError) throw settingsError;
      if (categoriesError) throw categoriesError;
      if (prioritiesError) throw prioritiesError;
      if (statusesError) throw statusesError;
      if (tiTaskCategoriesError) throw tiTaskCategoriesError;
      if (tiTaskPrioritiesError) throw tiTaskPrioritiesError;
      if (tiTaskStatusesError) throw tiTaskStatusesError;
      if (systemAreasError) throw systemAreasError;
      if (permissionsError) throw permissionsError;
      if (recipientsError) throw recipientsError;

      setAppSettings(settings || []);
      setTicketCategories(categories || []);
      setTicketPriorities(priorities || []);
      setTicketStatuses(statuses || []);
      setTiTaskCategories(tiTaskCategories || []);
      setTiTaskPriorities(tiTaskPriorities || []);
      setTiTaskStatuses(tiTaskStatuses || []);
      setSystemAreas(systemAreas || []);
      setUserPermissions(permissions || []);
      setNotificationRecipients(recipients || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las configuraciones"
      });
    } finally {
      setLoading(false);
    }
  };

  // Ensure default categories exist
  const ensureDefaultCategories = async () => {
    const defaultCategories = ['Solicitud de Servicio'];
    let needsRefresh = false;
    for (const name of defaultCategories) {
      const exists = ticketCategories.some(cat => cat.name === name);
      if (!exists) {
        await supabase.from('ticket_categories').insert({
          name,
          description: name,
          color: '#6366f1',
          is_active: true
        });
        needsRefresh = true;
      }
    }
    if (needsRefresh) {
      await fetchSettings();
    }
  };

  useEffect(() => {
    if (!loading && ticketCategories.length > 0) {
      ensureDefaultCategories();
    }
  }, [loading]);

  // Update app setting
  const updateAppSetting = async (key: string, value: any) => {
    try {
      // Determine module based on key prefix
      let module = 'general';
      if (key.startsWith('chat_')) {
        module = 'chat';
      } else if (key.startsWith('admin_ticket_')) {
        module = 'tickets';
      } else if (key.startsWith('admin_titask_')) {
        module = 'titasks';
      }

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key,
          value: JSON.stringify(value),
          module
        }, {
          onConflict: 'key'
        });

      if (error) throw error;
      
      toast({
        title: "Configuración actualizada",
        description: "Los cambios se han guardado correctamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la configuración"
      });
    }
  };

  // CRUD for ticket categories
  const createCategory = async (category: Omit<TicketCategory, 'id'>) => {
    try {
      const { error } = await supabase
        .from('ticket_categories')
        .insert(category);

      if (error) throw error;
      
      toast({
        title: "Categoría creada",
        description: `La categoría "${category.name}" se ha creado correctamente`
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear la categoría"
      });
    }
  };

  const updateCategory = async (id: string, updates: Partial<TicketCategory>) => {
    try {
      const { error } = await supabase
        .from('ticket_categories')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Categoría actualizada",
        description: "Los cambios se han guardado correctamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la categoría"
      });
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ticket_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Categoría eliminada",
        description: "La categoría se ha eliminado correctamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la categoría"
      });
    }
  };

  // CRUD for ticket priorities
  const createPriority = async (priority: Omit<TicketPriority, 'id'>) => {
    try {
      const { error } = await supabase
        .from('ticket_priorities')
        .insert(priority);

      if (error) throw error;
      
      toast({
        title: "Prioridad creada",
        description: `La prioridad "${priority.name}" se ha creado correctamente`
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error creating priority:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear la prioridad"
      });
    }
  };

  const updatePriority = async (id: string, updates: Partial<TicketPriority>) => {
    try {
      const { error } = await supabase
        .from('ticket_priorities')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Prioridad actualizada",
        description: "Los cambios se han guardado correctamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la prioridad"
      });
    }
  };

  const deletePriority = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ticket_priorities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Prioridad eliminada",
        description: "La prioridad se ha eliminado correctamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error deleting priority:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la prioridad"
      });
    }
  };

  // CRUD for ticket statuses
  const createStatus = async (status: Omit<TicketStatus, 'id'>) => {
    try {
      const { error } = await supabase
        .from('ticket_statuses')
        .insert(status);

      if (error) throw error;
      
      toast({
        title: "Estado creado",
        description: `El estado "${status.name}" se ha creado correctamente`
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error creating status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el estado"
      });
    }
  };

  const updateStatus = async (id: string, updates: Partial<TicketStatus>) => {
    try {
      const { error } = await supabase
        .from('ticket_statuses')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Estado actualizado",
        description: "Los cambios se han guardado correctamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado"
      });
    }
  };

  const deleteStatus = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ticket_statuses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Estado eliminado",
        description: "El estado se ha eliminado correctamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error deleting status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el estado"
      });
    }
  };

  // CRUD for TI Task categories
  const createTiTaskCategory = async (category: Omit<TiTaskCategory, 'id'>) => {
    try {
      const { error } = await supabase
        .from('ti_task_categories')
        .insert(category);

      if (error) throw error;
      
      toast({
        title: "Categoría de TI creada",
        description: `La categoría "${category.name}" se ha creado correctamente`
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error creating TI task category:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear la categoría de TI"
      });
    }
  };

  const updateTiTaskCategory = async (id: string, updates: Partial<TiTaskCategory>) => {
    try {
      const { error } = await supabase
        .from('ti_task_categories')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Categoría de TI actualizada",
        description: "Los cambios se han guardado correctamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error updating TI task category:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la categoría de TI"
      });
    }
  };

  const deleteTiTaskCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ti_task_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Categoría de TI eliminada",
        description: "La categoría se ha eliminado correctamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error deleting TI task category:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la categoría de TI"
      });
    }
  };

  // CRUD for TI Task priorities
  const createTiTaskPriority = async (priority: Omit<TiTaskPriority, 'id'>) => {
    try {
      const { error } = await supabase
        .from('ti_task_priorities')
        .insert(priority);

      if (error) throw error;
      
      toast({
        title: "Prioridad de TI creada",
        description: `La prioridad "${priority.name}" se ha creado correctamente`
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error creating TI task priority:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear la prioridad de TI"
      });
    }
  };

  const updateTiTaskPriority = async (id: string, updates: Partial<TiTaskPriority>) => {
    try {
      const { error } = await supabase
        .from('ti_task_priorities')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Prioridad de TI actualizada",
        description: "Los cambios se han guardado correctamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error updating TI task priority:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la prioridad de TI"
      });
    }
  };

  const deleteTiTaskPriority = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ti_task_priorities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Prioridad de TI eliminada",
        description: "La prioridad se ha eliminado correctamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error deleting TI task priority:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la prioridad de TI"
      });
    }
  };

  // CRUD for TI Task statuses
  const createTiTaskStatus = async (status: Omit<TiTaskStatus, 'id'>) => {
    try {
      const { error } = await supabase
        .from('ti_task_statuses')
        .insert(status);

      if (error) throw error;
      
      toast({
        title: "Estado de TI creado",
        description: `El estado "${status.name}" se ha creado correctamente`
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error creating TI task status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el estado de TI"
      });
    }
  };

  const updateTiTaskStatus = async (id: string, updates: Partial<TiTaskStatus>) => {
    try {
      const { error } = await supabase
        .from('ti_task_statuses')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Estado de TI actualizado",
        description: "Los cambios se han guardado correctamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error updating TI task status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado de TI"
      });
    }
  };

  const deleteTiTaskStatus = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ti_task_statuses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Estado de TI eliminado",
        description: "El estado se ha eliminado correctamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error deleting TI task status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el estado de TI"
      });
    }
  };

  // CRUD for System Areas
  const createSystemArea = async (area: Omit<SystemArea, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('system_areas')
        .insert(area);

      if (error) throw error;
      
      toast({
        title: "Área creada",
        description: `El área "${area.name}" se ha creado correctamente`
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error creating system area:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el área"
      });
    }
  };

  const updateSystemArea = async (id: string, updates: Partial<SystemArea>) => {
    try {
      const { error } = await supabase
        .from('system_areas')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Área actualizada",
        description: "Los cambios se han guardado correctamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error updating system area:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el área"
      });
    }
  };

  const deleteSystemArea = async (id: string) => {
    try {
      const { error } = await supabase
        .from('system_areas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Área eliminada",
        description: "El área se ha eliminado correctamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error deleting system area:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el área"
      });
    }
  };

  // User permissions management
  const updateUserPermissions = async (userId: string, permissions: { page_slug: string; can_access: boolean }[]) => {
    try {
      // Delete existing permissions for this user
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      // Insert new permissions
      const permissionsToInsert = permissions
        .filter(p => p.can_access)
        .map(p => ({
          user_id: userId,
          page_slug: p.page_slug,
          can_access: p.can_access
        }));

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from('user_permissions')
          .insert(permissionsToInsert);

        if (error) throw error;
      }
      
      toast({
        title: "Permisos actualizados",
        description: "Los permisos del usuario se han actualizado correctamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error updating user permissions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron actualizar los permisos"
      });
    }
  };

  // Notification Recipients functions
  const createNotificationRecipient = async (recipientData: { email: string; full_name?: string }) => {
    try {
      const { error } = await supabase
        .from('notification_recipients')
        .insert([{
          email: recipientData.email,
          full_name: recipientData.full_name || null,
          active: true
        }]);

      if (error) throw error;
      
      toast({
        title: "Destinatario agregado",
        description: "El destinatario ha sido agregado exitosamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error creating notification recipient:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo agregar el destinatario"
      });
      throw error;
    }
  };

  const updateNotificationRecipient = async (id: string, recipientData: { email?: string; full_name?: string; active?: boolean; is_bcc?: boolean }) => {
    try {
      const { error } = await supabase
        .from('notification_recipients')
        .update(recipientData)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Destinatario actualizado",
        description: "El destinatario ha sido actualizado exitosamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error updating notification recipient:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el destinatario"
      });
      throw error;
    }
  };

  const deleteNotificationRecipient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notification_recipients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Destinatario eliminado",
        description: "El destinatario ha sido eliminado exitosamente"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error deleting notification recipient:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el destinatario"
      });
      throw error;
    }
  };

  // Get setting value helper
  const getSettingValue = (key: string, defaultValue: any = null) => {
    const setting = appSettings.find(s => s.key === key);
    if (!setting) return defaultValue;
    
    try {
      return JSON.parse(setting.value);
    } catch {
      return setting.value;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    // Data
    appSettings,
    ticketCategories,
    ticketPriorities,
    ticketStatuses,
    tiTaskCategories,
    tiTaskPriorities,
    tiTaskStatuses,
    systemAreas,
    userPermissions,
    notificationRecipients,
    loading,
    
    // Actions
    updateAppSetting,
    createCategory,
    updateCategory,
    deleteCategory,
    createPriority,
    updatePriority,
    deletePriority,
    createStatus,
    updateStatus,
    deleteStatus,
    createTiTaskCategory,
    updateTiTaskCategory,
    deleteTiTaskCategory,
    createTiTaskPriority,
    updateTiTaskPriority,
    deleteTiTaskPriority,
    createTiTaskStatus,
    updateTiTaskStatus,
    deleteTiTaskStatus,
    createSystemArea,
    updateSystemArea,
    deleteSystemArea,
    updateUserPermissions,
    createNotificationRecipient,
    updateNotificationRecipient,
    deleteNotificationRecipient,
    getSettingValue,
    refreshSettings: fetchSettings
  };
}