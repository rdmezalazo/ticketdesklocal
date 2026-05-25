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
  Trash2,
  Archive
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TiTaskWithActivities } from '@/types/tiTask';
import { useState, useMemo } from 'react';
import { stripHtmlAndImages } from '@/utils/htmlUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/hooks/useSettings';
import { translateStatus, translatePriority } from '@/utils/translationUtils';

interface TiTaskTableViewProps {
  tiTasks: TiTaskWithActivities[];
  onViewTask: (task: TiTaskWithActivities) => void;
  onDeleteTask?: (task: TiTaskWithActivities) => void;
  onTaskUpdated?: () => void;
}

type SortField = 'subject' | 'created_by' | 'status' | 'priority' | 'created_at';
type SortDirection = 'asc' | 'desc';

export function TiTaskTableView({ tiTasks, onViewTask, onDeleteTask, onTaskUpdated }: TiTaskTableViewProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [archivingTask, setArchivingTask] = useState<string | null>(null);
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

  const getStatusBadge = (task: TiTaskWithActivities) => {
    const effectiveStatus = task.conformidad_status ? 'closed' : task.status;
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

  const sortedTasks = [...tiTasks].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];
    
    if (sortField === 'created_at') {
      aValue = a.created_at.getTime();
      bValue = b.created_at.getTime();
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

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <SortableHeader field="subject">Asunto</SortableHeader>
              <SortableHeader field="created_by">Creado por</SortableHeader>
              <SortableHeader field="status">Estado</SortableHeader>
              <SortableHeader field="priority">Prioridad</SortableHeader>
              <TableHead>Progreso</TableHead>
              <SortableHeader field="created_at">Creado</SortableHeader>
              <TableHead className="w-24">Acciones</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map((task) => (
              <TableRow 
                key={task.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onViewTask(task)}
              >
                <TableCell className="font-mono text-xs">
                  {task.code}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{task.subject}</div>
                    <div className="text-sm text-muted-foreground truncate max-w-xs">
                      {stripHtmlAndImages(task.description)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {task.created_by_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{task.created_by_name || 'Usuario'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(task)}
                </TableCell>
                <TableCell>
                  {getPriorityBadge(task.priority)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${task.activities_progress_avg || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground min-w-[3rem]">
                      {task.activities_progress_avg || 0}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {task.created_at.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {task.status === 'resolved' && (
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4 text-muted-foreground" />
                      <Switch
                        checked={false}
                        disabled={archivingTask === task.id}
                        onCheckedChange={(checked) => handleArchiveTask(task.id, checked)}
                      />
                    </div>
                  )}
                  {task.status === 'closed' && (
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4 text-primary" />
                      <Switch
                        checked={true}
                        disabled={archivingTask === task.id}
                        onCheckedChange={(checked) => handleArchiveTask(task.id, checked)}
                      />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewTask(task)}>
                        Ver detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Editar tarea
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTask?.(task);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar tarea
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}