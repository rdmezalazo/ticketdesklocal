import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar,
  MessageCircle,
  NotebookPen,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Ticket, TicketStatus } from '@/types/ticket';
import { stripHtmlAndImages } from '@/utils/htmlUtils';
import { getEffectiveTicketStatus } from '@/utils/ticketUtils';
import { useSettings } from '@/hooks/useSettings';
import { translateStatus, translatePriority } from '@/utils/translationUtils';
import { useMemo } from 'react';

interface TicketCardsViewProps {
  tickets: Ticket[];
  onViewTicket: (ticket: Ticket) => void;
}

export function TicketCardsView({ tickets, onViewTicket }: TicketCardsViewProps) {
  const { ticketStatuses, ticketPriorities } = useSettings();

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

  const getActivityStatus = (progress: number) => {
    if (progress === 0) return { status: "Pendiente", variant: "secondary" as const };
    if (progress >= 1 && progress < 50) return { status: "En Progreso", variant: "outline" as const };
    if (progress >= 50 && progress < 85) return { status: "Por Terminar", variant: "default" as const };
    return { status: "Terminado", variant: "default" as const };
  };

  const getStatusBadge = (ticket: Ticket) => {
    const effectiveStatus = getEffectiveTicketStatus(ticket.status, ticket.conformidadStatus);
    const statusConfig = statusMap.get(effectiveStatus);
    
    if (statusConfig) {
      return (
        <Badge 
          className="font-medium"
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
    
    return <Badge variant="outline" className="font-medium">{translateStatus(effectiveStatus)}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const level = getPriorityLevel(priority);
    const priorityConfig = priorityMap.get(level);
    
    if (priorityConfig) {
      return (
        <Badge 
          className="text-xs"
          style={{ 
            backgroundColor: priorityConfig.color,
            color: '#ffffff',
            borderColor: priorityConfig.color
          }}
        >
          {priorityConfig.name}
        </Badge>
      );
    }
    
    return <Badge variant="outline" className="text-xs">{translatePriority(priority)}</Badge>;
  };

  const isOverdue = (ticket: Ticket) => {
    const now = new Date();
    const diffHours = (now.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
    
    const effectiveStatus = getEffectiveTicketStatus(ticket.status, ticket.conformidadStatus);
    if (effectiveStatus === 'resolved' || effectiveStatus === 'closed') return false;
    
    return diffHours > 24;
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else {
      return 'hace unos minutos';
    }
  };

  return (
    <div className="grid gap-4">
      {tickets.map((ticket) => (
        <Card key={ticket.id} className="hover:shadow-medium transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {ticket.requester.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    {isOverdue(ticket) && (
                      <Badge variant="destructive" className="text-xs">Vencido</Badge>
                    )}
                     {getPriorityBadge(ticket.priority)}
                     {getStatusBadge(ticket)}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewTicket(ticket)}>
                        Ver detalles
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
                
                <h3 className="font-semibold text-foreground mb-1 cursor-pointer hover:underline"
                    onClick={() => onViewTicket(ticket)}>
                  {ticket.subject} #{ticket.code}
                </h3>
                
                <p className="text-sm text-muted-foreground mb-2">
                  <span className="font-medium text-foreground">{ticket.requester}</span> ha enviado un nuevo ticket
                </p>
                
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatRelativeTime(ticket.createdAt)} • {ticket.createdAt.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                
                <p className="text-sm text-foreground mb-4 line-clamp-2">
                  {stripHtmlAndImages(ticket.description)}
                </p>
                
                {/* Activities Progress */}
                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Progreso de Actividades</span>
                    <Badge variant={getActivityStatus(ticket.activitiesProgressAvg || 0).variant} className="text-xs">
                      {getActivityStatus(ticket.activitiesProgressAvg || 0).status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={ticket.activitiesProgressAvg || 0} className="h-2 flex-1" />
                    <span className="text-sm font-medium min-w-[35px]">{ticket.activitiesProgressAvg || 0}%</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <MessageCircle className="h-3 w-3" />
                    Responder
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <NotebookPen className="h-3 w-3" />
                    Añadir nota
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}