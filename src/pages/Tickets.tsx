import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  Grid3X3,
  Table,
  Inbox,
  Kanban,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Ticket, TicketStatus } from '@/types/ticket';
import { CreateTicketModal } from '@/components/CreateTicketModal';
import { TicketDetailModal } from '@/components/TicketDetailModal';
import { TicketStats } from '@/components/TicketStats';
import { TicketCardsView } from '@/components/TicketCardsView';
import { TicketInboxView } from '@/components/TicketInboxView';
import { TicketTableView } from '@/components/TicketTableView';
import { TicketKanbanView } from '@/components/TicketKanbanView';
import { DateFilter, DateRange, DateFilterType } from '@/components/DateFilter';
import { useTickets } from '@/hooks/useTickets';

type ViewMode = 'cards' | 'table' | 'inbox' | 'kanban';

export default function Tickets() {
  const [searchParams] = useSearchParams();
  const { tickets, loading, createTicket, updateTicket, deleteTicket, refreshTickets } = useTickets('page');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { from: today, to: today };
  });

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  }), [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ticket.requester.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ticket.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      
      // Date filter logic
      let matchesDate = true;
      if (dateFilter !== 'all' && dateRange.from && dateRange.to) {
        const ticketDate = new Date(ticket.createdAt);
        const fromDate = startOfDay(dateRange.from);
        const toDate = endOfDay(dateRange.to);
        matchesDate = isWithinInterval(ticketDate, { start: fromDate, end: toDate });
      } else if (dateFilter !== 'all' && dateRange.from && !dateRange.to) {
        const ticketDate = new Date(ticket.createdAt);
        const fromDate = startOfDay(dateRange.from);
        matchesDate = ticketDate >= fromDate;
      } else if (dateFilter !== 'all' && !dateRange.from && dateRange.to) {
        const ticketDate = new Date(ticket.createdAt);
        const toDate = endOfDay(dateRange.to);
        matchesDate = ticketDate <= toDate;
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [tickets, searchTerm, statusFilter, dateFilter, dateRange]);

  // Show all filtered tickets in all views
  const displayTickets = filteredTickets;

  // Handle URL parameters for filtering
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    const viewParam = searchParams.get('view');
    
    if (filterParam && filterParam !== 'all') {
      setStatusFilter(filterParam as TicketStatus);
    }
    
    if (viewParam) {
      setViewMode(viewParam as ViewMode);
    }
  }, [searchParams]);

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowDetailModal(true);
  };

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Panel de Tickets
            </h1>
            <p className="text-muted-foreground">
              Gestión y respuesta de tickets
            </p>
          </div>
          
          <CreateTicketModal 
            onCreateTicket={createTicket}
          />
        </div>

      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Refresh Button */}
              <Button 
                variant="outline" 
                onClick={refreshTickets}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualizar Panel
              </Button>

              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    {statusFilter === 'all' ? 'Todos' : 
                     statusFilter === 'open' ? 'Ingresado' :
                     statusFilter === 'in_progress' ? 'En Progreso' :
                     statusFilter === 'resolved' ? 'Resuelto' : 'Cerrado'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-background border border-border shadow-lg">
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                    Todos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('open')}>
                    Ingresado
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('in_progress')}>
                    En Progreso
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('resolved')}>
                    Resuelto
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('closed')}>
                    Cerrado
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Date Filter */}
              <DateFilter
                value={dateFilter}
                dateRange={dateRange}
                onValueChange={setDateFilter}
                onDateRangeChange={setDateRange}
              />
            </div>

            {/* View Mode Toggles */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="gap-2"
              >
                <Grid3X3 className="h-4 w-4" />
                Vista de tarjeta
              </Button>
              <Button
                variant={viewMode === 'inbox' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('inbox')}
                className="gap-2"
              >
                <Inbox className="h-4 w-4" />
                Bandeja de entrada
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="gap-2"
              >
                <Table className="h-4 w-4" />
                Vista de tabla
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="gap-2"
              >
                <Kanban className="h-4 w-4" />
                Vista Kanban
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Content */}
      <div className="space-y-6">
        {viewMode === 'cards' && (
          <TicketCardsView 
            tickets={displayTickets} 
            onViewTicket={handleViewTicket} 
          />
        )}
        
        {viewMode === 'table' && (
          <TicketTableView 
            tickets={displayTickets} 
            onViewTicket={handleViewTicket}
            onDeleteTicket={deleteTicket}
          />
        )}
        
        {viewMode === 'inbox' && (
          <TicketInboxView 
            tickets={displayTickets} 
            onViewTicket={handleViewTicket} 
          />
        )}

        {viewMode === 'kanban' && (
          <TicketKanbanView 
            tickets={displayTickets} 
            onViewTicket={handleViewTicket} 
          />
        )}

        {displayTickets.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No se encontraron tickets</h3>
                <p>No hay tickets que coincidan con los filtros seleccionados.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}      
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          open={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          onUpdateTicket={(updatedTicket) => {
            updateTicket(updatedTicket.id, updatedTicket);
            setShowDetailModal(false);
          }}
        />
      )}
    </div>
  );
}