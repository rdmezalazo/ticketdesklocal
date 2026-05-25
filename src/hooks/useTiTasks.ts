import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TiTask, TiTaskWithActivities } from '@/types/tiTask';
import { useToast } from '@/hooks/use-toast';

export const useTiTasks = () => {
  const [tiTasks, setTiTasks] = useState<TiTaskWithActivities[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTiTasks = async () => {
    try {
      setLoading(true);
      
      // Fetch ti tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('ti_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Error fetching TI tasks:', tasksError);
        toast({
          title: "Error",
          description: "No se pudieron cargar las tareas de TI",
          variant: "destructive",
        });
        return;
      }

      // Get all unique user IDs from both created_by and assignee fields (only valid UUIDs)
      const createdByIds = tasksData.map(task => task.created_by).filter(Boolean);
      const assigneeIds = tasksData.map(task => task.assignee)
        .filter(Boolean)
        .filter(assignee => {
          // Check if assignee is a UUID (36 characters with hyphens)
          return typeof assignee === 'string' && 
                 assignee.length === 36 && 
                 assignee.includes('-');
        });
      
      const userIds = [...new Set([...createdByIds, ...assigneeIds])];

      console.log('User IDs to fetch:', userIds);

      // Fetch user profiles for both creators and assignees
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
      }

      console.log('Fetched profiles:', profilesData);

      // Create a map of user profiles
      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, { user_id: string; full_name: string; email: string }>);
      
      console.log('Profiles map:', profilesMap);

      // Fetch activities for each task and combine with user data
      const tasksWithActivities = await Promise.all(
        (tasksData || []).map(async (task) => {
          const { data: activitiesData } = await supabase
            .from('ti_task_activities')
            .select('*')
            .eq('ti_task_id', task.id)
            .order('activity_number');

          // Get creator and assignee profiles
          const creatorProfile = profilesMap[task.created_by];
          const assigneeProfile = task.assignee ? profilesMap[task.assignee] : null;

          return {
            ...task,
            created_at: new Date(task.created_at),
            updated_at: new Date(task.updated_at),
            conformidad_date: task.conformidad_date ? new Date(task.conformidad_date) : undefined,
            reminder_frequency: task.reminder_frequency as any,
            activities: activitiesData || [],
            created_by_name: creatorProfile?.full_name || 'Usuario desconocido',
            assignee_name: assigneeProfile?.full_name || (task.assignee ? 'Usuario no encontrado' : 'Sin asignar')
          };
        })
      );

      setTiTasks(tasksWithActivities);
    } catch (error) {
      console.error('Error fetching TI tasks:', error);
      toast({
        title: "Error",
        description: "Error al cargar las tareas de TI",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract mentioned user IDs from HTML description
  const extractMentionedUsers = (htmlContent: string): string[] => {
    if (!htmlContent) return [];
    const mentionedUsers: string[] = [];
    const mentionRegex = /<span[^>]*data-user-id="([^"]+)"[^>]*>/g;
    let match;
    
    while ((match = mentionRegex.exec(htmlContent)) !== null) {
      mentionedUsers.push(match[1]);
    }
    
    return mentionedUsers;
  };

  const createTiTask = async (taskData: Partial<TiTask>) => {
    try {
      // Get the code from the database function (TSK-0000 format)
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_ti_task_code');

      if (codeError) {
        console.error('Error generating TI task code:', codeError);
        toast({
          title: "Error",
          description: "Error al generar el código de la tarea",
          variant: "destructive",
        });
        return;
      }

      // Extract mentioned users from description
      const mentionedUsers = extractMentionedUsers(taskData.description || '');

      const insertData = {
        subject: taskData.subject || '',
        description: taskData.description,
        status: taskData.status || 'open',
        priority: taskData.priority || 'medium', 
        category: taskData.category || 'Desarrollo',
        assignee: taskData.assignee,
        created_by: taskData.created_by || '',
        tags: taskData.tags || [],
        sede: taskData.sede || 'Arequipa',
        area: taskData.area || 'Sistemas',
        mentioned_users: mentionedUsers,
        code: codeData,
      };

      const { data, error } = await supabase
        .from('ti_tasks')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('Error creating TI task:', error);
        toast({
          title: "Error",
          description: "No se pudo crear la tarea de TI",
          variant: "destructive",
        });
        return;
      }

      // Send mention notifications if there are mentioned users
      if (mentionedUsers.length > 0) {
        try {
          await supabase.functions.invoke('send-mention-notification', {
            body: {
              task_id: data.id,
              task_type: 'ti_task',
              task_code: codeData,
              task_subject: taskData.subject || '',
              task_description: taskData.description,
              task_status: taskData.status,
              task_priority: taskData.priority,
              task_category: taskData.category,
              mentioned_users: mentionedUsers,
              action: 'task_created',
              action_description: 'Se ha creado una nueva tarea de TI'
            }
          });
        } catch (notificationError) {
          console.error('Error sending mention notifications:', notificationError);
          // Don't fail the creation if notifications fail
        }
      }

      // Send notification email for TI task creation
      try {
        await supabase.functions.invoke('send-ti-task-notification', {
          body: {
            type: 'ti_task_created',
            tiTaskId: data.id,
            taskCode: codeData,
            subject: taskData.subject || '',
            assignee: taskData.assignee,
            priority: taskData.priority || 'medium',
            category: taskData.category || 'Desarrollo'
          }
        });
      } catch (notificationError) {
        console.error('Error sending TI task creation notification:', notificationError);
        // Don't fail the creation if notification fails
      }

      toast({
        title: "Éxito",
        description: "Tarea de TI creada correctamente",
      });

      // Refresh the tasks list
      fetchTiTasks();
      return data;
    } catch (error) {
      console.error('Error creating TI task:', error);
      toast({
        title: "Error",
        description: "Error al crear la tarea de TI",
        variant: "destructive",
      });
    }
  };

  const updateTiTask = async (taskId: string, updates: Partial<TiTask>) => {
    try {
      // Prepare update data, converting Date objects to ISO strings
      const updateData: any = { ...updates };
      
      // Remove updated_at as it's auto-managed by the database trigger
      delete updateData.updated_at;
      
      // Convert Date fields to ISO strings
      if (updateData.conformidad_date instanceof Date) {
        updateData.conformidad_date = updateData.conformidad_date.toISOString();
      }
      
      if (updateData.created_at instanceof Date) {
        updateData.created_at = updateData.created_at.toISOString();
      }
      
      // Ensure mentioned_users is an array
      if (!updateData.mentioned_users) {
        updateData.mentioned_users = [];
      }

      console.log('Updating TI task with data:', updateData);

      const { error } = await supabase
        .from('ti_tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) {
        console.error('Error updating TI task:', error);
        toast({
          title: "Error",
          description: "No se pudo actualizar la tarea de TI",
          variant: "destructive",
        });
        return;
      }

      // Send mention notifications if there are mentioned users
      if (updateData.mentioned_users && updateData.mentioned_users.length > 0) {
        const task = tiTasks.find(t => t.id === taskId);
        if (task) {
          try {
            // Get activities for the task
            const { data: activitiesData } = await supabase
              .from('ti_task_activities')
              .select('activity_number, description, progress, completed')
              .eq('ti_task_id', taskId)
              .order('activity_number');

            await supabase.functions.invoke('send-mention-notification', {
              body: {
                task_id: taskId,
                task_type: 'ti_task',
                task_code: task.code,
                task_subject: task.subject,
                task_description: task.description,
                task_status: task.status,
                task_priority: task.priority,
                task_category: task.category,
                mentioned_users: updateData.mentioned_users,
                action: 'task_updated',
                action_description: 'La tarea ha sido actualizada',
                activities: activitiesData || []
              }
            });
          } catch (notificationError) {
            console.error('Error sending mention notifications:', notificationError);
            // Don't fail the update if notifications fail
          }
        }
      }

      toast({
        title: "Éxito",
        description: "Tarea de TI actualizada correctamente",
      });

      // Refresh the tasks list
      fetchTiTasks();
    } catch (error) {
      console.error('Error updating TI task:', error);
      toast({
        title: "Error",
        description: "Error al actualizar la tarea de TI",
        variant: "destructive",
      });
    }
  };

  const deleteTiTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('ti_tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error('Error deleting TI task:', error);
        toast({
          title: "Error",
          description: "No se pudo eliminar la tarea de TI",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Éxito",
        description: "Tarea de TI eliminada correctamente",
      });

      // Refresh the tasks list
      fetchTiTasks();
    } catch (error) {
      console.error('Error deleting TI task:', error);
      toast({
        title: "Error",
        description: "Error al eliminar la tarea de TI",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTiTasks();

    // Set up real-time subscriptions
    const tasksSubscription = supabase
      .channel('ti_tasks_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'ti_tasks' },
        () => fetchTiTasks()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ti_task_activities' },
        () => fetchTiTasks()
      )
      .subscribe();

    return () => {
      tasksSubscription.unsubscribe();
    };
  }, []);

  return {
    tiTasks,
    loading,
    createTiTask,
    updateTiTask,
    deleteTiTask,
    refreshTiTasks: fetchTiTasks,
  };
};