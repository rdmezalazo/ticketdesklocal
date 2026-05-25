import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Ticket, TicketStatus, TicketPriority } from "@/types/ticket";
import { Search, Eye, Filter } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSettings } from "@/hooks/useSettings";
import { getEffectiveTicketStatus } from "@/utils/ticketUtils";
import { translateStatus, translatePriority } from "@/utils/translationUtils";

interface TicketTableProps {
  tickets: Ticket[];
  onViewTicket: (ticket: Ticket) => void;
}

const getActivityStatus = (progress: number) => {
  if (progress === 0) return { status: "Pendiente", variant: "secondary" as const };
  if (progress >= 1 && progress < 50) return { status: "En Progreso", variant: "outline" as const };
  if (progress >= 50 && progress < 85) return { status: "Por Terminar", variant: "default" as const };
  return { status: "Terminado", variant: "default" as const };
};

export const TicketTable = ({ tickets, onViewTicket }: TicketTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
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

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.requester.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <Card className="p-6 shadow-medium">
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tickets por código, asunto o solicitante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
            size="sm"
          >
            Todos
          </Button>
          <Button
            variant={statusFilter === "open" ? "default" : "outline"}
            onClick={() => setStatusFilter("open")}
            size="sm"
          >
            Ingresados
          </Button>
          <Button
            variant={statusFilter === "in_progress" ? "default" : "outline"}
            onClick={() => setStatusFilter("in_progress")}
            size="sm"
          >
            En Progreso
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Asunto</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Progreso</TableHead>
              <TableHead>Asignado a</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTickets.map((ticket) => (
              <TableRow key={ticket.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium text-primary">{ticket.code}</TableCell>
                <TableCell className="max-w-xs">
                  <div className="truncate font-medium">{ticket.subject}</div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{ticket.requester}</div>
                    <div className="text-sm text-muted-foreground">{ticket.requesterEmail}</div>
                  </div>
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
                  {(() => {
                    const level = getPriorityLevel(ticket.priority);
                    const priorityConfig = priorityMap.get(level);
                    
                    if (priorityConfig) {
                      return (
                        <Badge 
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
                    
                    return <Badge variant="outline">{translatePriority(ticket.priority)}</Badge>;
                  })()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <Progress value={ticket.activitiesProgressAvg || 0} className="h-2 flex-1" />
                    <span className="text-xs font-medium min-w-[35px]">{ticket.activitiesProgressAvg || 0}%</span>
                  </div>
                  <div className="mt-1">
                    <Badge variant={getActivityStatus(ticket.activitiesProgressAvg || 0).variant} className="text-xs">
                      {getActivityStatus(ticket.activitiesProgressAvg || 0).status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {ticket.assignee ? (
                    <span className="text-sm">{ticket.assignee}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin asignar</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(ticket.createdAt, "dd MMM yyyy", { locale: es })}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost" 
                    size="sm"
                    onClick={() => onViewTicket(ticket)}
                    className="hover:bg-primary/10"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredTickets.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No se encontraron tickets que coincidan con los filtros.
        </div>
      )}
    </Card>
  );
};