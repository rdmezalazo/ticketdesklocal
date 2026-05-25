import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  MoreHorizontal,
  ArrowUpDown,
  Trash2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Ticket, TicketStatus } from '@/types/ticket';
import { useState, useMemo } from 'react';
import { stripHtmlAndImages } from '@/utils/htmlUtils';
import { getEffectiveTicketStatus } from '@/utils/ticketUtils';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useSettings } from '@/hooks/useSettings';
import { translateStatus, translatePriority } from '@/utils/translationUtils';

interface TicketTableViewProps {
  tickets: Ticket[];
  onViewTicket: (ticket: Ticket) => void;
  onDeleteTicket?: (ticketId: string) => void;
}

type SortField = 'subject' | 'requester' | 'status' | 'priority' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export function TicketTableView({ tickets, onViewTicket, onDeleteTicket }: TicketTableViewProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);
  const { hasAccess } = useUserPermissions();
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

  const getStatusBadge = (ticket: Ticket) => {
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedTickets = [...tickets].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];
    
    if (sortField === 'createdAt') {
      aValue = a.createdAt.getTime();
      bValue = b.createdAt.getTime();
    }
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead>
      <Button 
        variant="ghost" 
        onClick={() => handleSort(field)}
        className="h-auto p-0 font-medium text-left justify-start gap-1"
      >
        {children}
        <ArrowUpDown className="h-3 w-3" />
      </Button>
    </TableHead>
  );

  const handleDeleteTicket = (ticketId: string) => {
    setDeleteTicketId(ticketId);
  };

  const confirmDeleteTicket = () => {
    if (deleteTicketId && onDeleteTicket) {
      onDeleteTicket(deleteTicketId);
      setDeleteTicketId(null);
    }
  };

  const isAdmin = hasAccess('users') || hasAccess('settings');

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <SortableHeader field="subject">Asunto</SortableHeader>
              <SortableHeader field="requester">Solicitante</SortableHeader>
              <SortableHeader field="status">Estado</SortableHeader>
              <SortableHeader field="priority">Prioridad</SortableHeader>
              <SortableHeader field="createdAt">Creado</SortableHeader>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTickets.map((ticket) => (
              <TableRow 
                key={ticket.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onViewTicket(ticket)}
              >
                <TableCell className="font-mono text-xs">
                  {ticket.code}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{ticket.subject}</div>
                    <div className="text-sm text-muted-foreground truncate max-w-xs">
                      {stripHtmlAndImages(ticket.description)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {ticket.requester.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{ticket.requester}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(ticket)}
                </TableCell>
                <TableCell>
                  {getPriorityBadge(ticket.priority)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {ticket.createdAt.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </TableCell>
                <TableCell>
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
                        Editar ticket
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Asignar usuario
                      </DropdownMenuItem>
                      {isAdmin && onDeleteTicket && (
                        <DropdownMenuItem 
                          onClick={() => handleDeleteTicket(ticket.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar ticket
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      
      <AlertDialog open={!!deleteTicketId} onOpenChange={() => setDeleteTicketId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El ticket y todos sus datos asociados serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteTicket}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}