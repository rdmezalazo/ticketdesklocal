import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ActivityFormModal } from './ActivityFormModal';
import { useTiTaskActivities } from '@/hooks/useTiTaskActivities';
import { isDateInPast, formatDateSafe, normalizeDateString, getTodayDateString, formatTimeTo12Hour } from '@/utils/dateUtils';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Calendar,
  Edit,
  Trash2
} from 'lucide-react';

interface ActivityManagerProps {
  taskId: string;
  isAdmin: boolean;
}

const getActivityStatus = (progress: number) => {
  if (progress === 0) return { status: "Pendiente", variant: "secondary" as const };
  if (progress >= 1 && progress < 50) return { status: "En Progreso", variant: "outline" as const };
  if (progress >= 50 && progress < 85) return { status: "Por Terminar", variant: "default" as const };
  return { status: "Terminado", variant: "default" as const };
};

export function ActivityManager({ taskId, isAdmin }: ActivityManagerProps) {
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [editProgress, setEditProgress] = useState<{ [key: string]: number }>({});
  const [editingFullActivity, setEditingFullActivity] = useState<string | null>(null);
  const [editActivityData, setEditActivityData] = useState<{[key: string]: any}>({});
  
  const {
    activities,
    isLoading,
    updateActivity,
    deleteActivity,
    toggleComplete,
    loadActivities
  } = useTiTaskActivities(taskId);

  const handleActivityAdded = async () => {
    await loadActivities(taskId);
  };

  const handleProgressUpdate = async (activityId: string, progress: number) => {
    await updateActivity(activityId, { progress });
    setEditingActivity(null);
    setEditProgress(prev => ({ ...prev, [activityId]: progress }));
  };

  const handleDeleteActivity = async (activityId: string) => {
    await deleteActivity(activityId, taskId);
  };

  const handleFullActivityEdit = async (activityId: string) => {
    const data = editActivityData[activityId];
    if (!data) return;

    await updateActivity(activityId, data);
    setEditingFullActivity(null);
    setEditActivityData(prev => ({ ...prev, [activityId]: {} }));
  };

  const updateEditData = (activityId: string, field: string, value: any) => {
    setEditActivityData(prev => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        [field]: value
      }
    }));
  };

  const completedCount = activities.filter(a => a.completed).length;
  const totalCount = activities.length;
  const averageProgress = totalCount > 0 
    ? Math.round(activities.reduce((sum, a) => sum + a.progress, 0) / totalCount)
    : 0;
  
  const overdueActivities = activities.filter(a => {
    if (a.completed) return false;
    return isDateInPast(a.due_date);
  }).length;

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header with stats */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Gestión de Actividades
            </h3>
            {isAdmin && (
              <Button
                onClick={() => setShowFormModal(true)}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nueva Actividad
              </Button>
            )}
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-100">
                    <Activity className="h-3 w-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{totalCount}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-green-100">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{completedCount}</p>
                    <p className="text-xs text-muted-foreground">Completadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-orange-100">
                    <Clock className="h-3 w-3 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{totalCount - completedCount}</p>
                    <p className="text-xs text-muted-foreground">Pendientes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-red-100">
                    <AlertTriangle className="h-3 w-3 text-red-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{overdueActivities}</p>
                    <p className="text-xs text-muted-foreground">Vencidas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Overview */}
          {totalCount > 0 && (
            <Card className="mt-3">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progreso General</span>
                  <span className="text-sm text-muted-foreground">{averageProgress}%</span>
                </div>
                <Progress value={averageProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{completedCount} de {totalCount} completadas</span>
                  <span>Promedio: {averageProgress}%</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Activities List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              {isLoading ? (
                <div className="text-center py-8">Cargando actividades...</div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay actividades asignadas a esta tarea
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Completado</TableHead>
                        <TableHead className="w-20">Nro</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="w-32">Fecha Creación</TableHead>
                        <TableHead className="w-32">Fecha Planificada</TableHead>
                        <TableHead className="w-32">Hora Planificada</TableHead>
                        <TableHead className="w-32">Fecha de Cumplimiento</TableHead>
                        <TableHead className="w-32">Hora de Cumplimiento</TableHead>
                        <TableHead className="w-28">Progreso</TableHead>
                        <TableHead className="w-24">Estado</TableHead>
                        {isAdmin && <TableHead className="w-20">Acciones</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell>
                            <Checkbox
                              checked={activity.completed}
                              onCheckedChange={() => isAdmin && toggleComplete(activity)}
                              disabled={!isAdmin}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {activity.activity_number.toString().padStart(3, '0')}
                          </TableCell>
                          <TableCell>
                            {isAdmin && editingFullActivity === activity.id ? (
                              <Textarea
                                value={editActivityData[activity.id]?.description ?? activity.description}
                                onChange={(e) => updateEditData(activity.id, 'description', e.target.value)}
                                className="min-h-[60px]"
                              />
                            ) : (
                              <div 
                                className={cn(
                                  isAdmin && "cursor-pointer hover:bg-muted rounded px-2 py-1"
                                )}
                                onClick={() => {
                                  if (isAdmin && editingFullActivity !== activity.id) {
                                    setEditingFullActivity(activity.id);
                                    setEditActivityData(prev => ({
                                      ...prev,
                                      [activity.id]: {
                                        description: activity.description,
                                        due_date: activity.due_date,
                                        end_time: activity.end_time || '',
                                        progress: activity.progress
                                      }
                                    }));
                                  }
                                }}
                              >
                                {activity.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(activity.created_at), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            {isAdmin && editingFullActivity === activity.id ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                   <Button variant="outline" className="w-full justify-start text-left font-normal">
                                     <Calendar className="mr-2 h-4 w-4" />
                                     {editActivityData[activity.id]?.due_date 
                                       ? formatDateSafe(editActivityData[activity.id].due_date!)
                                       : formatDateSafe(activity.due_date)
                                     }
                                   </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                   <CalendarComponent
                                     mode="single"
                                     selected={editActivityData[activity.id]?.due_date 
                                       ? (() => {
                                           const [year, month, day] = editActivityData[activity.id].due_date!.split('-');
                                           return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                         })()
                                       : (() => {
                                           const [year, month, day] = activity.due_date.split('-');
                                           return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                         })()
                                     }
                                     onSelect={(date) => {
                                       if (date) {
                                         const year = date.getFullYear();
                                         const month = String(date.getMonth() + 1).padStart(2, '0');
                                         const day = String(date.getDate()).padStart(2, '0');
                                         const formattedDate = `${year}-${month}-${day}`;
                                         updateEditData(activity.id, 'due_date', formattedDate);
                                       }
                                     }}
                                     initialFocus
                                     className={cn("p-3 pointer-events-auto")}
                                   />
                                </PopoverContent>
                              </Popover>
                            ) : (
                              formatDateSafe(activity.due_date)
                            )}
                          </TableCell>
                          <TableCell>
                            {isAdmin && editingFullActivity === activity.id ? (
                              (() => {
                                const selectedDate = editActivityData[activity.id]?.due_date || activity.due_date;
                                const today = getTodayDateString();
                                const isCurrentOrFuture = selectedDate >= today;
                                
                                return isCurrentOrFuture ? (
                                  <Input
                                    type="time"
                                    value={editActivityData[activity.id]?.end_time ?? activity.end_time ?? ""}
                                    onChange={(e) => updateEditData(activity.id, 'end_time', e.target.value)}
                                    className="w-20"
                                  />
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                );
                              })()
                            ) : (
                              activity.end_time ? (
                                <span className="text-sm">{formatTimeTo12Hour(activity.end_time)}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {activity.completion_date ? formatDateSafe(activity.completion_date) : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatTimeTo12Hour(activity.completion_time)}
                          </TableCell>
                          <TableCell>
                            {isAdmin && editingFullActivity === activity.id ? (
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={editActivityData[activity.id]?.progress ?? activity.progress}
                                onChange={(e) => updateEditData(activity.id, 'progress', Number(e.target.value))}
                                className="w-16"
                              />
                            ) : isAdmin && editingActivity === activity.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editProgress[activity.id] ?? activity.progress}
                                  onChange={(e) => setEditProgress(prev => ({ 
                                    ...prev, 
                                    [activity.id]: Number(e.target.value) 
                                  }))}
                                  className="w-16 h-7"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleProgressUpdate(activity.id, editProgress[activity.id] ?? activity.progress)}
                                  className="h-7 px-1"
                                >
                                  ✓
                                </Button>
                              </div>
                            ) : (
                              <div 
                                className={cn(
                                  "flex items-center gap-1",
                                  isAdmin && editingFullActivity !== activity.id && "cursor-pointer hover:bg-muted rounded px-1"
                                )}
                                onClick={() => isAdmin && editingFullActivity !== activity.id && setEditingActivity(activity.id)}
                              >
                                <span className="text-sm">{activity.progress}%</span>
                                {isAdmin && editingFullActivity !== activity.id && <Edit className="w-3 h-3 opacity-50" />}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getActivityStatus(activity.progress).variant}>
                              {getActivityStatus(activity.progress).status}
                            </Badge>
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex gap-1">
                                {editingFullActivity === activity.id ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleFullActivityEdit(activity.id)}
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      ✓
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingFullActivity(null);
                                        setEditActivityData(prev => ({ ...prev, [activity.id]: {} }));
                                      }}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      ✕
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingFullActivity(activity.id);
                                        setEditActivityData(prev => ({
                                          ...prev,
                                          [activity.id]: {
                                            description: activity.description,
                                            due_date: activity.due_date,
                                            end_time: activity.end_time || '',
                                            progress: activity.progress
                                          }
                                        }));
                                      }}
                                      className="text-blue-600 hover:text-blue-700"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteActivity(activity.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Activity Form Modal */}
      <ActivityFormModal
        taskId={taskId}
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onActivityAdded={handleActivityAdded}
      />
    </>
  );
}