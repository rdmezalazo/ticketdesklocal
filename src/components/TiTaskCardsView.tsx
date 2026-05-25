import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Clock, Calendar } from 'lucide-react';
import { TiTaskWithActivities } from '@/types/tiTask';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSettings } from '@/hooks/useSettings';
import { translateStatus, translatePriority } from '@/utils/translationUtils';

interface TiTaskCardsViewProps {
  tiTasks: TiTaskWithActivities[];
  onViewTask: (task: TiTaskWithActivities) => void;
}

export function TiTaskCardsView({ tiTasks, onViewTask }: TiTaskCardsViewProps) {
  const { tiTaskStatuses, tiTaskPriorities } = useSettings();

  const statusMap = useMemo(() => {
    const map = new Map();
    tiTaskStatuses.forEach(status => {
      map.set(status.slug, status);
    });
    return map;
  }, [tiTaskStatuses]);

  const priorityMap = useMemo(() => {
    const map = new Map();
    tiTaskPriorities.forEach(priority => {
      map.set(priority.level, priority);
    });
    return map;
  }, [tiTaskPriorities]);

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
    if (progress === 100) return { status: 'Completado', variant: 'default' as const };
    if (progress > 0) return { status: 'En progreso', variant: 'secondary' as const };
    return { status: 'Pendiente', variant: 'outline' as const };
  };

  const getStatusBadge = (task: TiTaskWithActivities) => {
    const effectiveStatus = task.conformidad_status ? 'closed' : task.status;
    const statusConfig = statusMap.get(effectiveStatus);
    
    if (statusConfig) {
      return (
        <Badge 
          variant="outline"
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
    
    return <Badge variant="outline">{translatePriority(priority)}</Badge>;
  };

  const formatRelativeTime = (date: Date): string => {
    return formatDistanceToNow(date, { 
      addSuffix: true, 
      locale: es 
    }).replace('aproximadamente ', '');
  };

  if (tiTasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron tareas de TI
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tiTasks.map((task) => {
        const progress = task.activities_progress_avg || 0;
        const activityStatus = getActivityStatus(progress);

        return (
          <Card key={task.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      TI
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{task.subject}</h3>
                    <p className="text-xs text-muted-foreground">{task.code}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewTask(task)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalles
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center justify-between mt-2">
                {getStatusBadge(task)}
                {getPriorityBadge(task.priority)}
              </div>

              <div className="flex items-center text-xs text-muted-foreground mt-2">
                <Calendar className="h-3 w-3 mr-1" />
                {formatRelativeTime(task.created_at)}
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {task.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {task.description}
                </p>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Progreso de actividades</span>
                  <Badge variant={activityStatus.variant} className="text-xs">
                    {activityStatus.status}
                  </Badge>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{progress}% completado</span>
                  <span>{task.activities?.length || 0} actividades</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onViewTask(task)}
                >
                  Ver detalles
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}