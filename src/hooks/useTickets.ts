import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Ticket, TicketStatus, TicketPriority, TicketCategory } from "@/types/ticket";
import { useToast } from "@/hooks/use-toast";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useAuth } from "@/hooks/useAuth";

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  file_url: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface TicketWithAttachments extends Ticket {
  attachments?: TicketAttachment[];
}

export const useTickets = (context: 'dashboard' | 'page' = 'page') => {
  const [allTickets, setAllTickets] = useState<TicketWithAttachments[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { preferences, loading: preferencesLoading } = useUserPreferences();

  // Compute filtered tickets based on context and preferences
  const tickets = (() => {
    if (preferencesLoading || !user) return allTickets;
    
    const shouldShowAll = context === 'dashboard' 
      ? preferences.dashboard_show_all_tickets 
      : preferences.page_show_all_tickets;
    
    if (shouldShowAll) {
      return allTickets;
    } else {
      // Show only tickets created by the current user
      return allTickets.filter(ticket => ticket.createdBy === user.id);
    }
  })();

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          *,
          attachments:ticket_attachments(*)
        `)
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      const formattedTickets = ticketsData?.map(ticket => ({
        id: ticket.id,
        code: ticket.code,
        subject: ticket.subject,
        description: ticket.description || "",
        status: ticket.status as TicketStatus,
        priority: ticket.priority as TicketPriority,
        category: ticket.category as TicketCategory,
        requester: ticket.requester,
        requesterEmail: ticket.requester_email,
        requesterArea: ticket.requester_area || "",
        requesterCargo: ticket.requester_cargo || "",
        requesterSede: ticket.requester_sede,
        assignee: ticket.assignee || "",
        tags: ticket.tags || [],
        createdAt: new Date(ticket.created_at),
        updatedAt: new Date(ticket.updated_at),
        attachments: ticket.attachments || [],
        activitiesProgressAvg: ticket.activities_progress_avg || 0,
        conformidadStatus: ticket.conformidad_status || false,
        conformidadDate: ticket.conformidad_date ? new Date(ticket.conformidad_date) : undefined,
        conformidadUserId: ticket.conformidad_user_id || undefined,
        createdBy: ticket.created_by
      })) || [];

      setAllTickets(formattedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los tickets.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Generate ticket code
      const { data: codeData, error: codeError } = await supabase.rpc(
        'generate_ticket_code', 
        { sede: ticketData.requesterSede, area: ticketData.requesterArea }
      );
      
      if (codeError) throw codeError;

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          code: codeData,
          subject: ticketData.subject,
          description: ticketData.description,
          status: ticketData.status,
          priority: ticketData.priority,
          category: ticketData.category,
          requester: ticketData.requester,
          requester_email: ticketData.requesterEmail,
          requester_area: ticketData.requesterArea,
          requester_cargo: ticketData.requesterCargo,
          requester_sede: ticketData.requesterSede,
          assignee: ticketData.assignee,
          tags: ticketData.tags,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification
      try {
        const { error: emailError } = await supabase.functions.invoke('send-ticket-notification', {
          body: {
            type: 'ticket_created',
            ticketId: data.id,
            ticketCode: codeData,
            subject: ticketData.subject,
            requester: ticketData.requester,
            requesterEmail: ticketData.requesterEmail,
            assignee: ticketData.assignee,
            priority: ticketData.priority,
            category: ticketData.category
          }
        });

        if (emailError) {
          console.error('Error sending email notification:', emailError);
          toast({
            title: "¡Ticket creado!",
            description: `El ticket ${codeData} ha sido creado exitosamente. Nota: No se pudo enviar la notificación por email.`,
          });
        } else {
          console.log('Email notification sent successfully');
          toast({
            title: "¡Ticket creado!",
            description: `El ticket ${codeData} ha sido creado exitosamente y se ha enviado la notificación por email.`,
          });
        }
      } catch (emailError) {
        console.error('Error calling email function:', emailError);
        toast({
          title: "¡Ticket creado!",
          description: `El ticket ${codeData} ha sido creado exitosamente. Nota: No se pudo enviar la notificación por email.`,
        });
      }

      await fetchTickets();
      return data;
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el ticket.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateTicket = async (ticketId: string, updates: Partial<Ticket>) => {
    try {
      // Get current ticket data before update for comparison
      const { data: currentTicket } = await supabase
        .from('tickets')
        .select('*, requester, requester_email, code, subject, status')
        .eq('id', ticketId)
        .single();

      const { error } = await supabase
        .from('tickets')
        .update({
          subject: updates.subject,
          description: updates.description,
          status: updates.status,
          priority: updates.priority,
          category: updates.category,
          assignee: updates.assignee,
          tags: updates.tags,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      // Send email notifications
      if (currentTicket) {
        try {
          // Check if status changed
          if (updates.status && updates.status !== currentTicket.status) {
            await supabase.functions.invoke('send-ticket-notification', {
              body: {
                type: 'status_changed',
                ticketId,
                ticketCode: currentTicket.code,
                subject: currentTicket.subject,
                requester: currentTicket.requester,
                requesterEmail: currentTicket.requester_email,
                assignee: updates.assignee || currentTicket.assignee,
                oldStatus: currentTicket.status,
                newStatus: updates.status
              }
            });
          } else {
            // General update notification
            await supabase.functions.invoke('send-ticket-notification', {
              body: {
                type: 'ticket_updated',
                ticketId,
                ticketCode: currentTicket.code,
                subject: updates.subject || currentTicket.subject,
                requester: currentTicket.requester,
                requesterEmail: currentTicket.requester_email,
                assignee: updates.assignee || currentTicket.assignee,
                priority: updates.priority || currentTicket.priority,
                category: updates.category || currentTicket.category
              }
            });
          }
        } catch (emailError) {
          console.error('Error sending update notification:', emailError);
        }
      }

      toast({
        title: "Ticket actualizado",
        description: "Los cambios han sido guardados exitosamente.",
      });

      await fetchTickets();
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el ticket.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const uploadAttachment = async (ticketId: string, file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${ticketId}/${Date.now()}_${file.name}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(fileName);

      // Save attachment record
      const { error: attachmentError } = await supabase
        .from('ticket_attachments')
        .insert({
          ticket_id: ticketId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: publicUrl,
          uploaded_by: user.id
        });

      if (attachmentError) throw attachmentError;

      await fetchTickets();

      toast({
        title: "Archivo adjunto",
        description: `El archivo ${file.name} se ha adjuntado exitosamente.`,
      });

    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast({
        title: "Error",
        description: "No se pudo adjuntar el archivo.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Ticket eliminado",
        description: "El ticket ha sido eliminado exitosamente.",
      });

      await fetchTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el ticket.",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchTickets();

    // Subscribe to real-time updates with specific event handling
    const subscription = supabase
      .channel('tickets_realtime_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets'
        },
        (payload) => {
          console.log('Ticket created:', payload);
          fetchTickets();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets'
        },
        (payload) => {
          console.log('Ticket updated:', payload);
          fetchTickets();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tickets'
        },
        (payload) => {
          console.log('Ticket deleted:', payload);
          fetchTickets();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_activities'
        },
        (payload) => {
          console.log('Ticket activity changed:', payload);
          fetchTickets();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Unsubscribing from realtime updates');
      subscription.unsubscribe();
    };
  }, []);

  return {
    tickets,
    loading,
    createTicket,
    updateTicket,
    uploadAttachment,
    deleteTicket,
    refreshTickets: fetchTickets
  };
};