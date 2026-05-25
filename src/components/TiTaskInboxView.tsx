import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar,
  MessageCircle,
  MoreHorizontal,
  Archive,
  Trash2,
  Clock,
  User,
  AlertCircle
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
import { useSettings } from '@/hooks/useSettings';
import { translateStatus, translatePriority } from '@/utils/translationUtils';

interface TiTaskInboxViewProps {
  tiTasks: TiTaskWithActivities[];
  onViewTask: (task: TiTaskWithActivities) => void;
}

export function TiTaskInboxView({ tiTasks, onViewTask }: TiTaskInboxViewProps) {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [previewTask, setPreviewTask] = useState<TiTaskWithActivities | null>(tiTasks[0] || null);
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
          className="text-xs"
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
    
    return <Badge variant="outline" className="text-xs">{translateStatus(effectiveStatus)}</Badge>;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-500';
      case 'high':
        return 'border-l-orange-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-300';
    }
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

  const formatFullTime = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTasks([...selectedTasks, taskId]);
    } else {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(tiTasks.map(t => t.id));
    } else {
      setSelectedTasks([]);
    }
  };

  const handleTaskClick = (task: TiTaskWithActivities) => {
    setPreviewTask(task);
  };

  const getPriorityBadgeForPreview = (priority: string) => {
    const level = getPriorityLevel(priority);
    const priorityConfig = priorityMap.get(level);
    
    if (priorityConfig) {
      return (
        <Badge 
          className="gap-1"
          style={{ 
            backgroundColor: priorityConfig.color,
            color: '#ffffff',
            borderColor: priorityConfig.color
          }}
        >
          <AlertCircle className="h-3 w-3" />
          {priorityConfig.name}
        </Badge>
      );
    }
    
    return <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" />{translatePriority(priority)}</Badge>;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100vh-300px)]">
      {/* Left Panel - Task List */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardContent className="p-0 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b bg-muted/50">
              <Checkbox
                checked={selectedTasks.length === tiTasks.length && tiTasks.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedTasks.length > 0 ? `${selectedTasks.length} seleccionados` : 'Seleccionar todo'}
              </span>
              {selectedTasks.length > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Archive className="h-4 w-4" />
                    Archivar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              )}
            </div>

            {/* Task List */}
            <div className="divide-y flex-1 overflow-y-auto">
              {tiTasks.map((task) => (
                <div 
                  key={task.id} 
                  className={`flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer border-l-4 ${getPriorityColor(task.priority)} ${
                    previewTask?.id === task.id ? 'bg-muted/30' : ''
                  }`}
                  onClick={() => handleTaskClick(task)}
                >
                  <Checkbox
                    checked={selectedTasks.includes(task.id)}
                    onCheckedChange={(checked) => handleSelectTask(task.id, !!checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {task.created_by?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{task.created_by || 'Usuario'}</span>
                      {getStatusBadge(task)}
                    </div>
                    <h3 className="font-semibold text-foreground mb-1 truncate">
                      {task.subject}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {stripHtmlAndImages(task.description)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatRelativeTime(task.created_at)}
                  </div>
                  
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
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Responder
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Archive className="h-4 w-4 mr-2" />
                        Archivar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Preview */}
      <div className="lg:col-span-3">
        <Card className="h-full">
          {previewTask ? (
            <CardContent className="p-0 h-full flex flex-col">
              {/* Header */}
              <div className="p-6 border-b">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getPriorityBadgeForPreview(previewTask.priority)}
                      {getStatusBadge(previewTask)}
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      {previewTask.subject}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Tarea {previewTask.code}
                    </p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewTask(previewTask)}>
                        Ver detalles completos
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

                {/* User & Date Info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {previewTask.created_by?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{previewTask.created_by || 'Usuario'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{formatFullTime(previewTask.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-400px)]">
                <div className="p-6 space-y-6">
                  {/* Description */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Descripción</h4>
                    <div className="prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: previewTask.description || '' }} />
                    </div>
                  </div>
                  
                  {/* Progress */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Progreso de Actividades</h4>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${previewTask.activities_progress_avg || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {previewTask.activities_progress_avg || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          ) : (
            <CardContent className="p-8 h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Selecciona una tarea</h3>
                <p>Selecciona una tarea de la lista para ver la vista previa</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}