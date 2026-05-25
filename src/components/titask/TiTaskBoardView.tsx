import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TiTaskWithActivities } from '@/types/tiTask';
import { MoreVertical, Eye, Calendar, Clock, Users, BarChart3, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface TiTaskBoardViewProps {
  tiTasks: TiTaskWithActivities[];
  onViewTask: (task: TiTaskWithActivities) => void;
}

interface Column {
  id: string;
  title: string;
  status: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

export function TiTaskBoardView({ tiTasks, onViewTask }: TiTaskBoardViewProps) {
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);

  const columns: Column[] = [
    {
      id: 'backlog',
      title: 'Backlog',
      status: 'open',
      color: 'text-slate-600',
      bgColor: 'bg-slate-50 border-slate-200',
      icon: <Circle className="h-4 w-4" />
    },
    {
      id: 'in-progress',
      title: 'En Progreso',
      status: 'in_progress',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      icon: <Clock className="h-4 w-4" />
    },
    {
      id: 'review',
      title: 'En Revisión',
      status: 'resolved',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 border-orange-200',
      icon: <AlertTriangle className="h-4 w-4" />
    },
    {
      id: 'done',
      title: 'Completado',
      status: 'closed',
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      icon: <CheckCircle className="h-4 w-4" />
    }
  ];

  const tasksByColumn = useMemo(() => {
    const grouped = columns.reduce((acc, column) => {
      acc[column.id] = tiTasks.filter(task => {
        const effectiveStatus = task.conformidad_status ? 'closed' : task.status;
        return effectiveStatus === column.status;
      });
      return acc;
    }, {} as Record<string, TiTaskWithActivities[]>);
    
    return grouped;
  }, [tiTasks]);

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'critical':
        return { color: 'bg-red-500 text-white', label: 'Crítica' };
      case 'high':
        return { color: 'bg-orange-500 text-white', label: 'Alta' };
      case 'medium':
        return { color: 'bg-blue-500 text-white', label: 'Media' };
      case 'low':
        return { color: 'bg-green-500 text-white', label: 'Baja' };
      default:
        return { color: 'bg-gray-500 text-white', label: 'Media' };
    }
  };

  const getProgressConfig = (progress: number) => {
    if (progress === 100) return { color: 'text-green-600', bg: 'bg-green-100', status: 'Completado' };
    if (progress >= 75) return { color: 'text-blue-600', bg: 'bg-blue-100', status: 'Casi listo' };
    if (progress >= 50) return { color: 'text-yellow-600', bg: 'bg-yellow-100', status: 'En progreso' };
    if (progress > 0) return { color: 'text-orange-600', bg: 'bg-orange-100', status: 'Iniciado' };
    return { color: 'text-gray-600', bg: 'bg-gray-100', status: 'Sin iniciar' };
  };

  const TaskCard = ({ task }: { task: TiTaskWithActivities }) => {
    const progress = task.activities_progress_avg || 0;
    const priorityConfig = getPriorityConfig(task.priority);
    const progressConfig = getProgressConfig(progress);
    const totalActivities = task.activities?.length || 0;
    const completedActivities = task.activities?.filter(a => a.completed).length || 0;

    return (
      <Card 
        className={`group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-l-4 ${
          hoveredTask === task.id ? 'shadow-lg scale-[1.02]' : ''
        }`}
        style={{ 
          borderLeftColor: task.priority === 'critical' ? '#ef4444' : 
                           task.priority === 'high' ? '#f97316' : 
                           task.priority === 'medium' ? '#3b82f6' : '#10b981' 
        }}
        onMouseEnter={() => setHoveredTask(task.id)}
        onMouseLeave={() => setHoveredTask(null)}
        onClick={() => onViewTask(task)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Badge variant="outline" className="text-xs font-mono shrink-0">
                {task.code}
              </Badge>
              <Badge className={`text-xs ${priorityConfig.color} shrink-0`}>
                {priorityConfig.label}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-3 w-3" />
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
          
          <CardTitle className="text-sm font-medium line-clamp-2 leading-tight">
            {task.subject}
          </CardTitle>
          
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <BarChart3 className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Progreso</span>
              </div>
              <Badge variant="outline" className={`text-xs ${progressConfig.bg} ${progressConfig.color}`}>
                {progressConfig.status}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress}%</span>
              <span>{completedActivities}/{totalActivities} actividades</span>
            </div>
          </div>

          {/* Activities Preview */}
          {totalActivities > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Actividades</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {task.activities?.slice(0, 3).map((activity, index) => (
                  <Badge 
                    key={activity.id} 
                    variant={activity.completed ? "default" : "outline"}
                    className="text-xs"
                  >
                    #{activity.activity_number}
                  </Badge>
                ))}
                {totalActivities > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{totalActivities - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {task.created_by?.split(' ').map(n => n[0]).join('') || 'TI'}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(task.created_at, { 
                    addSuffix: true, 
                    locale: es 
                  }).replace('aproximadamente ', '')}
                </span>
              </div>
            </div>
            
            {task.assignee && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span className="truncate max-w-20">
                  {task.assignee.split(',')[0]}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
        {columns.map((column) => {
          const columnTasks = tasksByColumn[column.id] || [];
          
          return (
            <div key={column.id} className="flex flex-col">
              {/* Column Header */}
              <Card className={`mb-4 ${column.bgColor} border-2`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={column.color}>
                        {column.icon}
                      </div>
                      <CardTitle className={`text-sm font-semibold ${column.color}`}>
                        {column.title}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {columnTasks.length}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>

              {/* Column Tasks */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {columnTasks.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <div className="text-center space-y-2">
                      <div className={column.color}>
                        {column.icon}
                      </div>
                      <p className="text-xs">Sin tareas</p>
                    </div>
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Circle icon component
function Circle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"></circle>
    </svg>
  );
}