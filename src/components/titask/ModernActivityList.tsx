import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TiTaskActivity } from '@/types/tiTask';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/useSettings';
import { isDateInPast, formatDateSafe } from '@/utils/dateUtils';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Activity as ActivityIcon,
  Save,
  X,
  Circle,
  Calendar,
  Trash2,
  Edit3
} from 'lucide-react';

interface ModernActivityListProps {
  activities: TiTaskActivity[];
  isLoading: boolean;
  isAdmin: boolean;
  onUpdateActivity: (activityId: string, updates: Partial<TiTaskActivity>) => Promise<any>;
  onDeleteActivity: (activityId: string) => Promise<void>;
  onToggleComplete: (activity: TiTaskActivity) => Promise<any>;
}

export function ModernActivityList({
  activities,
  isLoading,
  isAdmin,
  onUpdateActivity,
  onDeleteActivity,
  onToggleComplete
}: ModernActivityListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<string | null>(null);
  const [canEditCompletion, setCanEditCompletion] = useState(false);
  const { toast } = useToast();
  const { appSettings, loading: settingsLoading } = useSettings();

  // Check if admin can edit completion date/time
  useEffect(() => {
    if (!settingsLoading && isAdmin) {
      const setting = appSettings.find(s => s.key === 'admin_titask_edit_completion_datetime_enabled');
      if (setting) {
        const value = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
        setCanEditCompletion(value === true);
      }
    }
  }, [appSettings, settingsLoading, isAdmin]);

  const formatTime = (time: string) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (activity: TiTaskActivity) => {
    if (activity.completed) return false;
    return isDateInPast(activity.due_date);
  };

  const handleRowClick = (activity: TiTaskActivity, event: React.MouseEvent) => {
    console.log('Row click event:', { 
      target: event.target, 
      currentTarget: event.currentTarget,
      activityId: activity.id,
      isAdmin,
      editingId 
    });
    
    // Don't edit if clicking on interactive elements
    const target = event.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('input') || 
      target.closest('textarea') || 
      target.closest('[role="slider"]') ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'BUTTON'
    ) {
      console.log('Click on interactive element, ignoring');
      return;
    }
    
    if (!isAdmin || editingId === activity.id) {
      console.log('Cannot edit:', { isAdmin, editingId, activityId: activity.id });
      return;
    }

    console.log('Starting edit mode for activity:', activity.id);
    setEditingId(activity.id);
    setEditData({
      description: activity.description,
      due_date: activity.due_date,
      end_time: activity.end_time || '',
      progress: activity.progress,
      completion_date: activity.completion_date || '',
      completion_time: activity.completion_time || ''
    });
  };

  const handleEditButtonClick = (activity: TiTaskActivity, event: React.MouseEvent) => {
    event.stopPropagation();
    console.log('Edit button clicked for activity:', activity.id);
    
    if (editingId === activity.id) {
      return;
    }

    setEditingId(activity.id);
    setEditData({
      description: activity.description,
      due_date: activity.due_date,
      end_time: activity.end_time || '',
      progress: activity.progress,
      completion_date: activity.completion_date || '',
      completion_time: activity.completion_time || ''
    });
  };

  const handleSave = async (activityId: string) => {
    try {
      setIsUpdating(true);
      
      // Clean up editData - remove empty strings and convert to null/undefined
      const cleanedData: any = {};
      
      if (editData.description !== undefined) {
        cleanedData.description = editData.description;
      }
      
      if (editData.due_date !== undefined) {
        cleanedData.due_date = editData.due_date;
      }
      
      if (editData.progress !== undefined) {
        cleanedData.progress = editData.progress;
      }
      
      // Only include end_time if it has a value
      if (editData.end_time !== undefined && editData.end_time !== '') {
        cleanedData.end_time = editData.end_time;
      } else if (editData.end_time === '') {
        cleanedData.end_time = null;
      }
      
      // Only include completion_date if it has a value and user can edit completion
      if (canEditCompletion && editData.completion_date !== undefined && editData.completion_date !== '') {
        cleanedData.completion_date = editData.completion_date;
      } else if (canEditCompletion && editData.completion_date === '') {
        cleanedData.completion_date = null;
      }
      
      // Only include completion_time if it has a value and user can edit completion
      if (canEditCompletion && editData.completion_time !== undefined && editData.completion_time !== '') {
        cleanedData.completion_time = editData.completion_time;
      } else if (canEditCompletion && editData.completion_time === '') {
        cleanedData.completion_time = null;
      }
      
      await onUpdateActivity(activityId, cleanedData);
      setEditingId(null);
      toast({
        title: "✅ Actividad actualizada",
        description: "Los cambios han sido guardados correctamente",
      });
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo actualizar la actividad",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleToggle = async (activity: TiTaskActivity, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await onToggleComplete(activity);
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo cambiar el estado de la actividad",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (activityId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setActivityToDelete(activityId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!activityToDelete) return;
    
    try {
      await onDeleteActivity(activityToDelete);
      toast({
        title: "🗑️ Actividad eliminada",
        description: "La actividad ha sido eliminada correctamente",
      });
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo eliminar la actividad",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setActivityToDelete(null);
    }
  };

  const ActivityRow = ({ activity, isOverdueRow = false }: { activity: TiTaskActivity, isOverdueRow?: boolean }) => {
    const isEditing = editingId === activity.id;
    const overdueStatus = isOverdue(activity);

    return (
      <div 
        className={`
          group relative border rounded-lg p-4 transition-all duration-200
          ${isEditing ? 'ring-2 ring-primary shadow-md bg-background' : 'hover:shadow-sm hover:bg-muted/30'}
          ${overdueStatus && isOverdueRow ? 'border-red-200 bg-red-50/30' : 'border-border'}
          ${activity.completed ? 'bg-green-50/30 border-green-200' : ''}
        `}
      >
        {/* Edit Button (visible on hover or when editing) */}
        {isAdmin && !isEditing && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleEditButtonClick(activity, e)}
              className="h-8 w-8 p-0 bg-background/80 hover:bg-background shadow-sm border"
              title="Editar actividad"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div 
          className={`grid gap-4 items-center ${isEditing ? '' : 'cursor-pointer'}`}
          onClick={isEditing ? undefined : (e) => handleRowClick(activity, e)}
          style={{
            gridTemplateColumns: 'auto 1fr auto auto auto auto auto auto'
          }}
        >
          {/* Checkbox & Number */}
          <div className="flex items-center gap-2 min-w-[100px]">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleToggle(activity, e)}
              className="p-1 h-auto hover:bg-transparent"
            >
              {activity.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
            <Badge variant="outline" className="font-mono text-xs min-w-[2.5rem] justify-center">
              #{activity.activity_number}
            </Badge>
          </div>

          {/* Description */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="min-h-[60px] resize-none text-sm"
                placeholder="Descripción de la actividad..."
              />
            ) : (
              <div className="space-y-1">
                <div 
                  className={`description-content text-sm leading-relaxed max-w-none ${activity.completed ? 'line-through text-muted-foreground' : ''}`}
                  dangerouslySetInnerHTML={{ __html: activity.description }}
                  style={{
                    overflowWrap: 'break-word',
                    wordBreak: 'break-word'
                  }}
                />
                {overdueStatus && (
                  <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Vencida
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Creation Date */}
          <div className="min-w-[120px]">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDateSafe(activity.created_at.split('T')[0])}</span>
            </div>
          </div>

          {/* Due Date */}
          <div className="min-w-[120px]">
            {isEditing ? (
              <Input
                type="date"
                value={editData.due_date}
                onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                className="text-sm"
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDateSafe(activity.due_date)}</span>
              </div>
            )}
          </div>

          {/* Time */}
          <div className="min-w-[100px]">
            {isEditing ? (
              <Input
                type="time"
                value={editData.end_time}
                onChange={(e) => setEditData({ ...editData, end_time: e.target.value })}
                className="text-sm"
              />
            ) : (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {activity.end_time && (
                  <>
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">{formatTime(activity.end_time)}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Completion Date */}
          <div className="min-w-[120px]">
            {isEditing && canEditCompletion && activity.progress === 100 ? (
              <Input
                type="date"
                value={editData.completion_date}
                onChange={(e) => setEditData({ ...editData, completion_date: e.target.value })}
                className="text-sm"
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {activity.completion_date && <Calendar className="h-4 w-4" />}
                <span>{activity.completion_date ? formatDateSafe(activity.completion_date) : '-'}</span>
              </div>
            )}
          </div>

          {/* Completion Time */}
          <div className="min-w-[100px]">
            {isEditing && canEditCompletion && activity.progress === 100 ? (
              <Input
                type="time"
                value={editData.completion_time}
                onChange={(e) => setEditData({ ...editData, completion_time: e.target.value })}
                className="text-sm"
              />
            ) : (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {activity.completion_time && <Clock className="h-3 w-3" />}
                <span className="text-xs">{activity.completion_time || '-'}</span>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="min-w-[120px]">
            {isEditing ? (
              <div className="space-y-2">
                <Slider
                  value={[editData.progress]}
                  onValueChange={(value) => setEditData({ ...editData, progress: value[0] })}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="text-center text-xs font-medium">{editData.progress}%</div>
              </div>
            ) : (
              <div className="space-y-1">
                <Progress value={activity.progress} className="h-2" />
                <div className="text-center text-xs text-muted-foreground font-medium">{activity.progress}%</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="min-w-[80px] flex justify-end">
            {isEditing ? (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isUpdating}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSave(activity.id)}
                  disabled={isUpdating}
                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDeleteClick(activity.id, e)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5 animate-spin" />
            <span>Cargando actividades...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="text-muted-foreground">
            <ActivityIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <h3 className="font-medium mb-2">No hay actividades</h3>
            <p className="text-sm">
              {isAdmin 
                ? "Comienza agregando la primera actividad para esta tarea"
                : "Aún no se han creado actividades para esta tarea"
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Separate activities by status
  const completedActivities = activities.filter(a => a.completed);
  const pendingActivities = activities.filter(a => !a.completed);
  const overdueActivities = pendingActivities.filter(a => isOverdue(a));
  const upcomingActivities = pendingActivities.filter(a => !isOverdue(a));

  return (
    <>
      <div className="space-y-6">
        {/* Helper text for admins */}
        {isAdmin && activities.length > 0 && (
          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border">
            💡 <strong>Consejo:</strong> Haz clic en cualquier fila o usa el botón de editar que aparece al pasar el mouse para editar la actividad.
          </div>
        )}

        {/* Overdue Activities */}
        {overdueActivities.length > 0 && (
          <Card className="border-red-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Actividades Vencidas ({overdueActivities.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overdueActivities.map((activity) => (
                <ActivityRow
                  key={activity.id}
                  activity={activity}
                  isOverdueRow={true}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Pending Activities */}
        {upcomingActivities.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Actividades Pendientes ({upcomingActivities.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingActivities.map((activity) => (
                <ActivityRow
                  key={activity.id}
                  activity={activity}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Completed Activities */}
        {completedActivities.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Actividades Completadas ({completedActivities.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {completedActivities.map((activity) => (
                <ActivityRow
                  key={activity.id}
                  activity={activity}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Confirmar eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar esta actividad? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}