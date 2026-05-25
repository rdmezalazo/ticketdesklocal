import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  MessageCircle,
  MoreHorizontal,
  Plus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Ticket, TicketStatus } from '@/types/ticket';
import { useMemo } from 'react';
import { extractFirstImage, stripHtmlAndImages } from '@/utils/htmlUtils';
import { getEffectiveTicketStatus } from '@/utils/ticketUtils';
import { useSettings } from '@/hooks/useSettings';
import { translatePriority } from '@/utils/translationUtils';

interface TicketKanbanViewProps {
  tickets: Ticket[];
  onViewTicket: (ticket: Ticket) => void;
}

export function TicketKanbanView({ tickets, onViewTicket }: TicketKanbanViewProps) {
  const { ticketPriorities } = useSettings();

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

  const columns = useMemo(() => [
    {
      id: 'open',
      title: 'Ingresado',
      status: 'open' as TicketStatus,
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-800',
      headerColor: 'text-red-700 dark:text-red-300'
    },
    {
      id: 'in_progress',
      title: 'En Progreso',
      status: 'in_progress' as TicketStatus,
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      headerColor: 'text-blue-700 dark:text-blue-300'
    },
    {
      id: 'resolved',
      title: 'Resuelto',
      status: 'resolved' as TicketStatus,
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      borderColor: 'border-green-200 dark:border-green-800',
      headerColor: 'text-green-700 dark:text-green-300'
    },
    {
      id: 'closed',
      title: 'Cerrado',
      status: 'closed' as TicketStatus,
      bgColor: 'bg-gray-50 dark:bg-gray-950/20',
      borderColor: 'border-gray-200 dark:border-gray-800',
      headerColor: 'text-gray-700 dark:text-gray-300'
    }
  ], []);

  const ticketsByStatus = useMemo(() => {
    return columns.reduce((acc, column) => {
      acc[column.status] = tickets.filter(ticket => {
        const effectiveStatus = getEffectiveTicketStatus(ticket.status, ticket.conformidadStatus);
        return effectiveStatus === column.status;
      });
      return acc;
    }, {} as Record<TicketStatus, Ticket[]>);
  }, [tickets, columns]);

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full">
      {columns.map((column) => {
        const columnTickets = ticketsByStatus[column.status] || [];
        
        return (
          <div key={column.id} className="flex flex-col h-full">
            <Card className={`${column.bgColor} ${column.borderColor} border-2`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-sm font-medium ${column.headerColor}`}>
                    {column.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {columnTickets.length}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
            
            <div className="flex-1 space-y-3 mt-2 min-h-0">
              <div className="space-y-3 max-h-full overflow-y-auto">
                {columnTickets.map((ticket) => (
                  <Card 
                    key={ticket.id} 
                    className="cursor-pointer hover:shadow-medium transition-all hover:scale-[1.02]"
                    onClick={() => onViewTicket(ticket)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getPriorityBadge(ticket.priority)}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreHorizontal className="h-3 w-3" />
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
                        
                        <div className="flex-1">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm text-foreground mb-1 line-clamp-2">
                                {ticket.subject}
                              </h3>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {stripHtmlAndImages(ticket.description)}
                              </p>
                            </div>
                            {extractFirstImage(ticket.description) && (
                              <div className="w-12 h-12 flex-shrink-0">
                                <img 
                                  src={extractFirstImage(ticket.description)!} 
                                  alt="Preview" 
                                  className="w-full h-full object-cover rounded border"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                         
                         {/* Activities Progress */}
                         <div className="mb-3 p-2 bg-muted/20 rounded-md">
                           <div className="flex items-center justify-between mb-1">
                             <span className="text-xs font-medium text-muted-foreground">Progreso</span>
                             <span className="text-xs font-medium">{ticket.activitiesProgressAvg || 0}%</span>
                           </div>
                           <div className="h-1.5 bg-background rounded-full overflow-hidden">
                             <div 
                               className="h-full bg-primary rounded-full transition-all duration-300"
                               style={{ width: `${ticket.activitiesProgressAvg || 0}%` }}
                             />
                           </div>
                         </div>
                         
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {ticket.requester.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate max-w-20">
                              {ticket.requester}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatRelativeTime(ticket.createdAt)}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 flex-1">
                            <MessageCircle className="h-3 w-3" />
                            Responder
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}