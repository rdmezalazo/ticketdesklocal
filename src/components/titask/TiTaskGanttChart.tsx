import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TiTaskActivity } from '@/types/tiTask';
import { format, parseISO, differenceInDays, startOfDay, addDays, min, max, subDays, isToday, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, CheckCircle, Circle, AlertTriangle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, X, Edit } from 'lucide-react';
import { isDateInPast, getTodayDateString } from '@/utils/dateUtils';
import { useTiTaskActivities } from '@/hooks/useTiTaskActivities';
import { ActivityFormModal } from './ActivityFormModal';

interface TiTaskGanttChartProps {
  taskId: string;
  taskTitle?: string;
  onActivityUpdate?: (activityId: string, updates: Partial<TiTaskActivity>) => void;
}

export function TiTaskGanttChart({ 
  taskId,
  taskTitle,
  onActivityUpdate 
}: TiTaskGanttChartProps) {
  const { activities } = useTiTaskActivities(taskId);
  const [zoomLevel, setZoomLevel] = useState(2.25); // 225% zoom para mejor visibilidad de "Hoy"
  const [viewStartDate, setViewStartDate] = useState<Date | null>(null);
  const [hoveredActivity, setHoveredActivity] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [showActivityForm, setShowActivityForm] = useState(false);

  const chartData = useMemo(() => {
    if (!activities.length) return null;

    // Parse dates and calculate timeline
    const activitiesWithDates = activities.map(activity => {
      const dueDate = parseISO(activity.due_date);
      // Estimate start date as 7 days before due date or use creation date
      const estimatedStartDate = activity.created_at ? parseISO(activity.created_at) : subDays(dueDate, 7);
      
      return {
        ...activity,
        startDate: estimatedStartDate,
        dueDate,
        completedDate: activity.completed_at ? parseISO(activity.completed_at) : null,
        duration: Math.max(1, differenceInDays(dueDate, estimatedStartDate))
      };
    });

    // Find timeline bounds
    const allDates = activitiesWithDates.flatMap(a => [a.startDate, a.dueDate]);
    const minDate = startOfDay(min(allDates));
    const maxDate = startOfDay(max(allDates));
    
    // Calculate zoom-adjusted view
    const totalDaysBase = differenceInDays(maxDate, minDate);
    const paddingDays = Math.max(3, Math.floor(totalDaysBase * 0.1));
    const startDate = viewStartDate || addDays(minDate, -paddingDays);
    const endDate = addDays(startDate, Math.floor(totalDaysBase * 2 / zoomLevel) + paddingDays * 2);
    const totalDays = differenceInDays(endDate, startDate);

    // Calculate positions for each activity
    const activitiesWithPositions = activitiesWithDates.map(activity => {
      const startDayFromView = differenceInDays(activity.startDate, startDate);
      const endDayFromView = differenceInDays(activity.dueDate, startDate);
      
      const startPosition = Math.max(0, (startDayFromView / totalDays) * 100);
      const endPosition = Math.min(100, (endDayFromView / totalDays) * 100);
      const width = Math.max(2, endPosition - startPosition);
      
      return {
        ...activity,
        startPosition,
        endPosition,
        width,
        isOverdue: !activity.completed && isDateInPast(activity.due_date),
        daysUntilDue: differenceInDays(parseISO(activity.due_date), parseISO(getTodayDateString())),
        isActive: isWithinInterval(parseISO(getTodayDateString()), { start: activity.startDate, end: activity.dueDate }),
        progressWidth: (activity.progress / 100) * width
      };
    });

    return {
      startDate,
      endDate,
      totalDays,
      activities: activitiesWithPositions,
      minDate,
      maxDate
    };
  }, [activities, zoomLevel, viewStartDate]);

  const overallProgress = useMemo(() => {
    if (!activities.length) return 0;
    const totalProgress = activities.reduce((sum, activity) => sum + activity.progress, 0);
    return Math.round(totalProgress / activities.length);
  }, [activities]);

  const getActivityStatusConfig = (activity: any) => {
    if (activity.completed) {
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-300',
        status: 'Completada'
      };
    }
    if (activity.isOverdue) {
      return {
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-300',
        status: 'Vencida'
      };
    }
    if (activity.progress > 0) {
      return {
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-300',
        status: 'En progreso'
      };
    }
    return {
      icon: Circle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
      status: 'Pendiente'
    };
  };

  const getTimelineMarkers = () => {
    if (!chartData) return [];
    
    const markers = [];
    const { startDate, totalDays } = chartData;
    
    // Dynamic interval based on zoom level
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
    setZoomLevel(2.25); // Reset to optimal zoom for viewing "Hoy" line
    setViewStartDate(null);
  };

  const handleFullscreen = () => {
    setIsFullscreen(true);
  };

  const handleDoubleClick = (activityId: string) => {
    setEditingActivity(activityId);
    setShowActivityForm(true);
  };

  const handleActivityFormClose = () => {
    setShowActivityForm(false);
    setEditingActivity(null);
  };

  if (!activities.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No hay actividades para mostrar en el diagrama</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedActivities = activities.filter(a => a.completed).length;
  const totalActivities = activities.length;
  const overdueActivities = chartData?.activities.filter(a => a.isOverdue).length || 0;
  const inProgressActivities = activities.filter(a => !a.completed && a.progress > 0 && !isDateInPast(a.due_date)).length;

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {taskTitle ? `Cronograma - ${taskTitle}` : 'Diagrama de Gantt'}
          </CardTitle>
          
          {/* Gantt Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 border rounded-md">
              <Button variant="ghost" size="sm" onClick={handlePanLeft} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-8 w-8 p-0">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleFullscreen} className="h-8 w-8 p-0" title="Vista expandida">
                <Maximize2 className="h-4 w-4" />
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

        {/* Summary Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-xs">
              {completedActivities}/{totalActivities} completadas
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {overallProgress}% progreso
            </Badge>
            {overdueActivities > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdueActivities} vencidas
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Zoom: {Math.round(zoomLevel * 100)}%
          </div>
        </div>
        
        {/* Overall Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progreso general del proyecto</span>
            <span className="font-semibold">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>
      </CardHeader>

      {chartData && (
        <CardContent className="space-y-4 p-4">
          {/* Timeline Header */}
          <div className="space-y-0 border rounded-lg overflow-hidden bg-card">
            {/* Date Range Header */}
            <div className="px-4 py-3 bg-muted/30 border-b">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-foreground">{format(chartData.startDate, 'dd MMM yyyy', { locale: es })}</span>
                <span className="text-foreground">{format(chartData.endDate, 'dd MMM yyyy', { locale: es })}</span>
              </div>
            </div>
            
            {/* Timeline Grid Container */}
            <div className="flex">
              {/* Activity Labels Column */}
              <div className="w-80 flex-shrink-0 bg-muted/10 border-r">
                <div className="h-12 flex items-center px-4 border-b bg-muted/20">
                  <span className="text-sm font-medium text-muted-foreground">Actividades</span>
                </div>
              </div>
              
              {/* Timeline Grid */}
              <div className="flex-1 relative">
                <div className="h-12 border-b bg-background relative overflow-hidden">
                  {/* Grid lines and labels */}
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
                  
                  {/* Weekend highlighting */}
                  {Array.from({ length: Math.ceil(chartData.totalDays / 7) }, (_, i) => {
                    const weekendStart = i * 7 + 5; // Saturday
                    const weekendPosition = (weekendStart / chartData.totalDays) * 100;
                    const weekendWidth = (2 / chartData.totalDays) * 100;
                    
                    if (weekendPosition >= 0 && weekendPosition <= 100) {
                      return (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 bg-muted/20 pointer-events-none"
                          style={{ 
                            left: `${weekendPosition}%`, 
                            width: `${Math.min(weekendWidth, 100 - weekendPosition)}%` 
                          }}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Activities Section */}
          <div className="space-y-0 border rounded-lg overflow-hidden bg-card">
            <div className="flex bg-muted/10 border-b">
              <div className="w-80 flex-shrink-0 px-4 py-3 border-r bg-muted/20">
                <h3 className="font-medium text-sm text-foreground">Actividades del Proyecto</h3>
              </div>
              <div className="flex-1 px-4 py-3">
                <span className="text-sm text-muted-foreground">Cronograma de Ejecución</span>
              </div>
            </div>
            
            <ScrollArea className="h-[400px]">
              <div className="space-y-0">
                {chartData.activities
                  .sort((a, b) => a.activity_number - b.activity_number)
                  .map((activity, index) => {
                    const statusConfig = getActivityStatusConfig(activity);
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <div
                        key={activity.id}
                        className={`group transition-all duration-200 border-b border-border/50 hover:bg-muted/20 ${
                          selectedActivity === activity.id ? 'bg-muted/30' : ''
                        } ${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                        onClick={() => setSelectedActivity(selectedActivity === activity.id ? null : activity.id)}
                      >
                        {/* Activity Row */}
                        <div className="flex min-h-[60px]">
                          {/* Activity Info Column */}
                          <div className="w-80 flex-shrink-0 p-4 border-r border-border/30">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs font-mono">
                                  #{activity.activity_number}
                                </Badge>
                                <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                                <span className="font-medium text-sm truncate max-w-[180px]" title={activity.description}>
                                  {activity.description}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                                <span className="flex items-center space-x-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{format(activity.startDate, 'dd/MM', { locale: es })} - {format(activity.dueDate, 'dd/MM/yy', { locale: es })}</span>
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {activity.duration}d
                                </Badge>
                                <span className={`font-medium ${activity.isActive ? 'text-primary' : ''}`}>
                                  {activity.progress}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Gantt Bar Column */}
                          <div className="flex-1 relative px-2 py-4">
                            {/* Expanded hover area for better tooltip visibility */}
                            <div className="relative h-12 mb-2">
                              <div 
                                className="absolute inset-x-0 top-2 bottom-2 bg-muted/20 rounded-md border border-border/30 cursor-pointer hover:bg-muted/30 transition-colors"
                                onMouseEnter={() => setHoveredActivity(activity.id)}
                                onMouseLeave={() => setHoveredActivity(null)}
                                onDoubleClick={() => handleDoubleClick(activity.id)}
                                title="Doble click para editar"
                              >
                              {/* Grid lines background */}
                              {getTimelineMarkers().map((marker, markerIndex) => (
                                <div
                                  key={markerIndex}
                                  className={`absolute top-0 bottom-0 border-l ${
                                    marker.isToday 
                                      ? 'border-primary/50 border-l-2' 
                                      : 'border-border/20'
                                  }`}
                                  style={{ left: `${marker.position}%` }}
                                />
                              ))}
                              
                              {/* Weekend highlighting */}
                              {Array.from({ length: Math.ceil(chartData.totalDays / 7) }, (_, i) => {
                                const weekendStart = i * 7 + 5;
                                const weekendPosition = (weekendStart / chartData.totalDays) * 100;
                                const weekendWidth = (2 / chartData.totalDays) * 100;
                                
                                if (weekendPosition >= 0 && weekendPosition <= 100) {
                                  return (
                                    <div
                                      key={i}
                                      className="absolute top-0 bottom-0 bg-muted/20 pointer-events-none"
                                      style={{ 
                                        left: `${weekendPosition}%`, 
                                        width: `${Math.min(weekendWidth, 100 - weekendPosition)}%` 
                                      }}
                                    />
                                  );
                                }
                                return null;
                              })}

                                {/* Activity Progress Bar */}
                                <div
                                  className={`absolute top-1 bottom-1 rounded-sm shadow-sm transition-all duration-300 ${
                                    activity.completed 
                                      ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-green-500/30' 
                                      : activity.isOverdue 
                                        ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/30' 
                                        : activity.isActive
                                          ? 'bg-gradient-to-r from-primary to-primary/80 shadow-primary/30'
                                          : activity.progress > 0 
                                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-yellow-500/30' 
                                            : 'bg-gradient-to-r from-gray-400 to-gray-500 shadow-gray-400/30'
                                  } ${hoveredActivity === activity.id ? 'scale-y-110 shadow-lg z-10' : ''}`}
                                  style={{
                                    left: `${activity.startPosition}%`,
                                    width: `${activity.width}%`,
                                    minWidth: '8px'
                                  }}
                                >
                                {/* Progress Fill */}
                                {activity.progress > 0 && !activity.completed && (
                                  <div
                                    className="absolute top-0 bottom-0 bg-gradient-to-r from-white/30 to-white/10 rounded-sm"
                                    style={{ width: `${activity.progress}%` }}
                                  />
                                )}
                                
                                {/* Activity Label */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-white text-xs font-medium drop-shadow-sm">
                                    {activity.progress}%
                                  </span>
                                </div>
                              </div>
                              
                                {/* Enhanced Hover Tooltip */}
                                {hoveredActivity === activity.id && (
                                  <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-background border border-border rounded-lg px-3 py-2 shadow-xl z-50 min-w-[280px] max-w-[360px]">
                                    <div className="space-y-1">
                                      <div className="font-semibold text-foreground text-sm truncate" title={activity.description}>
                                        #{activity.activity_number} - {activity.description}
                                      </div>
                                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{format(activity.startDate, 'dd MMM', { locale: es })} → {format(activity.dueDate, 'dd MMM yyyy', { locale: es })}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {activity.duration}d
                                        </Badge>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-xs text-muted-foreground">Progreso:</span>
                                          <span className="text-xs font-semibold text-foreground">{activity.progress}%</span>
                                        </div>
                                        <Badge variant={
                                          activity.completed ? "default" : 
                                          activity.isOverdue ? "destructive" : 
                                          activity.isActive ? "secondary" : "outline"
                                        } className="text-xs">
                                          {statusConfig.status}
                                        </Badge>
                                      </div>
                                      {activity.end_time && (
                                        <div className="text-xs text-muted-foreground">
                                          Hora límite: {activity.end_time}
                                        </div>
                                      )}
                                    </div>
                                    {/* Tooltip arrow */}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border"></div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded Details */}
                        {selectedActivity === activity.id && (
                          <div className="px-4 pb-4 bg-muted/10 border-t border-border/30">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-4">
                              <div>
                                <span className="text-muted-foreground">Estado:</span>
                                <div className="font-medium text-foreground">{statusConfig.status}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Progreso:</span>
                                <div className="font-medium text-foreground">{activity.progress}%</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Duración:</span>
                                <div className="font-medium text-foreground">{activity.duration} días</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Vencimiento:</span>
                                <div className={`font-medium ${
                                  activity.isOverdue ? 'text-red-600' : 
                                  activity.daysUntilDue <= 3 ? 'text-yellow-600' : 'text-green-600'
                                }`}>
                                  {activity.daysUntilDue >= 0 
                                    ? `${activity.daysUntilDue}d restantes` 
                                    : `${Math.abs(activity.daysUntilDue)}d vencida`}
                                </div>
                              </div>
                            </div>
                            
                            {activity.end_time && (
                              <div className="text-sm mt-4 pt-4 border-t border-border/30">
                                <span className="text-muted-foreground">Hora límite:</span>
                                <span className="ml-2 font-medium text-foreground">{activity.end_time}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </div>

          <Separator />
          
          {/* Enhanced Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{totalActivities}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{completedActivities}</div>
              <div className="text-sm text-muted-foreground">Completadas</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{inProgressActivities}</div>
              <div className="text-sm text-muted-foreground">En progreso</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{overdueActivities}</div>
              <div className="text-sm text-muted-foreground">Vencidas</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {chartData ? Math.ceil(chartData.totalDays / 7) : 0}
              </div>
              <div className="text-sm text-muted-foreground">Semanas</div>
            </Card>
          </div>
        </CardContent>
      )}
      
      {/* Activity Form Modal for Editing */}
      {editingActivity && (
        <ActivityFormModal
          isOpen={showActivityForm}
          onClose={handleActivityFormClose}
          taskId={taskId}
          activityId={editingActivity}
          onActivityAdded={() => {
            handleActivityFormClose();
            // Refresh activities list would happen automatically via hook
          }}
        />
      )}

      {/* Fullscreen Modal */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">
                {taskTitle ? `Cronograma - ${taskTitle}` : 'Diagrama de Gantt'}
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <div className="h-[80vh] p-6">
              {/* Gantt Controls */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <Badge variant="outline" className="text-xs">
                    {completedActivities}/{totalActivities} completadas
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {overallProgress}% progreso
                  </Badge>
                  {overdueActivities > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {overdueActivities} vencidas
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 border rounded-md">
                    <Button variant="ghost" size="sm" onClick={handlePanLeft} className="h-8 w-8 p-0">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-8 w-8 p-0">
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={resetView} className="h-8 w-8 p-0">
                      <Calendar className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleZoomIn} className="h-8 w-8 p-0">
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handlePanRight} className="h-8 w-8 p-0">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Zoom: {Math.round(zoomLevel * 100)}%
                  </div>
                </div>
              </div>

              {chartData && (
                <div className="space-y-4 h-full">
                  {/* Timeline Header */}
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
                          <span className="text-sm font-medium text-muted-foreground">Actividades</span>
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

                  {/* Activities Section - Full Height */}
                  <div className="flex-1 border rounded-lg overflow-hidden bg-card">
                    <div className="flex bg-muted/10 border-b">
                      <div className="w-80 flex-shrink-0 px-4 py-3 border-r bg-muted/20">
                        <h3 className="font-medium text-sm text-foreground">Actividades del Proyecto</h3>
                      </div>
                      <div className="flex-1 px-4 py-3">
                        <span className="text-sm text-muted-foreground">Cronograma de Ejecución</span>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[calc(80vh-200px)]">
                      <div className="space-y-0">
                        {chartData.activities
                          .sort((a, b) => a.activity_number - b.activity_number)
                          .map((activity, index) => {
                            const statusConfig = getActivityStatusConfig(activity);
                            const StatusIcon = statusConfig.icon;
                            
                            return (
                              <div
                                key={activity.id}
                                className={`group transition-all duration-200 border-b border-border/50 hover:bg-muted/20 ${
                                  selectedActivity === activity.id ? 'bg-muted/30' : ''
                                } ${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                              >
                                <div className="flex min-h-[60px]">
                                  <div className="w-80 flex-shrink-0 p-4 border-r border-border/30">
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <Badge variant="outline" className="text-xs font-mono">
                                          #{activity.activity_number}
                                        </Badge>
                                        <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                                        <span className="font-medium text-sm truncate max-w-[180px]" title={activity.description}>
                                          {activity.description}
                                        </span>
                                      </div>
                                      
                                      <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                                        <span className="flex items-center space-x-1">
                                          <Calendar className="h-3 w-3" />
                                          <span>{format(activity.startDate, 'dd/MM', { locale: es })} - {format(activity.dueDate, 'dd/MM/yy', { locale: es })}</span>
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                          {activity.duration}d
                                        </Badge>
                                        <span className={`font-medium ${activity.isActive ? 'text-primary' : ''}`}>
                                          {activity.progress}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex-1 relative px-2 py-4">
                                    <div className="relative h-12 mb-2">
                                      <div 
                                        className="absolute inset-x-0 top-2 bottom-2 bg-muted/20 rounded-md border border-border/30 cursor-pointer hover:bg-muted/30 transition-colors"
                                        onMouseEnter={() => setHoveredActivity(activity.id)}
                                        onMouseLeave={() => setHoveredActivity(null)}
                                        onDoubleClick={() => handleDoubleClick(activity.id)}
                                        title="Doble click para editar"
                                      >
                                        {getTimelineMarkers().map((marker, markerIndex) => (
                                          <div
                                            key={markerIndex}
                                            className={`absolute top-0 bottom-0 border-l ${
                                              marker.isToday 
                                                ? 'border-primary/50 border-l-2' 
                                                : 'border-border/20'
                                            }`}
                                            style={{ left: `${marker.position}%` }}
                                          />
                                        ))}

                                        <div
                                          className={`absolute top-1 bottom-1 rounded-sm shadow-sm transition-all duration-300 ${
                                            activity.completed 
                                              ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-green-500/30' 
                                              : activity.isOverdue 
                                                ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/30' 
                                                : activity.isActive
                                                  ? 'bg-gradient-to-r from-primary to-primary/80 shadow-primary/30'
                                                  : activity.progress > 0 
                                                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-yellow-500/30' 
                                                    : 'bg-gradient-to-r from-gray-400 to-gray-500 shadow-gray-400/30'
                                          } ${hoveredActivity === activity.id ? 'scale-y-110 shadow-lg z-10' : ''}`}
                                          style={{
                                            left: `${activity.startPosition}%`,
                                            width: `${activity.width}%`,
                                            minWidth: '8px'
                                          }}
                                        >
                                          {activity.progress > 0 && !activity.completed && (
                                            <div
                                              className="absolute top-0 bottom-0 bg-gradient-to-r from-white/30 to-white/10 rounded-sm"
                                              style={{ width: `${activity.progress}%` }}
                                            />
                                          )}
                                          
                                          <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-white text-xs font-medium drop-shadow-sm">
                                              {activity.progress}%
                                            </span>
                                          </div>
                                        </div>
                                        
                                        {hoveredActivity === activity.id && (
                                          <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-background border border-border rounded-lg px-3 py-2 shadow-xl z-50 min-w-[280px] max-w-[360px]">
                                            <div className="space-y-1">
                                              <div className="font-semibold text-foreground text-sm truncate" title={activity.description}>
                                                #{activity.activity_number} - {activity.description}
                                              </div>
                                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>{format(activity.startDate, 'dd MMM', { locale: es })} → {format(activity.dueDate, 'dd MMM yyyy', { locale: es })}</span>
                                                <Badge variant="outline" className="text-xs">
                                                  {activity.duration}d
                                                </Badge>
                                              </div>
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                  <span className="text-xs text-muted-foreground">Progreso:</span>
                                                  <span className="text-xs font-semibold text-foreground">{activity.progress}%</span>
                                                </div>
                                                <Badge variant={
                                                  activity.completed ? "default" : 
                                                  activity.isOverdue ? "destructive" : 
                                                  activity.isActive ? "secondary" : "outline"
                                                } className="text-xs">
                                                  {statusConfig.status}
                                                </Badge>
                                              </div>
                                              {activity.end_time && (
                                                <div className="text-xs text-muted-foreground">
                                                  Hora límite: {activity.end_time}
                                                </div>
                                              )}
                                            </div>
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border"></div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}