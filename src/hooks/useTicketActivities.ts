import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getTodayDateString, isDateInPast, normalizeDateString, getDateDebugInfo } from '@/utils/dateUtils';

export interface TicketActivity {
  id: string;
  ticket_id: string;
  activity_number: number;
  description: string;
  start_date?: string;
  start_time?: string;
  due_date: string;
  end_time?: string;
  completed: boolean;
  completed_at?: string;
  completion_date?: string;
  completion_time?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  progress: number;
  duration_days?: number;
}

export const useTicketActivities = (ticketId?: string) => {
  const [activities, setActivities] = useState<TicketActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadActivities = useCallback(async (ticketId: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('ticket_activities')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('activity_number');

      if (error) throw error;

      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las actividades",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const addActivity = useCallback(async (
    ticketId: string, 
    description: string, 
    dueDate: string,
    progress: number = 0,
    endTime?: string,
    startDate?: string,
    startTime?: string,
    durationDays?: number
  ) => {
    try {
      // Validate required inputs
      if (!ticketId?.trim()) {
        toast({
          title: "Error de validación",
          description: "ID de ticket inválido",
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
      console.log('🚀 Ticket activity creation started:', {
        ticketId,
        rawDueDate: dueDate,
        dateDebugInfo: getDateDebugInfo()
      });

      // Normalize date string (remove time part if present)
      const normalizedDueDate = normalizeDateString(dueDate);
      
      console.log('📅 Ticket activity creation - Date validation:', {
        dueDate: normalizedDueDate,
        today: getTodayDateString(),
        isInPast: isDateInPast(normalizedDueDate),
        rawInput: dueDate,
        debugInfo: getDateDebugInfo()
      });

      // Validate due date is not in the past
      if (isDateInPast(normalizedDueDate)) {
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
      if (endTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
        toast({
          title: "Error de validación",
          description: "Formato de hora inválido (HH:MM)",
          variant: "destructive",
        });
        return null;
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuario no autenticado');

      // Get ticket info for notifications
      const { data: ticket } = await supabase
        .from('tickets')
        .select('code, subject, requester, requester_email')
        .eq('id', ticketId)
        .single();

      // Get next activity number
      const { data: existingActivities } = await supabase
        .from('ticket_activities')
        .select('activity_number')
        .eq('ticket_id', ticketId)
        .order('activity_number', { ascending: false })
        .limit(1);

      const nextNumber = existingActivities && existingActivities.length > 0 
        ? existingActivities[0].activity_number + 1 
        : 1;

      // Create activity object
      const activityData = {
        ticket_id: ticketId,
        activity_number: nextNumber,
        description: description.trim(),
        start_date: startDate?.trim() || null,
        start_time: startTime?.trim() || null,
        due_date: normalizedDueDate,
        end_time: endTime?.trim() || null,
        progress: validProgress,
        duration_days: durationDays || null,
        created_by: user.user.id,
        completed: validProgress === 100,
        completed_at: validProgress === 100 ? new Date().toISOString() : null
      };

      console.log('Creating ticket activity with data:', activityData);

      const { error } = await supabase
        .from('ticket_activities')
        .insert([activityData]);

      if (error) throw error;

      // Send email notification
      if (ticket) {
        try {
          await supabase.functions.invoke('send-ticket-notification', {
            body: {
              type: 'activity_added',
              ticketId,
              ticketCode: ticket.code,
              subject: ticket.subject,
              requester: ticket.requester,
              requesterEmail: ticket.requester_email,
              activityDescription: description
            }
          });
        } catch (emailError) {
          console.error('Error sending activity added notification:', emailError);
        }
      }

      // Check if this is the first activity and ticket is in 'open' status
      // If so, automatically change status to 'in_progress'
      const { data: currentTicket } = await supabase
        .from('tickets')
        .select('status')
        .eq('id', ticketId)
        .single();

      if (currentTicket && currentTicket.status === 'open') {
        console.log(`Auto-updating ticket ${ticketId} from 'open' to 'in_progress' after adding first activity`);
        
        const { error: statusUpdateError } = await supabase
          .from('tickets')
          .update({ status: 'in_progress' })
          .eq('id', ticketId);

        if (statusUpdateError) {
          console.error('Error updating ticket status to in_progress:', statusUpdateError);
        } else {
          // Send status change notification
          if (ticket) {
            try {
              await supabase.functions.invoke('send-ticket-notification', {
                body: {
                  type: 'status_changed',
                  ticketId,
                  ticketCode: ticket.code,
                  subject: ticket.subject,
                  requester: ticket.requester,
                  requesterEmail: ticket.requester_email,
                  oldStatus: 'open',
                  newStatus: 'in_progress'
                }
              });
            } catch (emailError) {
              console.error('Error sending status change notification:', emailError);
            }
          }
          
          toast({
            title: "Estado Actualizado",
            description: "El ticket ha pasado automáticamente a 'En Progreso'",
          });
        }
      }

      await loadActivities(ticketId);
      
      toast({
        title: "Éxito",
        description: "Actividad agregada correctamente",
      });
    } catch (error) {
      console.error('Error adding activity:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar la actividad",
        variant: "destructive",
      });
    }
  }, [loadActivities, toast]);

  const checkAndUpdateTicketStatus = useCallback(async (ticketId: string) => {
    try {
      // Get all activities for this ticket
      const { data: allActivities, error: fetchError } = await supabase
        .from('ticket_activities')
        .select('progress, completed')
        .eq('ticket_id', ticketId);

      if (fetchError) {
        console.error('Error fetching activities:', fetchError);
        return;
      }

      if (allActivities && allActivities.length > 0) {
        // Check if ALL activities are at 100% progress
        const allCompleted = allActivities.every(activity => activity.progress === 100);
        
        console.log('Checking ticket status:', {
          ticketId,
          totalActivities: allActivities.length,
          allCompleted,
          activities: allActivities
        });
        
        if (allCompleted) {
          // Get current ticket status and info first
          const { data: currentTicket } = await supabase
            .from('tickets')
            .select('status, code, subject, requester, requester_email')
            .eq('id', ticketId)
            .single();

          if (currentTicket && currentTicket.status !== 'resolved') {
            // Auto-resolve ticket when ALL activities reach 100%
            const { error: ticketError } = await supabase
              .from('tickets')
              .update({ status: 'resolved' })
              .eq('id', ticketId);

            if (ticketError) {
              console.error('Error updating ticket status:', ticketError);
            } else {
              console.log('Ticket auto-resolved:', ticketId);
              
              // Send email notification for all activities completed
              try {
                await supabase.functions.invoke('send-ticket-notification', {
                  body: {
                    type: 'all_activities_completed',
                    ticketId,
                    ticketCode: currentTicket.code,
                    subject: currentTicket.subject,
                    requester: currentTicket.requester,
                    requesterEmail: currentTicket.requester_email
                  }
                });
              } catch (emailError) {
                console.error('Error sending all activities completed notification:', emailError);
              }

              toast({
                title: "Ticket Resuelto",
                description: "El ticket se ha marcado como resuelto automáticamente al completar todas las actividades",
              });
              
              // Force immediate refresh of activities to trigger UI updates
              setTimeout(() => {
                loadActivities(ticketId);
              }, 100);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking ticket status:', error);
    }
  }, [toast, loadActivities]);

  const updateActivity = useCallback(async (
    activityId: string,
    updates: Partial<TicketActivity>
  ) => {
    try {
      // Get current activity info first
      const { data: currentActivity } = await supabase
        .from('ticket_activities')
        .select('*')
        .eq('id', activityId)
        .single();

      const { error } = await supabase
        .from('ticket_activities')
        .update(updates)
        .eq('id', activityId);

      if (error) throw error;

      // If progress is 100% or completed is true, reload activities to get trigger-set values
      const shouldReload = updates.progress === 100 || updates.completed === true;
      
      if (shouldReload && currentActivity?.ticket_id) {
        // Reload immediately to get completion_date and completion_time from trigger
        await loadActivities(currentActivity.ticket_id);
      } else {
        // Update local state optimistically for other changes
        setActivities(prev => prev.map(activity => 
          activity.id === activityId ? { ...activity, ...updates } : activity
        ));
      }

      // Send email notifications based on update type
      if (currentActivity) {
        // Get ticket info separately
        const { data: ticket } = await supabase
          .from('tickets')
          .select('code, subject, requester, requester_email')
          .eq('id', currentActivity.ticket_id)
          .single();
        
        if (ticket) {
          try {
            // Check if activity was completed (progress went to 100%)
            if (updates.progress === 100 && currentActivity.progress !== 100) {
              await supabase.functions.invoke('send-ticket-notification', {
                body: {
                  type: 'activity_completed',
                  ticketId: currentActivity.ticket_id,
                  ticketCode: ticket.code,
                  subject: ticket.subject,
                  requester: ticket.requester,
                  requesterEmail: ticket.requester_email,
                  activityDescription: currentActivity.description
                }
              });
            } else if (updates.progress !== undefined && updates.progress !== currentActivity.progress) {
              // Progress updated but not completed
              await supabase.functions.invoke('send-ticket-notification', {
                body: {
                  type: 'activity_updated',
                  ticketId: currentActivity.ticket_id,
                  ticketCode: ticket.code,
                  subject: ticket.subject,
                  requester: ticket.requester,
                  requesterEmail: ticket.requester_email,
                  activityDescription: currentActivity.description,
                  progress: updates.progress
                }
              });
            }
          } catch (emailError) {
            console.error('Error sending activity update notification:', emailError);
          }
        }
      }

      // After updating activity, check ticket status
      if (ticketId) {
        // Wait a bit to ensure the update is committed
        setTimeout(() => {
          checkAndUpdateTicketStatus(ticketId);
        }, 500);
      }

      toast({
        title: "Éxito",
        description: "Actividad actualizada correctamente",
      });
    } catch (error) {
      console.error('Error updating activity:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la actividad",
        variant: "destructive",
      });
    }
  }, [toast, ticketId, checkAndUpdateTicketStatus]);

  const deleteActivity = useCallback(async (activityId: string, ticketId: string) => {
    try {
      const { error } = await supabase
        .from('ticket_activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;

      await loadActivities(ticketId);
      
      toast({
        title: "Éxito",
        description: "Actividad eliminada correctamente",
      });
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la actividad",
        variant: "destructive",
      });
    }
  }, [loadActivities, toast]);

  const toggleComplete = useCallback(async (activity: TicketActivity) => {
    const newCompleted = !activity.completed;
    const newProgress = newCompleted ? 100 : 0;
    
    const updates: Partial<TicketActivity> = {
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : undefined,
      progress: newProgress
    };

    await updateActivity(activity.id, updates);
  }, [updateActivity]);

  useEffect(() => {
    if (ticketId) {
      loadActivities(ticketId);
      // Also check ticket status when component mounts
      setTimeout(() => {
        checkAndUpdateTicketStatus(ticketId);
      }, 1000);
    }
  }, [ticketId, loadActivities, checkAndUpdateTicketStatus]);

  // Function to manually check and update all ticket statuses
  const checkAllTicketStatuses = useCallback(async () => {
    try {
      // Get all tickets first
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, status');

      if (ticketsError) throw ticketsError;

      for (const ticket of tickets || []) {
        // Get activities for each ticket separately
        const { data: activities, error: activitiesError } = await supabase
          .from('ticket_activities')
          .select('progress')
          .eq('ticket_id', ticket.id);

        if (activitiesError) {
          console.error(`Error fetching activities for ticket ${ticket.id}:`, activitiesError);
          continue;
        }

        if (activities && activities.length > 0) {
          const allCompleted = activities.every(activity => activity.progress === 100);
          
          if (allCompleted && ticket.status !== 'resolved') {
            console.log(`Auto-resolving ticket ${ticket.id} - all activities at 100%`);
            
            const { error: updateError } = await supabase
              .from('tickets')
              .update({ status: 'resolved' })
              .eq('id', ticket.id);

            if (!updateError) {
              toast({
                title: "Ticket Resuelto",
                description: `Ticket ${ticket.id} marcado como resuelto automáticamente`,
              });
            } else {
              console.error(`Error updating ticket ${ticket.id}:`, updateError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking all ticket statuses:', error);
    }
  }, [toast]);

  return {
    activities,
    isLoading,
    loadActivities,
    addActivity,
    updateActivity,
    deleteActivity,
    toggleComplete,
    checkAndUpdateTicketStatus,
    checkAllTicketStatuses
  };
};