import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Archive,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TiTaskWithActivities, TiTaskStatus } from '@/types/tiTask';
import { useMemo, useState } from 'react';
import { stripHtmlAndImages } from '@/utils/htmlUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/hooks/useSettings';
import { translatePriority } from '@/utils/translationUtils';

interface TiTaskKanbanViewProps {
  tiTasks: TiTaskWithActivities[];
  onViewTask: (task: TiTaskWithActivities) => void;
  onTaskUpdated?: () => void;
}

export function TiTaskKanbanView({ tiTasks, onViewTask, onTaskUpdated }: TiTaskKanbanViewProps) {
  const [closedExpanded, setClosedExpanded] = useState(false);
  const [archivingTask, setArchivingTask] = useState<string | null>(null);
  const { tiTaskPriorities } = useSettings();

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

  const columns = useMemo(() => [
    {
      id: 'open',
      title: 'Ingresada',
      status: 'open' as TiTaskStatus,
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-800',
      headerColor: 'text-red-700 dark:text-red-300'
    },
    {
      id: 'in_progress',
      title: 'En Proceso',
      status: 'in_progress' as TiTaskStatus,
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      headerColor: 'text-blue-700 dark:text-blue-300'
    },
    {
      id: 'resolved',
      title: 'Resuelta',
      status: 'resolved' as TiTaskStatus,
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      borderColor: 'border-green-200 dark:border-green-800',
      headerColor: 'text-green-700 dark:text-green-300'
    },
    {
      id: 'closed',
      title: 'Cerrada',
      status: 'closed' as TiTaskStatus,
      bgColor: 'bg-gray-50 dark:bg-gray-950/20',
      borderColor: 'border-gray-200 dark:border-gray-800',
      headerColor: 'text-gray-700 dark:text-gray-300'
    }
  ], []);

  const tasksByStatus = useMemo(() => {
    return columns.reduce((acc, column) => {
      acc[column.status] = tiTasks.filter(task => {
        const effectiveStatus = task.conformidad_status ? 'closed' : task.status;
        return effectiveStatus === column.status;
      });
      return acc;
    }, {} as Record<TiTaskStatus, TiTaskWithActivities[]>);
  }, [tiTasks, columns]);

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

  const handleArchiveTask = async (taskId: string, shouldArchive: boolean) => {
    setArchivingTask(taskId);
    try {
      const newStatus = shouldArchive ? 'closed' : 'resolved';
      
      const { error } = await supabase
        .from('ti_tasks')
        .update({ 
          status: newStatus,
          conformidad_status: shouldArchive,
          conformidad_date: shouldArchive ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;

      // Send notification email when task is resolved
      if (newStatus === 'resolved') {
        try {
          // Get task details for notification
          const { data: taskData } = await supabase
            .from('ti_tasks')
            .select('code, subject, assignee, priority, category')
            .eq('id', taskId)
            .single();

          if (taskData) {
            await supabase.functions.invoke('send-ti-task-notification', {
              body: {
                type: 'ti_task_resolved',
                tiTaskId: taskId,
                taskCode: taskData.code,
                subject: taskData.subject,
                assignee: taskData.assignee,
                priority: taskData.priority,
                category: taskData.category
              }
            });
          }
        } catch (notificationError) {
          console.error('Error sending task resolved notification:', notificationError);
          // Don't fail the status update if notification fails
        }
      }

      toast.success(shouldArchive ? 'Tarea cerrada exitosamente' : 'Tarea reabierta');
      onTaskUpdated?.();
    } catch (error) {
      console.error('Error al archivar tarea:', error);
      toast.error('Error al actualizar la tarea');
    } finally {
      setArchivingTask(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full">
      {columns.map((column) => {
        const columnTasks = tasksByStatus[column.status] || [];
        
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
                      {columnTasks.length}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
            
            <div className="flex-1 space-y-3 mt-2 min-h-0">
              {column.id === 'closed' ? (
                <div className="space-y-3">
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-all bg-muted/30 border-2 border-dashed"
                    onClick={() => setClosedExpanded(!closedExpanded)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Archive className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium text-sm">Tareas Archivadas</span>
                          <Badge variant="secondary" className="text-xs">
                            {columnTasks.length}
                          </Badge>
                        </div>
                        {closedExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {closedExpanded && (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                      {columnTasks.map((task) => (
                        <Card 
                          key={task.id} 
                          className="cursor-pointer hover:shadow-medium transition-all hover:scale-[1.02] opacity-75"
                          onClick={() => onViewTask(task)}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  {getPriorityBadge(task.priority)}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onViewTask(task)}>
                                      Ver detalles
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      handleArchiveTask(task.id, false);
                                    }}>
                                      Reabrir tarea
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              
                              <div className="flex-1">
                                <h3 className="font-semibold text-sm text-foreground mb-1 line-clamp-2">
                                  {task.subject}
                                </h3>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {stripHtmlAndImages(task.description)}
                                </p>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                      {task.created_by?.split(' ').map(n => n[0]).join('') || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground truncate max-w-20">
                                    {task.created_by || 'Usuario'}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {formatRelativeTime(task.created_at)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-full overflow-y-auto">
                  {columnTasks.map((task) => (
                  <Card 
                    key={task.id} 
                    className="cursor-pointer hover:shadow-medium transition-all hover:scale-[1.02]"
                    onClick={() => onViewTask(task)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getPriorityBadge(task.priority)}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onViewTask(task)}>
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                Editar tarea
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                Asignar usuario
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm text-foreground mb-1 line-clamp-2">
                            {task.subject}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {stripHtmlAndImages(task.description)}
                          </p>
                        </div>
                         
                         {/* Activities Progress */}
                         <div className="mb-3 p-2 bg-muted/20 rounded-md">
                           <div className="flex items-center justify-between mb-1">
                             <span className="text-xs font-medium text-muted-foreground">Progreso</span>
                             <span className="text-xs font-medium">{task.activities_progress_avg || 0}%</span>
                           </div>
                           <div className="h-1.5 bg-background rounded-full overflow-hidden">
                             <div 
                               className="h-full bg-primary rounded-full transition-all duration-300"
                               style={{ width: `${task.activities_progress_avg || 0}%` }}
                             />
                           </div>
                         </div>
                         
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {task.created_by?.split(' ').map(n => n[0]).join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate max-w-20">
                              {task.created_by || 'Usuario'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatRelativeTime(task.created_at)}
                          </div>
                        </div>
                        
                         <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 flex-1">
                            <MessageCircle className="h-3 w-3" />
                            Responder
                          </Button>
                        </div>

                        {/* Archive Toggle for Resolved Tasks */}
                        {column.id === 'resolved' && (
                          <div 
                            className="flex items-center justify-between p-2 bg-muted/30 rounded-md border"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Label htmlFor={`archive-${task.id}`} className="text-xs flex items-center gap-2 cursor-pointer">
                              <Archive className="h-3 w-3" />
                              Cerrar tarea
                            </Label>
                            <Switch
                              id={`archive-${task.id}`}
                              checked={false}
                              disabled={archivingTask === task.id}
                              onCheckedChange={(checked) => handleArchiveTask(task.id, checked)}
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}