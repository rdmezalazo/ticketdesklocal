import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Ticket, TicketStatus, TicketPriority } from "@/types/ticket";
import { Calendar, User, Mail, Tag, Clock, UserCheck, ChevronDown, ChevronUp, Building, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTicketResponses } from "@/hooks/support/useTicketResponses";
import { TicketResponseThread } from "./TicketResponseThread";
import { TicketActivitiesModal } from "./TicketActivitiesModal";
import { TicketGanttChart } from "./TicketGanttChart";
import { supabase } from "@/integrations/supabase/client";
import { useTicketActivities } from "@/hooks/useTicketActivities";
import { getEffectiveTicketStatus } from "@/utils/ticketUtils";
import { useSettings } from "@/hooks/useSettings";
import { translateStatus, translatePriority } from "@/utils/translationUtils";

interface TicketDetailModalProps {
  ticket: Ticket | null;
  open: boolean;
  onClose: () => void;
  onUpdateTicket: (ticket: Ticket) => void;
}

export const TicketDetailModal = ({ ticket, open, onClose, onUpdateTicket }: TicketDetailModalProps) => {
  const [status, setStatus] = useState<TicketStatus>(ticket?.status || 'open');
  const [priority, setPriority] = useState<TicketPriority>(ticket?.priority || 'medium');
  const [description, setDescription] = useState<string>(ticket?.description || '');
  const [showRequesterDetails, setShowRequesterDetails] = useState(false);
  const [userRole, setUserRole] = useState<string>('usuario');
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [conformidadStatus, setConformidadStatus] = useState<boolean>(ticket?.conformidadStatus || false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { activities, loadActivities } = useTicketActivities(ticket?.id);
  const { ticketStatuses, ticketPriorities } = useSettings();
  
  const { 
    responses, 
    isLoading: responsesLoading, 
    addResponse 
  } = useTicketResponses(ticket?.id);

  const statusMap = useMemo(() => {
    const map = new Map();
    ticketStatuses.forEach(status => {
      map.set(status.slug, status);
    });
    return map;
  }, [ticketStatuses]);

  const priorityMap = useMemo(() => {
    const map = new Map();
    ticketPriorities.forEach(priority => {
      map.set(priority.level, priority);
    });
    return map;
  }, [ticketPriorities]);

  const getPriorityLevel = (priority: string): number => {
    switch (priority) {
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      case 'critical': return 4;
      default: return 2;
    }
  };

  // Load user role when ticket changes
  useEffect(() => {
    if (!ticket || !user) return;

    // Update local state when ticket changes
    setStatus(ticket.status);
    setPriority(ticket.priority);
    setDescription(ticket.description || '');
    setConformidadStatus(ticket.conformidadStatus || false);

    // Load user role
    const loadUserRole = async () => {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        setUserRole(profileData?.role || 'usuario');
      } catch (error) {
        console.error('Error loading user role:', error);
      }
    };

    loadUserRole();
  }, [ticket, user]);

  // Real-time subscription for ticket updates
  useEffect(() => {
    if (!ticket?.id) return;

    console.log('Setting up real-time subscription for ticket:', ticket.id);
    
    const channel = supabase
      .channel('ticket-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${ticket.id}`
        },
        (payload) => {
          console.log('Ticket updated via real-time:', payload.new);
          const updatedTicket = payload.new as Ticket;
          
          // Update local state immediately to reflect changes
          setStatus(updatedTicket.status);
          setPriority(updatedTicket.priority);
          setDescription(updatedTicket.description || '');
          setConformidadStatus(updatedTicket.conformidadStatus || false);
          
          // Also update the parent component
          onUpdateTicket(updatedTicket);
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription for ticket:', ticket.id);
      supabase.removeChannel(channel);
    };
  }, [ticket?.id, onUpdateTicket]);

  if (!ticket) return null;

  const handleUpdateTicket = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Update ticket in database - the realtime subscription will handle UI updates
      const { error } = await supabase
        .from('tickets')
        .update({
          status,
          priority,
          description,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticket.id);

      if (error) throw error;

      // Send notification if activities were added/updated (this triggers when Save Changes is pressed)
      if (activities && activities.length > 0) {
        try {
          await supabase.functions.invoke('send-ticket-notification', {
            body: {
              type: 'ticket_updated',
              ticketId: ticket.id,
              ticketCode: ticket.code,
              subject: ticket.subject,
              requester: ticket.requester,
              requesterEmail: ticket.requesterEmail,
              activities: activities.map(a => ({
                number: a.activity_number,
                description: a.description,
                dueDate: a.due_date,
                progress: a.progress
              }))
            }
          });
        } catch (emailError) {
          console.error('Error sending ticket update notification:', emailError);
        }
      }
      
      toast({
        title: "Ticket actualizado",
        description: "Los cambios han sido guardados exitosamente.",
      });
      
      // Close modal - the parent component will update via realtime subscription
      onClose();
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el ticket",
        variant: "destructive",
      });
    }
  };

  const handleConformidadToggle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const newConformidadStatus = !conformidadStatus;
      const conformidadDate = newConformidadStatus ? new Date().toISOString() : null;
      const conformidadUserId = newConformidadStatus ? user.id : null;
      const newStatus = newConformidadStatus ? 'closed' : 'resolved';

      // Update in database - realtime subscription will handle UI updates
      const { error } = await supabase
        .from('tickets')
        .update({
          conformidad_status: newConformidadStatus,
          conformidad_date: conformidadDate,
          conformidad_user_id: conformidadUserId,
          status: newStatus
        })
        .eq('id', ticket.id);

      if (error) throw error;

      // Update local state immediately for UI responsiveness
      setConformidadStatus(newConformidadStatus);
      setStatus(newStatus as TicketStatus);

      toast({
        title: newConformidadStatus ? "Conformidad registrada" : "Conformidad retirada",
        description: newConformidadStatus 
          ? "Se ha registrado su conformidad y el ticket se ha cerrado."
          : "Se ha retirado la conformidad y el ticket vuelve a estado resuelto.",
      });
    } catch (error) {
      console.error('Error updating conformidad:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la conformidad",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-primary font-mono">{ticket.code}</span>
             {(() => {
               const effectiveStatus = getEffectiveTicketStatus(ticket.status, ticket.conformidadStatus);
               const statusConfig = statusMap.get(effectiveStatus);
               
               if (statusConfig) {
                 return (
                   <Badge 
                     style={{ 
                       backgroundColor: statusConfig.color,
                       color: '#ffffff',
                       borderColor: statusConfig.color
                     }}
                   >
                     {statusConfig.name}
                   </Badge>
                 );
               }
               
               return <Badge variant="outline">{translateStatus(effectiveStatus)}</Badge>;
             })()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6">
          {/* Asunto */}
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-2">{ticket.subject}</h3>
          </div>

          {/* Información del solicitante */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-foreground">Información del Solicitante</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowRequesterDetails(!showRequesterDetails)}
                className="text-muted-foreground hover:text-foreground"
              >
                {showRequesterDetails ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Mostrar
                  </>
                )}
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              {!showRequesterDetails ? (
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{ticket.requester}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{ticket.requesterEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">
                      {ticket.category}
                    </Badge>
                  </div>
                  {ticket.requesterSede && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {ticket.requesterSede}
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{ticket.requester}</span>
                    {ticket.requesterSede && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {ticket.requesterSede}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{ticket.requesterEmail}</span>
                  </div>
                  {ticket.requesterArea && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building className="h-4 w-4" />
                      <span><span className="font-medium">Área:</span> {ticket.requesterArea}</span>
                      {ticket.requesterCargo && <span> - {ticket.requesterCargo}</span>}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">
                      {ticket.category}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Detalles del ticket */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Estado</label>
                <Select value={status} onValueChange={(value: TicketStatus) => setStatus(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Ingresado</SelectItem>
                    <SelectItem value="in_progress">En Progreso</SelectItem>
                    <SelectItem value="resolved">Resuelto</SelectItem>
                    <SelectItem value="closed">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Prioridad</label>
                <Select value={priority} onValueChange={(value: TicketPriority) => setPriority(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conformidad Section - Only show for resolved or closed tickets */}
            {(ticket.status === 'resolved' || ticket.status === 'closed') && (
              <div className="space-y-4 p-4 bg-success/5 border border-success/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="conformidad" className="text-sm font-medium text-success">
                      Conformidad
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Confirme si está satisfecho con la solución proporcionada
                    </p>
                  </div>
                  <Switch
                    id="conformidad"
                    checked={conformidadStatus}
                    onCheckedChange={handleConformidadToggle}
                  />
                </div>
                {ticket.conformidadDate && (
                  <div className="text-xs text-muted-foreground">
                    Conformidad registrada el {format(ticket.conformidadDate, "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Asignado a:</span>
                <span className="font-medium bg-muted/50 px-2 py-1 rounded text-xs">
                  {ticket.assignee || 'Ronald Meza, supervisorti@livigui.com'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Creado:</span>
                <span>{format(ticket.createdAt, "dd MMM yyyy 'a las' HH:mm", { locale: es })}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Actualizado:</span>
                <span>{format(ticket.updatedAt, "dd MMM yyyy 'a las' HH:mm", { locale: es })}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Descripción */}
          <div>
            <h4 className="font-medium mb-3">Descripción</h4>
            <div className="min-h-[120px] prose prose-sm max-w-none border rounded-md p-3">
              <div dangerouslySetInnerHTML={{ __html: description || '' }} />
            </div>
          </div>

          {/* Etiquetas */}
          {ticket.tags.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Etiquetas
                <span className="text-xs text-muted-foreground font-normal">(Opcional)</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {ticket.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Cronograma de Actividades - always show this component */}
          <div>
            <TicketGanttChart activities={activities || []} />
          </div>

          <Separator />

          {/* Hilo de Respuestas */}
          <TicketResponseThread
            responses={responses}
            onAddResponse={async (content, isInternal) => {
              await addResponse(ticket.id, content, isInternal);
            }}
            isLoading={responsesLoading}
            currentUserRole={userRole}
          />

          </div>
        </div>

        {/* Acciones */}
        <div className="border-t pt-4 mt-4 flex justify-between items-center space-x-2 bg-background">
          <Button 
            variant="outline" 
            onClick={() => setShowActivitiesModal(true)}
            className="flex items-center gap-2"
          >
            <CheckSquare className="w-4 h-4" />
            Actividades
          </Button>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button 
              onClick={handleUpdateTicket}
              className="bg-gradient-primary hover:bg-primary-hover"
            >
              Guardar Cambios
            </Button>
          </div>
        </div>
        
        {/* Modal de Actividades */}
        <TicketActivitiesModal
          ticket={ticket}
          open={showActivitiesModal}
          onClose={() => {
            setShowActivitiesModal(false);
            // Refresh activities when modal closes to reflect any changes
            if (ticket?.id) {
              loadActivities(ticket.id);
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
};