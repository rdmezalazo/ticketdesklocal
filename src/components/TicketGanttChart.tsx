import { useMemo, useState } from "react";
import { format, differenceInDays, min, max } from "date-fns";
import { formatDateSafe } from "@/utils/dateUtils";
import { TicketActivity } from "@/hooks/useTicketActivities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart, ChevronUp, ChevronDown } from "lucide-react";

interface TicketGanttChartProps {
  activities: TicketActivity[];
}

const getActivityStatus = (progress: number) => {
  if (progress === 0) return { status: "Pendiente", variant: "secondary" as const, color: "bg-gray-500" };
  if (progress >= 1 && progress < 50) return { status: "En Progreso", variant: "outline" as const, color: "bg-blue-500" };
  if (progress >= 50 && progress < 85) return { status: "Por Terminar", variant: "default" as const, color: "bg-yellow-500" };
  return { status: "Terminado", variant: "default" as const, color: "bg-green-500" };
};

export const TicketGanttChart = ({ activities }: TicketGanttChartProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const chartData = useMemo(() => {
    if (activities.length === 0) return null;

    const dates = activities.map(activity => new Date(activity.due_date));
    const startDate = min(dates.map(date => new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000))); // 1 week before earliest
    const endDate = max(dates.map(date => new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000))); // 1 week after latest
    const totalDays = differenceInDays(endDate, startDate);

    return {
      startDate,
      endDate,
      totalDays,
      activities: activities.map(activity => {
        const activityDate = new Date(activity.due_date);
        const daysFromStart = differenceInDays(activityDate, startDate);
        const position = (daysFromStart / totalDays) * 100;
        
        return {
          ...activity,
          position,
          activityDate
        };
      })
    };
  }, [activities]);

  const totalProgress = useMemo(() => {
    if (activities.length === 0) return 0;
    const sum = activities.reduce((acc, activity) => acc + activity.progress, 0);
    return Math.round(sum / activities.length);
  }, [activities]);

  const totalStatus = getActivityStatus(totalProgress);

  if (!chartData && activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            Cronograma de Actividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No hay actividades para mostrar
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            Cronograma de Actividades
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {isExpanded ? "Ocultar" : "Mostrar"}
          </Button>
        </div>
        
        {!isExpanded && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Progreso Total: {totalProgress}%</span>
              <Badge variant={totalStatus.variant}>
                {totalStatus.status}
              </Badge>
            </div>
            <div className="space-y-2">
              <Progress value={totalProgress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Total de actividades: {activities.length}</span>
                <span>Completadas: {activities.filter(a => a.completed).length}</span>
              </div>
            </div>
          </div>
        )}

        {isExpanded && chartData && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatDateSafe(format(chartData.startDate, "yyyy-MM-dd"))}</span>
            <span>{formatDateSafe(format(chartData.endDate, "yyyy-MM-dd"))}</span>
          </div>
        )}

        {/* Show general progress when no activities but collapsed */}
        {!isExpanded && activities.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Progreso Total: 0%</span>
              <Badge variant="secondary">
                Pendiente
              </Badge>
            </div>
            <div className="space-y-2">
              <Progress value={0} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>No hay actividades asignadas aún</span>
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      
      {isExpanded && chartData && (
        <CardContent>
          <div className="space-y-4">
            {chartData.activities.map((activity) => {
              const activityStatus = getActivityStatus(activity.progress);
              return (
                <div key={activity.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm min-w-[3rem]">
                      {activity.activity_number.toString().padStart(3, '0')}
                    </span>
                    <span className="flex-1 text-sm truncate">{activity.description}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={activityStatus.variant}>
                        {activityStatus.status}
                      </Badge>
                      <span className="text-sm font-medium">{activity.progress}%</span>
                    </div>
                  </div>
                  
                  <div className="relative h-4 bg-muted rounded-md overflow-hidden">
                    {/* Timeline bar */}
                    <div 
                      className="absolute top-0 h-full bg-primary/20 rounded-md"
                      style={{ 
                        left: '0%', 
                        width: '100%' 
                      }}
                    />
                    
                    {/* Activity marker */}
                    <div 
                      className="absolute top-0.5 h-3 w-1 bg-primary rounded-sm"
                      style={{ left: `${activity.position}%` }}
                    />
                    
                    {/* Progress bar */}
                    <div 
                      className={`absolute top-0 h-full rounded-md transition-all duration-300 ${activityStatus.color}`}
                      style={{ 
                        left: '0%', 
                        width: `${Math.min(activity.progress, 100)}%` 
                      }}
                    />
                    
                    {/* Due date label */}
                    <div 
                      className="absolute -bottom-4 text-xs text-muted-foreground transform -translate-x-1/2"
                      style={{ left: `${activity.position}%` }}
                    >
                      {formatDateSafe(activity.due_date).substring(0, 5)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total de actividades: {activities.length}</span>
              <span>
                Completadas: {activities.filter(a => a.completed).length} 
                ({Math.round((activities.filter(a => a.completed).length / activities.length) * 100)}%)
              </span>
            </div>
          </div>
        </CardContent>
      )}

      {/* Show expanded view for no activities case */}
      {isExpanded && activities.length === 0 && (
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <h4 className="font-medium mb-2">Progreso de Actividades</h4>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex-1 max-w-xs">
                <Progress value={0} className="h-2" />
              </div>
              <span className="text-sm font-medium min-w-[35px]">0%</span>
            </div>
            <p className="text-sm text-muted-foreground">
              No hay actividades asignadas aún
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};