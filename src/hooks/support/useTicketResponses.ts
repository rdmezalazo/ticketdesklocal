import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TicketResponse {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string;
    email: string;
    role: string;
  };
}

export const useTicketResponses = (ticketId?: string) => {
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadResponses = useCallback(async (id: string) => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const { data: responsesData, error } = await supabase
        .from('ticket_responses')
        .select(`
          *,
          profiles (
            full_name,
            email,
            role
          )
        `)
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const transformedResponses = responsesData?.map((response: any) => ({
        ...response,
        user: response.profiles
      })) || [];

      setResponses(transformedResponses);
    } catch (error) {
      console.error('Error loading responses:', error);
      toast.error('Error al cargar las respuestas');
      setResponses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addResponse = useCallback(async (ticketId: string, content: string, isInternal: boolean = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Get user profile to check if they are the admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user.id)
        .single();

      // Get current ticket info for notifications
      const { data: ticket } = await supabase
        .from('tickets')
        .select('status, code, subject, requester, requester_email')
        .eq('id', ticketId)
        .single();

      // Insert the response
      const { error } = await supabase
        .from('ticket_responses')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          content: content.trim(),
          is_internal: isInternal
        });

      if (error) throw error;

      // Send email notification for new message (only if not internal)
      if (ticket && !isInternal) {
        try {
          await supabase.functions.invoke('send-ticket-notification', {
            body: {
              type: 'message_added',
              ticketId,
              ticketCode: ticket.code,
              subject: ticket.subject,
              requester: ticket.requester,
              requesterEmail: ticket.requester_email,
              messageContent: content.trim()
            }
          });
        } catch (emailError) {
          console.error('Error sending message notification:', emailError);
        }
      }

      // If admin responds and ticket is open, change status to in_progress
      if (profile?.email === 'supervisorti@livigui.com' && ticket?.status === 'open') {
        const { error: updateError } = await supabase
          .from('tickets')
          .update({ status: 'in_progress' })
          .eq('id', ticketId);

        if (updateError) {
          console.error('Error updating ticket status:', updateError);
        } else {
          // Send status change notification
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

          toast.success('Respuesta agregada y ticket marcado en progreso');
        }
      } else {
        toast.success('Respuesta agregada correctamente');
      }
      
      // Don't reload manually - let realtime handle it
    } catch (error) {
      console.error('Error adding response:', error);
      toast.error('Error al agregar la respuesta');
    }
  }, []);

  // Set up realtime subscription for automatic updates
  useEffect(() => {
    if (!ticketId) {
      setResponses([]);
      setIsLoading(false);
      return;
    }

    // Initial load
    loadResponses(ticketId);

    // Set up realtime subscription
    const channel = supabase
      .channel(`ticket_responses_${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_responses',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          console.log('Realtime response update:', payload);
          // Reload responses when any change occurs
          loadResponses(ticketId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, loadResponses]);

  return {
    responses,
    isLoading,
    loadResponses,
    addResponse
  };
};