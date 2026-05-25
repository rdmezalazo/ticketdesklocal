import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar,
  MessageCircle,
  MoreHorizontal,
  Archive,
  Trash2,
  NotebookPen,
  Clock,
  User,
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Ticket, TicketStatus } from '@/types/ticket';
import { useState, useEffect, useMemo } from 'react';
import { stripHtmlAndImages } from '@/utils/htmlUtils';
import { getEffectiveTicketStatus } from '@/utils/ticketUtils';
import { TicketResponseThread } from '@/components/TicketResponseThread';
import { TicketGanttChart } from '@/components/TicketGanttChart';
import { useTicketResponses } from '@/hooks/support/useTicketResponses';
import { useTicketActivities } from '@/hooks/useTicketActivities';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from '@/hooks/useSettings';
import { translateStatus, translatePriority } from '@/utils/translationUtils';

interface TicketInboxViewProps {
  tickets: Ticket[];
  onViewTicket: (ticket: Ticket) => void;
}

export function TicketInboxView({ tickets, onViewTicket }: TicketInboxViewProps) {
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [previewTicket, setPreviewTicket] = useState<Ticket | null>(tickets[0] || null);
  const [userRole, setUserRole] = useState<string>('usuario');
  const { user } = useAuth();
  const { ticketStatuses, ticketPriorities } = useSettings();

  // Hooks for ticket data
  const { activities } = useTicketActivities(previewTicket?.id);
  const { 
    responses, 
    isLoading: responsesLoading, 
    addResponse 
  } = useTicketResponses(previewTicket?.id);

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

  // Load user role when preview ticket changes
  useEffect(() => {
    if (!previewTicket || !user) return;

    const loadUserRole = async () => {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          setUserRole(profileData.role);
        }
      } catch (error) {
        console.error('Error loading user role:', error);
      }
    };

    loadUserRole();
  }, [previewTicket, user]);

  const getStatusBadge = (ticket: Ticket) => {
    const effectiveStatus = getEffectiveTicketStatus(ticket.status, ticket.conformidadStatus);
    const statusConfig = statusMap.get(effectiveStatus);
    
    if (statusConfig) {
      return (
        <Badge 
          className="text-xs"
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
    
    return <Badge variant="outline" className="text-xs">{translateStatus(effectiveStatus)}</Badge>;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-500';
      case 'high':
        return 'border-l-orange-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-300';
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays}d`;
    } else if (diffHours > 0) {
      return `${diffHours}h`;
    } else {
      return '< 1h';
    }
  };

  const formatFullTime = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSelectTicket = (ticketId: string, checked: boolean) => {
    if (checked) {
      setSelectedTickets([...selectedTickets, ticketId]);
    } else {
      setSelectedTickets(selectedTickets.filter(id => id !== ticketId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTickets(tickets.map(t => t.id));
    } else {
      setSelectedTickets([]);
    }
  };

  const handleTicketClick = (ticket: Ticket) => {
    setPreviewTicket(ticket);
  };

  const getPriorityBadgeForPreview = (priority: string) => {
    const level = getPriorityLevel(priority);
    const priorityConfig = priorityMap.get(level);
    
    if (priorityConfig) {
      return (
        <Badge 
          className="gap-1"
          style={{ 
            backgroundColor: priorityConfig.color,
            color: '#ffffff',
            borderColor: priorityConfig.color
          }}
        >
          <AlertCircle className="h-3 w-3" />
          {priorityConfig.name}
        </Badge>
      );
    }
    
    return <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" />{translatePriority(priority)}</Badge>;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100vh-300px)]">
      {/* Left Panel - Ticket List */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardContent className="p-0 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b bg-muted/50">
              <Checkbox
                checked={selectedTickets.length === tickets.length && tickets.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedTickets.length > 0 ? `${selectedTickets.length} seleccionados` : 'Seleccionar todo'}
              </span>
              {selectedTickets.length > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Archive className="h-4 w-4" />
                    Archivar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              )}
            </div>

            {/* Ticket List */}
            <div className="divide-y flex-1 overflow-y-auto">
              {tickets.map((ticket) => (
                <div 
                  key={ticket.id} 
                  className={`flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer border-l-4 ${getPriorityColor(ticket.priority)} ${
                    previewTicket?.id === ticket.id ? 'bg-muted/30' : ''
                  }`}
                  onClick={() => handleTicketClick(ticket)}
                >
                  <Checkbox
                    checked={selectedTickets.includes(ticket.id)}
                    onCheckedChange={(checked) => handleSelectTicket(ticket.id, !!checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {ticket.requester.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{ticket.requester}</span>
                      {getStatusBadge(ticket)}
                    </div>
                    <h3 className="font-semibold text-foreground mb-1 truncate">
                      {ticket.subject}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {stripHtmlAndImages(ticket.description)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatRelativeTime(ticket.createdAt)}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewTicket(ticket)}>
                        Ver detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Responder
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Archive className="h-4 w-4 mr-2" />
                        Archivar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Preview */}
      <div className="lg:col-span-3">
        <Card className="h-full">
          {previewTicket ? (
            <CardContent className="p-0 h-full flex flex-col">
              {/* Header */}
              <div className="p-6 border-b">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getPriorityBadgeForPreview(previewTicket.priority)}
                      {getStatusBadge(previewTicket)}
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      {previewTicket.subject}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Ticket {previewTicket.code}
                    </p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewTicket(previewTicket)}>
                        Ver detalles completos
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Editar ticket
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Asignar usuario
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* User & Date Info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {previewTicket.requester.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{previewTicket.requester}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{formatFullTime(previewTicket.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-400px)]">
                <div className="p-6 space-y-6">
                  {/* Description */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Descripción</h4>
                    <div className="prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: previewTicket.description || '' }} />
                    </div>
                  </div>
                  
                  {/* Response Thread */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Hilo de Respuestas</h4>
                    <TicketResponseThread
                      responses={responses || []}
                      onAddResponse={async (content, isInternal) => {
                        if (previewTicket?.id) {
                          await addResponse(previewTicket.id, content, isInternal);
                        }
                      }}
                      isLoading={responsesLoading}
                      currentUserRole={userRole}
                    />
                  </div>
                  
                  {/* Activities & Progress */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Actividades y Progreso</h4>
                    <TicketGanttChart activities={activities || []} />
                  </div>
                </div>
              </div>
            </CardContent>
          ) : (
            <CardContent className="p-8 h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Selecciona un ticket</h3>
                <p>Selecciona un ticket de la lista para ver la vista previa</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}