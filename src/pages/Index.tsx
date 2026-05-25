import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Ticket } from "@/types/ticket";
import { getTicketStats } from "@/data/mockData";
import { TicketStats } from "@/components/TicketStats";
import { TicketTable } from "@/components/TicketTable";
import { CreateTicketModal } from "@/components/CreateTicketModal";
import { TicketDetailModal } from "@/components/TicketDetailModal";
import { useTickets } from "@/hooks/useTickets";
import { useTiTasks } from "@/hooks/useTiTasks";
import { TiTaskStatsComponent } from "@/components/TiTaskStats";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Headphones, TrendingUp, Wrench } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { tickets, createTicket, updateTicket } = useTickets('dashboard');
  const { tiTasks } = useTiTasks();
  const { hasAccess } = useUserPermissions();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const stats = getTicketStats(tickets);
  
  // TI Tasks stats calculation
  const tiTaskStats = useMemo(() => {
    return tiTasks.reduce((acc, task) => {
      const effectiveStatus = task.conformidad_status ? 'closed' : task.status;
      acc.total++;
      switch (effectiveStatus) {
        case 'open':
          acc.open++;
          break;
        case 'in_progress':
          acc.inProgress++;
          break;
        case 'resolved':
          acc.resolved++;
          break;
        case 'closed':
          acc.closed++;
          break;
      }
      return acc;
    }, { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
  }, [tiTasks]);

  const handleStatClick = (filter: string) => {
    navigate(`/tickets?filter=${filter}&view=table`);
  };

  const handleTiTaskStatClick = (filter: string) => {
    navigate(`/ti-tasks?filter=${filter}&view=cards`);
  };

  const handleCreateTicket = async (newTicketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createTicket(newTicketData);
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
  };

  const handleUpdateTicket = async (updatedTicket: Ticket) => {
    await updateTicket(updatedTicket.id, updatedTicket);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTicket(null);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-primary rounded-lg">
              <Headphones className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Sistema de Gestión de Tickets</p>
            </div>
          </div>
          <CreateTicketModal onCreateTicket={handleCreateTicket} />
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Welcome Section */}
        <Card className="p-6 bg-gradient-primary text-primary-foreground shadow-large">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">¡Bienvenido a TicketDesk!</h2>
              <p className="opacity-90">
                Gestiona eficientemente todos los tickets de soporte de tu equipo desde un solo lugar.
              </p>
            </div>
            <TrendingUp className="h-12 w-12 opacity-80" />
          </div>
        </Card>

        {/* Estadísticas de Tickets */}
        <TicketStats stats={stats} onStatClick={handleStatClick} />

        {/* Estadísticas de Tareas de TI - Solo para usuarios TI y Gerencia */}
        {hasAccess('ti-tasks') && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg">
                  <Wrench className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Tareas de TI</h3>
                  <p className="text-sm text-muted-foreground">
                    Estadísticas del equipo de tecnología
                  </p>
                </div>
              </div>
            </div>
            <TiTaskStatsComponent stats={tiTaskStats} onStatClick={handleTiTaskStatClick} />
          </div>
        )}

        {/* Tabla de Tickets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Lista de Tickets</h3>
              <p className="text-sm text-muted-foreground">
                Gestiona y supervisa todos los tickets de soporte
              </p>
            </div>
          </div>
          
          <TicketTable 
            tickets={tickets} 
            onViewTicket={handleViewTicket}
          />
        </div>
      </div>

      {/* Modal de Detalles */}
      <TicketDetailModal
        ticket={selectedTicket}
        open={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onUpdateTicket={handleUpdateTicket}
      />
    </div>
  );
};

export default Index;