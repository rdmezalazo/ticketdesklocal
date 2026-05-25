import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TiTaskActivity } from '@/types/tiTask';
import { useToast } from '@/hooks/use-toast';
import { getTodayDateString, isDateInPast, normalizeDateString, getDateDebugInfo } from '@/utils/dateUtils';

export const useTiTaskActivities = (tiTaskId?: string) => {
  const [activities, setActivities] = useState<TiTaskActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadActivities = useCallback(async (taskId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ti_task_activities')
        .select('*')
        .eq('ti_task_id', taskId)
        .order('activity_number');

      if (error) {
        console.error('Error loading TI task activities:', error);
        return;
      }

      setActivities(data || []);
    } catch (error) {
      console.error('Error loading TI task activities:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper function to validate user permissions
  const validateUserPermissions = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast({
        title: "Error de autenticación",
        description: "No se pudo verificar la identidad del usuario",
        variant: "destructive",
      });
      return null;
    }

    // Check if user has TI or gerencia role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || (profile.role !== 'ti' && profile.role !== 'gerencia')) {
      toast({
        title: "Error de permisos",
        description: "No tienes permisos para realizar esta acción",
        variant: "destructive",
      });
      return null;
    }

    return user;
  };

  // Helper function to extract mentioned user IDs from HTML description
  const extractMentionedUsers = (htmlContent: string): string[] => {
    const mentionedUsers: string[] = [];
    const mentionRegex = /<span[^>]*data-user-id="([^"]+)"[^>]*>/g;
    let match;
    
    while ((match = mentionRegex.exec(htmlContent)) !== null) {
      mentionedUsers.push(match[1]);
    }
    
    return mentionedUsers;
  };

  const addActivity = async (
    taskId: string, 
    description: string, 
    dueDate: string, 
    progress?: number,
    endTime?: string,
    startDate?: string,
    startTime?: string
  ) => {
    try {
      // Validate required inputs
      if (!taskId?.trim()) {
        toast({
          title: "Error de validación",
          description: "ID de tarea inválido",
          variant: "destructive",
        });
        return null;
      }

      if (!description?.trim()) {
        toast({
          title: "Error de validación",
          description: "La descripción es obligatoria",
          variant: "destructive",
        });
        return null;
      }

      if (!dueDate?.trim()) {
        toast({
          title: "Error de validación",
          description: "La fecha límite es obligatoria",
          variant: "destructive",
        });
        return null;
      }

      // Debug date information before validation
      console.log('🚀 Activity creation started:', {
        taskId,
        rawDueDate: dueDate,
        dateDebugInfo: getDateDebugInfo()
      });

      // Normalize date string (remove time part if present)
      const normalizedDueDate = normalizeDateString(dueDate);
      
      console.log('📅 Activity creation - Date validation:', {
        dueDate: normalizedDueDate,
        today: getTodayDateString(),
        isInPast: isDateInPast(normalizedDueDate),
        rawInput: dueDate,
        debugInfo: getDateDebugInfo()
      });

      // Check admin setting for allowing past due dates
      const { data: allowPastDueDateSetting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'admin_titask_allow_past_due_date_enabled')
        .single();

      const allowPastDueDate = allowPastDueDateSetting?.value === 'true' || allowPastDueDateSetting?.value === true;

      // Validate due date is not in the past (unless admin setting allows it)
      if (!allowPastDueDate && isDateInPast(normalizedDueDate)) {
        toast({
          title: "Error de validación",
          description: "La fecha límite no puede ser anterior a hoy",
          variant: "destructive",
        });
        return null;
      }

      // Validate and normalize progress
      const validProgress = Math.max(0, Math.min(100, Math.floor(progress || 0)));

      // Validate end time format if provided
      if (endTime) {
        const trimmedTime = endTime.trim();
        // Accept HH:MM, HH:MM:SS, or HH:MM:SS.microseconds (PostgreSQL format)
        if (trimmedTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9](\.\d+)?)?$/.test(trimmedTime)) {
          toast({
            title: "Error de validación",
            description: "Formato de hora inválido (HH:MM o HH:MM:SS)",
            variant: "destructive",
          });
          return null;
        }
      }

      // Validate user permissions
      const user = await validateUserPermissions();
      if (!user) return null;

      // Verify task exists and user has access
      const { data: taskExists, error: taskError } = await supabase
        .from('ti_tasks')
        .select('id')
        .eq('id', taskId)
        .single();

      if (taskError || !taskExists) {
        console.error('Task validation error:', taskError);
        toast({
          title: "Error de validación",
          description: "La tarea especificada no existe o no tienes acceso",
          variant: "destructive",
        });
        return null;
      }

      // Get next activity number
      const { data: existingActivities, error: fetchError } = await supabase
        .from('ti_task_activities')
        .select('activity_number')
        .eq('ti_task_id', taskId)
        .order('activity_number', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Error fetching existing activities:', fetchError);
        toast({
          title: "Error",
          description: "Error al validar las actividades existentes",
          variant: "destructive",
        });
        return null;
      }

      const nextActivityNumber = (existingActivities?.[0]?.activity_number || 0) + 1;

      // Create activity object
      const activityData = {
        ti_task_id: taskId,
        activity_number: nextActivityNumber,
        description: description.trim(),
        due_date: normalizedDueDate,
        start_date: startDate?.trim() || null,
        start_time: startTime?.trim() || null,
        progress: validProgress,
        end_time: endTime?.trim() || null,
        created_by: user.id,
        completed: validProgress === 100,
        completed_at: validProgress === 100 ? new Date().toISOString() : null
      };

      console.log('Creating activity with data:', activityData);

      // Insert activity
      const { data, error } = await supabase
        .from('ti_task_activities')
        .insert([activityData])
        .select()
        .single();

      if (error) {
        console.error('Error adding TI task activity:', error);
        toast({
          title: "Error",
          description: `No se pudo agregar la actividad: ${error.message}`,
          variant: "destructive",
        });
        return null;
      }

      // Send notification email for activity added
      try {
        // Get task details for notification
        const { data: taskData } = await supabase
          .from('ti_tasks')
          .select('code, subject, assignee, priority, category')
          .eq('id', taskId)
          .single();

        if (taskData) {
          await supabase.functions.invoke('send-ti-task-notification', {
            body: {
              type: 'activity_added',
              tiTaskId: taskId,
              taskCode: taskData.code,
              subject: taskData.subject,
              assignee: taskData.assignee,
              priority: taskData.priority,
              category: taskData.category,
              activityDescription: description.trim(),
              progress: validProgress
            }
          });
        }
      } catch (notificationError) {
        console.error('Error sending activity added notification:', notificationError);
        // Don't fail the activity creation if notification fails
      }

      toast({
        title: "Éxito",
        description: "Actividad agregada correctamente",
      });

      // Extract mentioned users and send notifications
      const mentionedUsers = extractMentionedUsers(description);
      if (mentionedUsers.length > 0) {
        try {
          // Get task details for notification
          const { data: taskData } = await supabase
            .from('ti_tasks')
            .select('code, subject, description, status, priority, category')
            .eq('id', taskId)
            .single();

          // Get all activities for the task
          const { data: activitiesData } = await supabase
            .from('ti_task_activities')
            .select('activity_number, description, progress, completed')
            .eq('ti_task_id', taskId)
            .order('activity_number');

          if (taskData) {
            await supabase.functions.invoke('send-mention-notification', {
              body: {
                task_id: taskId,
                task_type: 'ti_task_activity',
                task_code: taskData.code,
                task_subject: taskData.subject,
                task_description: taskData.description,
                task_status: taskData.status,
                task_priority: taskData.priority,
                task_category: taskData.category,
                activity_number: nextActivityNumber,
                mentioned_users: mentionedUsers,
                action: 'activity_created',
                action_description: 'Se ha creado una nueva actividad',
                activities: activitiesData || []
              }
            });
          }
        } catch (notificationError) {
          console.error('Error sending mention notifications:', notificationError);
          // Don't fail the activity creation if notifications fail
        }
      }

      // Reload activities to ensure consistency
      await loadActivities(taskId);
      return data;
    } catch (error) {
      console.error('Unexpected error adding TI task activity:', error);
      toast({
        title: "Error",
        description: "Error inesperado al agregar la actividad",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateActivity = async (activityId: string, updates: Partial<TiTaskActivity>) => {
    try {
      // Validate required inputs
      if (!activityId?.trim()) {
        toast({
          title: "Error de validación",
          description: "ID de actividad inválido",
          variant: "destructive",
        });
        return null;
      }

      // Validate user permissions
      const user = await validateUserPermissions();
      if (!user) return null;

      // Validate description if provided
      if (updates.description !== undefined && !updates.description?.trim()) {
        toast({
          title: "Error de validación",
          description: "La descripción no puede estar vacía",
          variant: "destructive",
        });
        return null;
      }

      // Validate and normalize progress if provided
      if (updates.progress !== undefined) {
        updates.progress = Math.max(0, Math.min(100, Math.floor(updates.progress)));
        
        // Auto-complete if progress is 100%
        if (updates.progress === 100) {
          updates.completed = true;
          updates.completed_at = new Date().toISOString();
        } else if (updates.progress < 100 && updates.completed) {
          // If progress is less than 100% but marked as completed, unmark it
          updates.completed = false;
          updates.completed_at = null;
        }
      }

      // Validate due date if provided
      if (updates.due_date) {
        const normalizedDueDate = normalizeDateString(updates.due_date);
        
        console.log('📝 Update activity - Date validation:', {
          dueDate: normalizedDueDate,
          today: getTodayDateString(),
          isInPast: isDateInPast(normalizedDueDate),
          rawInput: updates.due_date,
          debugInfo: getDateDebugInfo()
        });
        
        // Check admin setting for allowing past due dates
        const { data: allowPastDueDateSetting } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'admin_titask_allow_past_due_date_enabled')
          .single();

        const allowPastDueDate = allowPastDueDateSetting?.value === 'true' || allowPastDueDateSetting?.value === true;

        if (!allowPastDueDate && isDateInPast(normalizedDueDate)) {
          toast({
            title: "Error de validación",
            description: "La fecha límite no puede ser anterior a hoy",
            variant: "destructive",
          });
          return null;
        }
        
        // Normalize the date
        updates.due_date = normalizedDueDate;
      }

      // Validate end time format if provided
      if (updates.end_time !== undefined) {
        // Handle empty or whitespace-only strings
        if (!updates.end_time || updates.end_time.trim() === '') {
          updates.end_time = null;
        } else {
          // Trim whitespace and validate format (accepts HH:MM, HH:MM:SS, or HH:MM:SS.microseconds)
          const trimmedTime = updates.end_time.trim();
          if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9](\.\d+)?)?$/.test(trimmedTime)) {
            toast({
              title: "Error de validación",
              description: "Formato de hora inválido (HH:MM o HH:MM:SS)",
              variant: "destructive",
            });
            return null;
          }
          updates.end_time = trimmedTime;
        }
      }

      // Validate completion_time format if provided (only admin can set this)
      if (updates.completion_time !== undefined) {
        if (!updates.completion_time || updates.completion_time.trim() === '') {
          updates.completion_time = null;
        } else {
          const trimmedTime = updates.completion_time.trim();
          // Accept HH:MM, HH:MM:SS, or HH:MM:SS.microseconds (PostgreSQL format)
          if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9](\.\d+)?)?$/.test(trimmedTime)) {
            toast({
              title: "Error de validación",
              description: "Formato de hora de cumplimiento inválido (HH:MM o HH:MM:SS)",
              variant: "destructive",
            });
            return null;
          }
          updates.completion_time = trimmedTime;
        }
      }

      // Validate completion_date format if provided (only admin can set this)
      if (updates.completion_date !== undefined) {
        if (!updates.completion_date || updates.completion_date.trim() === '') {
          updates.completion_date = null;
        } else {
          const normalizedCompletionDate = normalizeDateString(updates.completion_date);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedCompletionDate)) {
            toast({
              title: "Error de validación",
              description: "Formato de fecha de cumplimiento inválido (YYYY-MM-DD)",
              variant: "destructive",
            });
            return null;
          }
          updates.completion_date = normalizedCompletionDate;
        }
      }

      // Clean up the updates object
      const cleanUpdates = { ...updates };
      if (cleanUpdates.description) {
        cleanUpdates.description = cleanUpdates.description.trim();
      }

      console.log('Updating activity with data:', { activityId, updates: cleanUpdates });

      // Update activity
      const { data, error } = await supabase
        .from('ti_task_activities')
        .update(cleanUpdates)
        .eq('id', activityId)
        .select()
        .single();

      if (error) {
        console.error('Error updating TI task activity:', error);
        toast({
          title: "Error",
          description: `No se pudo actualizar la actividad: ${error.message}`,
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Éxito",
        description: "Actividad actualizada correctamente",
      });

      // Get task and activity details for notifications
      const { data: activityData } = await supabase
        .from('ti_task_activities')
        .select('ti_task_id, activity_number, description')
        .eq('id', activityId)
        .single();

      if (activityData) {
        const { data: taskData } = await supabase
          .from('ti_tasks')
          .select('code, subject, description, status, priority, category, mentioned_users')
          .eq('id', activityData.ti_task_id)
          .single();

        if (taskData) {
          // Extract mentioned users from updated or current description
          const descriptionToCheck = cleanUpdates.description || activityData.description;
          const mentionedUsers = extractMentionedUsers(descriptionToCheck);

          // Get all activities for progress visualization
          const { data: activitiesData } = await supabase
            .from('ti_task_activities')
            .select('activity_number, description, progress, completed')
            .eq('ti_task_id', activityData.ti_task_id)
            .order('activity_number');
          
          // Send notifications if:
          // 1. Description was updated and has mentions
          // 2. Activity was just completed (progress = 100%)
          const shouldNotifyForDescription = cleanUpdates.description && mentionedUsers.length > 0;
          const shouldNotifyForCompletion = cleanUpdates.progress === 100 || cleanUpdates.completed === true;

          if (shouldNotifyForDescription) {
            try {
              await supabase.functions.invoke('send-mention-notification', {
                body: {
                  task_id: activityData.ti_task_id,
                  task_type: 'ti_task_activity',
                  task_code: taskData.code,
                  task_subject: taskData.subject,
                  task_description: taskData.description,
                  task_status: taskData.status,
                  task_priority: taskData.priority,
                  task_category: taskData.category,
                  activity_number: activityData.activity_number,
                  mentioned_users: mentionedUsers,
                  action: 'activity_updated',
                  action_description: 'Se ha actualizado una actividad',
                  activities: activitiesData || []
                }
              });
            } catch (notificationError) {
              console.error('Error sending mention notifications:', notificationError);
            }
          }

          if (shouldNotifyForCompletion && (mentionedUsers.length > 0 || taskData.mentioned_users?.length > 0)) {
            try {
              // Notify both activity mentions and task mentions
              const allMentionedUsers = [...new Set([...mentionedUsers, ...(taskData.mentioned_users || [])])];
              
              await supabase.functions.invoke('send-mention-notification', {
                body: {
                  task_id: activityData.ti_task_id,
                  task_type: 'ti_task_activity',
                  task_code: taskData.code,
                  task_subject: taskData.subject,
                  task_description: taskData.description,
                  task_status: taskData.status,
                  task_priority: taskData.priority,
                  task_category: taskData.category,
                  activity_number: activityData.activity_number,
                  mentioned_users: allMentionedUsers,
                  action: 'activity_completed',
                  action_description: `Se ha completado la actividad ${activityData.activity_number}`,
                  activities: activitiesData || []
                }
              });
            } catch (notificationError) {
              console.error('Error sending completion notifications:', notificationError);
            }
          }
        }
      }

      // If progress is 100% or completed is true, reload activities to get trigger-set values
      const shouldReload = cleanUpdates.progress === 100 || cleanUpdates.completed === true;
      
      if (shouldReload && data?.ti_task_id) {
        // Reload to get completion_date and completion_time from trigger
        await loadActivities(data.ti_task_id);
      } else {
        // Update local state optimistically for other changes
        setActivities(prev => prev.map(activity => 
          activity.id === activityId ? { ...activity, ...cleanUpdates } : activity
        ));
      }

      return data;
    } catch (error) {
      console.error('Unexpected error updating TI task activity:', error);
      toast({
        title: "Error",
        description: "Error inesperado al actualizar la actividad",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteActivity = async (activityId: string, taskId: string) => {
    try {
      const { error } = await supabase
        .from('ti_task_activities')
        .delete()
        .eq('id', activityId);

      if (error) {
        console.error('Error deleting TI task activity:', error);
        toast({
          title: "Error",
          description: "No se pudo eliminar la actividad",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Éxito",
        description: "Actividad eliminada correctamente",
      });

      await loadActivities(taskId);
    } catch (error) {
      console.error('Error deleting TI task activity:', error);
      toast({
        title: "Error",
        description: "Error al eliminar la actividad",
        variant: "destructive",
      });
    }
  };

  const toggleComplete = async (activity: TiTaskActivity) => {
    try {
      if (!activity?.id) {
        toast({
          title: "Error",
          description: "Actividad inválida",
          variant: "destructive",
        });
        return null;
      }

      const newCompleted = !activity.completed;
      const newProgress = newCompleted ? 100 : (activity.progress < 100 ? activity.progress : 0);
      const completedAt = newCompleted ? new Date().toISOString() : null;

      const result = await updateActivity(activity.id, {
        completed: newCompleted,
        progress: newProgress,
        completed_at: completedAt
      });

      return result;
    } catch (error) {
      console.error('Error toggling activity completion:', error);
      toast({
        title: "Error",
        description: "Error al cambiar el estado de la actividad",
        variant: "destructive",
      });
      return null;
    }
  };

  useEffect(() => {
    if (tiTaskId) {
      loadActivities(tiTaskId);
    }
  }, [tiTaskId]);

  return {
    activities,
    isLoading,
    loadActivities,
    addActivity,
    updateActivity,
    deleteActivity,
    toggleComplete,
  };
};