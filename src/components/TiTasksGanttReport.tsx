import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TiTaskWithActivities } from '@/types/tiTask';
import { format, parseISO, differenceInDays, startOfDay, addDays, min, max, subDays, isToday, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, CheckCircle, Circle, AlertTriangle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Eye } from 'lucide-react';
import { isDateInPast, getTodayDateString } from '@/utils/dateUtils';

interface TiTasksGanttReportProps {
  tiTasks: TiTaskWithActivities[];
  onViewTask?: (task: TiTaskWithActivities) => void;
}

export function TiTasksGanttReport({ tiTasks, onViewTask }: TiTasksGanttReportProps) {
  const [zoomLevel, setZoomLevel] = useState(1.5);
  const [viewStartDate, setViewStartDate] = useState<Date | null>(null);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);

  const chartData = useMemo(() => {
    if (!tiTasks.length) return null;

    // Calculate task timelines based on their activities
    const tasksWithDates = tiTasks.map(task => {
      // Handle created_at which is already a Date object
      const taskCreatedDate = task.created_at instanceof Date 
        ? task.created_at 
        : new Date(task.created_at);
      
      // If task has activities, use their dates
      if (task.activities && task.activities.length > 0) {
        // Filter out activities with invalid dates
        const validActivities = task.activities.filter(a => a.due_date);
        
        if (validActivities.length === 0) {
          // If no valid activities, show as 7-day task from creation
          const endDate = addDays(taskCreatedDate, 7);
          return {
            ...task,
            startDate: startOfDay(taskCreatedDate),
            endDate: startOfDay(endDate),
            duration: 7
          };
        }
        
        const activityDates = validActivities.map(a => parseISO(a.due_date));
        
        // Get earliest date from activities (start_date or created_at)
        const activityStartDates = validActivities.map(a => {
          if (a.start_date) {
            return parseISO(a.start_date);
          } else if (a.created_at) {
            return new Date(a.created_at);
          }
          return taskCreatedDate;
        });
        
        const earliestActivity = min([...activityStartDates, taskCreatedDate]);
        const latestActivity = max(activityDates);
        
        return {
          ...task,
          startDate: startOfDay(earliestActivity),
          endDate: startOfDay(latestActivity),
          duration: Math.max(1, differenceInDays(latestActivity, earliestActivity))
        };
      } else {
        // If no activities, show as 7-day task from creation
        const endDate = addDays(taskCreatedDate, 7);
        return {
          ...task,
          startDate: startOfDay(taskCreatedDate),
          endDate: startOfDay(endDate),
          duration: 7
        };
      }
    });

    // Find timeline bounds
    const allDates = tasksWithDates.flatMap(t => [t.startDate, t.endDate]);
    const minDate = startOfDay(min(allDates));
    const maxDate = startOfDay(max(allDates));
    
    // Calculate zoom-adjusted view
    const totalDaysBase = differenceInDays(maxDate, minDate);
    const paddingDays = Math.max(5, Math.floor(totalDaysBase * 0.1));
    const startDate = viewStartDate || addDays(minDate, -paddingDays);
    const endDate = addDays(startDate, Math.floor(totalDaysBase * 2 / zoomLevel) + paddingDays * 2);
    const totalDays = differenceInDays(endDate, startDate);

    // Calculate positions for each task
    const tasksWithPositions = tasksWithDates.map(task => {
      const startDayFromView = differenceInDays(task.startDate, startDate);
      const endDayFromView = differenceInDays(task.endDate, startDate);
      
      const startPosition = Math.max(0, (startDayFromView / totalDays) * 100);
      const endPosition = Math.min(100, (endDayFromView / totalDays) * 100);
      const width = Math.max(2, endPosition - startPosition);
      
      // Check if task has overdue activities
      const hasOverdueActivities = task.activities?.some(a => 
        !a.completed && isDateInPast(a.due_date)
      ) || false;
      
      return {
        ...task,
        startPosition,
        endPosition,
        width,
        isOverdue: hasOverdueActivities,
        isActive: isWithinInterval(parseISO(getTodayDateString()), { 
          start: task.startDate, 
          end: task.endDate 
        }),
        progressWidth: ((task.activities_progress_avg || 0) / 100) * width
      };
    });

    return {
      startDate,
      endDate,
      totalDays,
      tasks: tasksWithPositions,
      minDate,
      maxDate
    };
  }, [tiTasks, zoomLevel, viewStartDate]);

  const overallProgress = useMemo(() => {
    if (!tiTasks.length) return 0;
    const totalProgress = tiTasks.reduce((sum, task) => sum + (task.activities_progress_avg || 0), 0);
    return Math.round(totalProgress / tiTasks.length);
  }, [tiTasks]);

  const getTaskStatusConfig = (task: any) => {
    if (task.status === 'closed') {
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-500/80',
        status: 'Cerrada'
      };
    }
    if (task.isOverdue) {
      return {
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-500/80',
        status: 'Con actividades vencidas'
      };
    }
    if (task.status === 'in_progress') {
      return {
        icon: Circle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500/80',
        status: 'En progreso'
      };
    }
    return {
      icon: Circle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/80',
      status: 'Abierta'
    };
  };

  const getTimelineMarkers = () => {
    if (!chartData) return [];
    
    const markers = [];
    const { startDate, totalDays } = chartData;
    
    const interval = Math.max(1, Math.floor(7 / zoomLevel));
    
    for (let i = 0; i <= totalDays; i += interval) {
      const date = addDays(startDate, i);
      const position = (i / totalDays) * 100;
      
      if (position >= 0 && position <= 100) {
        markers.push({
          date,
          position,
          label: format(date, zoomLevel > 2 ? 'dd MMM' : 'dd/MM', { locale: es }),
          isToday: isToday(date)
        });
      }
    }
    
    return markers;
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(4, prev * 1.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.5, prev / 1.5));
  
  const handlePanLeft = () => {
    if (chartData) {
      const panDays = Math.floor(chartData.totalDays * 0.2);
      setViewStartDate(prev => addDays(prev || chartData.startDate, -panDays));
    }
  };
  
  const handlePanRight = () => {
    if (chartData) {
      const panDays = Math.floor(chartData.totalDays * 0.2);
      setViewStartDate(prev => addDays(prev || chartData.startDate, panDays));
    }
  };

  const resetView = () => {
    setZoomLevel(1.5);
    setViewStartDate(null);
  };

  if (!tiTasks.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No hay tareas TI para mostrar en el diagrama</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedTasks = tiTasks.filter(t => t.status === 'closed').length;
  const totalTasks = tiTasks.length;
  const overdueTasks = chartData?.tasks.filter(t => t.isOverdue).length || 0;

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Diagrama de Gantt - Tareas TI
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={resetView}>
              Reiniciar vista
            </Button>
            <div className="flex items-center space-x-1 border rounded-md">
              <Button variant="ghost" size="sm" onClick={handlePanLeft} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-8 w-8 p-0">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleZoomIn} className="h-8 w-8 p-0">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handlePanRight} className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-xs">
              {completedTasks}/{totalTasks} cerradas
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {overallProgress}% progreso promedio
            </Badge>
            {overdueTasks > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdueTasks} con actividades vencidas
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Zoom: {Math.round(zoomLevel * 100)}%
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progreso promedio de tareas</span>
            <span className="font-semibold">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>
      </CardHeader>

      {chartData && (
        <CardContent className="space-y-4 p-4">
          <div className="space-y-0 border rounded-lg overflow-hidden bg-card">
            <div className="px-4 py-3 bg-muted/30 border-b">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-foreground">{format(chartData.startDate, 'dd MMM yyyy', { locale: es })}</span>
                <span className="text-foreground">{format(chartData.endDate, 'dd MMM yyyy', { locale: es })}</span>
              </div>
            </div>
            
            <div className="flex">
              <div className="w-80 flex-shrink-0 bg-muted/10 border-r">
                <div className="h-12 flex items-center px-4 border-b bg-muted/20">
                  <span className="text-sm font-medium text-muted-foreground">Código / Tarea</span>
                </div>
              </div>
              
              <div className="flex-1 relative">
                <div className="h-12 border-b bg-background relative overflow-hidden">
                  {getTimelineMarkers().map((marker, index) => (
                    <div
                      key={index}
                      className={`absolute top-0 bottom-0 border-l ${
                        marker.isToday 
                          ? 'border-primary border-l-2 z-20 bg-primary/10' 
                          : 'border-border/30'
                      }`}
                      style={{ left: `${marker.position}%` }}
                    >
                      <div className={`absolute top-1 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap px-1 py-0.5 rounded ${
                        marker.isToday 
                          ? 'font-semibold text-primary bg-primary/20' 
                          : 'text-muted-foreground bg-background/80'
                      }`}>
                        {marker.isToday ? 'HOY' : marker.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-0 border rounded-lg overflow-hidden bg-card">
            <div className="flex bg-muted/10 border-b">
              <div className="w-80 flex-shrink-0 px-4 py-3 border-r bg-muted/20">
                <h3 className="font-medium text-sm text-foreground">Tareas TI</h3>
              </div>
              <div className="flex-1 px-4 py-3">
                <span className="text-sm text-muted-foreground">Cronograma de Tareas</span>
              </div>
            </div>
            
            <ScrollArea className="h-[600px]">
              <div className="space-y-0">
                {chartData.tasks
                  .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
                  .map((task, index) => {
                    const statusConfig = getTaskStatusConfig(task);
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <div
                        key={task.id}
                        className={`group transition-all duration-200 border-b border-border/50 hover:bg-muted/20 ${
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                        }`}
                        onMouseEnter={() => setHoveredTask(task.id)}
                        onMouseLeave={() => setHoveredTask(null)}
                      >
                        <div className="flex min-h-[70px]">
                          <div className="w-80 flex-shrink-0 p-4 border-r border-border/30">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs font-mono font-bold">
                                  {task.code}
                                </Badge>
                                <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                                {onViewTask && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 ml-auto"
                                    onClick={() => onViewTask(task)}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              
                              <p className="font-medium text-sm line-clamp-2" title={task.subject}>
                                {task.subject}
                              </p>
                              
                              <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                                <span className="flex items-center space-x-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{format(task.startDate, 'dd/MM', { locale: es })} - {format(task.endDate, 'dd/MM/yy', { locale: es })}</span>
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {task.activities?.length || 0} act.
                                </Badge>
                                <span className={`font-medium ${task.isActive ? 'text-primary' : ''}`}>
                                  {task.activities_progress_avg || 0}%
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 relative px-2 py-4">
                            <div className="relative h-12">
                              <div 
                                className="absolute inset-x-0 top-2 bottom-2 bg-muted/20 rounded-md border border-border/30"
                              />
                              
                              <div
                                className={`absolute top-2 bottom-2 rounded-md border-2 transition-all duration-200 cursor-pointer ${
                                  hoveredTask === task.id ? 'shadow-lg scale-105' : ''
                                }`}
                                style={{
                                  left: `${task.startPosition}%`,
                                  width: `${task.width}%`,
                                  backgroundColor: statusConfig.bgColor.replace('/80', '/60'),
                                  borderColor: statusConfig.bgColor.replace('bg-', '').replace('/80', '')
                                }}
                              >
                                {/* Progress overlay */}
                                <div
                                  className="absolute inset-0 rounded-md"
                                  style={{
                                    width: `${(task.activities_progress_avg || 0)}%`,
                                    backgroundColor: statusConfig.bgColor
                                  }}
                                />
                                
                                {/* Task label */}
                                <div className="absolute inset-0 flex items-center px-2">
                                  <span className="text-xs font-semibold text-white truncate">
                                    {task.code}
                                  </span>
                                </div>
                              </div>

                              {/* Today marker line */}
                              {getTimelineMarkers().find(m => m.isToday) && (
                                <div
                                  className="absolute top-0 bottom-0 border-l-2 border-primary z-10 pointer-events-none"
                                  style={{
                                    left: `${getTimelineMarkers().find(m => m.isToday)?.position}%`
                                  }}
                                />
                              )}
                            </div>

                            {/* Tooltip on hover */}
                            {hoveredTask === task.id && (
                              <div
                                className="absolute z-30 bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border w-64 pointer-events-none"
                                style={{
                                  left: `${Math.min(task.startPosition, 70)}%`,
                                  top: '100%',
                                  marginTop: '8px'
                                }}
                              >
                                <div className="space-y-2 text-xs">
                                  <div className="font-semibold">{task.code}</div>
                                  <div className="text-muted-foreground line-clamp-2">{task.subject}</div>
                                  <div className="flex items-center justify-between pt-2 border-t">
                                    <span>Estado:</span>
                                    <Badge variant="outline" className="text-xs">
                                      {statusConfig.status}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span>Progreso:</span>
                                    <span className="font-semibold">{task.activities_progress_avg || 0}%</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span>Actividades:</span>
                                    <span>{task.activities?.length || 0}</span>
                                  </div>
                                  <div className="pt-2 border-t">
                                    <div className="text-muted-foreground">
                                      {format(task.startDate, 'dd MMM yyyy', { locale: es })} - {format(task.endDate, 'dd MMM yyyy', { locale: es })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
