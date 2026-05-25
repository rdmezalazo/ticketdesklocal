import { Card } from "@/components/ui/card";
import { TicketStats as Stats } from "@/types/ticket";
import { Ticket, CheckCircle, Clock, XCircle, BarChart } from "lucide-react";

interface TicketStatsProps {
  stats: Stats;
  onStatClick?: (filter: string) => void;
}

export const TicketStats = ({ stats, onStatClick }: TicketStatsProps) => {
  const cards = [
    {
      title: "Total de Tickets",
      value: stats.total,
      icon: BarChart,
      className: "bg-gradient-primary text-primary-foreground",
      filter: "all"
    },
    {
      title: "Ingresados",
      value: stats.open,
      icon: Ticket,
      className: "bg-card text-card-foreground shadow-medium border border-border",
      filter: "open"
    },
    {
      title: "En Progreso", 
      value: stats.inProgress,
      icon: Clock,
      className: "bg-warning text-warning-foreground",
      filter: "in_progress"
    },
    {
      title: "Resueltos",
      value: stats.resolved,
      icon: CheckCircle,
      className: "bg-success text-success-foreground",
      filter: "resolved"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <Card 
          key={index} 
          className={`p-6 ${card.className} transition-all duration-300 hover:scale-105 hover:shadow-large ${onStatClick ? 'cursor-pointer' : ''}`}
          onClick={() => onStatClick?.(card.filter)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-2">{card.title}</p>
              <p className="text-3xl font-bold">{card.value}</p>
            </div>
            <card.icon className="h-8 w-8 opacity-80" />
          </div>
        </Card>
      ))}
    </div>
  );
};