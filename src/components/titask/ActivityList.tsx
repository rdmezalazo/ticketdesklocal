import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { ActivityCard } from './ActivityCard';
import { TiTaskActivity } from '@/types/tiTask';
import { useToast } from '@/hooks/use-toast';
import { isDateInPast, getTodayDateString, formatDateSafe } from '@/utils/dateUtils';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Activity as ActivityIcon,
  Edit3,
  Save,
  X,
  Trash2,
  Circle,
  Calendar
} from 'lucide-react';

interface ActivityListProps {
  activities: TiTaskActivity[];
  isLoading: boolean;
  isAdmin: boolean;
  onUpdateActivity: (activityId: string, updates: Partial<TiTaskActivity>) => Promise<any>;
  onDeleteActivity: (activityId: string) => Promise<void>;
  onToggleComplete: (activity: TiTaskActivity) => Promise<any>;
}

export function ActivityList({
  activities,
  isLoading,
  isAdmin,
  onUpdateActivity,
  onDeleteActivity,
  onToggleComplete
}: ActivityListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Remove local formatDate function - using formatDateSafe from dateUtils instead

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

  const handleEdit = (activity: TiTaskActivity) => {
    setEditingId(activity.id);
    setEditData({
      description: activity.description,
      due_date: activity.due_date,
      end_time: activity.end_time || '',
      progress: activity.progress
    });
  };

  const handleSave = async (activityId: string) => {
    try {
      setIsUpdating(true);
      await onUpdateActivity(activityId, editData);
      setEditingId(null);
      toast({
        title: "Actividad actualizada",
        description: "Los cambios han sido guardados correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
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

  const handleToggle = async (activity: TiTaskActivity) => {
    try {
      await onToggleComplete(activity);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado de la actividad",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (activityId: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta actividad?')) {
      try {
        await onDeleteActivity(activityId);
        toast({
          title: "Actividad eliminada",
          description: "La actividad ha sido eliminada correctamente",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo eliminar la actividad",
          variant: "destructive",
        });
      }
    }
  };

  // Activity Table Row Component
  const ActivityTableRow = ({ activity, isOverdueRow = false }: { activity: TiTaskActivity, isOverdueRow?: boolean }) => {
    const isEditing = editingId === activity.id;
    const overdueStatus = isOverdue(activity);

    return (
      <TableRow className={`${overdueStatus && isOverdueRow ? 'bg-red-50/50' : ''}`}>
        {/* Checkbox & Number */}
        <TableCell className="w-20">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggle(activity)}
              className="p-1 h-auto"
            >
              {activity.completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Badge variant="outline" className="font-mono text-xs">
              #{activity.activity_number}
            </Badge>
          </div>
        </TableCell>

        {/* Description */}
        <TableCell className="min-w-[300px]">
          {isEditing ? (
            <Textarea
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="min-h-[60px] resize-none"
            />
          ) : (
            <div className="space-y-1">
              <p className={`text-sm ${activity.completed ? 'line-through text-muted-foreground' : ''}`}>
                {activity.description}
              </p>
              {overdueStatus && (
                <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Vencida
                </Badge>
              )}
            </div>
          )}
        </TableCell>

        {/* Creation Date */}
        <TableCell className="w-32">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDateSafe(activity.created_at.split('T')[0])}
          </div>
        </TableCell>

        {/* Due Date */}
        <TableCell className="w-32">
          {isEditing ? (
            <Input
              type="date"
              value={editData.due_date}
              onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
              className="text-xs"
            />
          ) : (
            <div className="flex items-center gap-1 text-sm">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              {formatDateSafe(activity.due_date)}
            </div>
          )}
        </TableCell>

        {/* Time */}
        <TableCell className="w-32">
          {isEditing ? (
            <Input
              type="time"
              value={editData.end_time}
              onChange={(e) => setEditData({ ...editData, end_time: e.target.value })}
              className="text-xs"
            />
          ) : (
            <span className="text-sm text-muted-foreground">
              {formatTime(activity.end_time)}
            </span>
          )}
        </TableCell>

        {/* Completion Date */}
        <TableCell className="w-32">
          <span className="text-sm text-muted-foreground">
            {activity.completion_date ? formatDateSafe(activity.completion_date) : '-'}
          </span>
        </TableCell>

        {/* Completion Time */}
        <TableCell className="w-32">
          <span className="text-sm text-muted-foreground">
            {activity.completion_time || '-'}
          </span>
        </TableCell>

        {/* Progress */}
        <TableCell className="w-32">
          {isEditing ? (
            <div className="space-y-2">
              <Slider
                value={[editData.progress]}
                onValueChange={(value) => setEditData({ ...editData, progress: value[0] })}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="text-center text-xs">{editData.progress}%</div>
            </div>
          ) : (
            <div className="space-y-1">
              <Progress value={activity.progress} className="h-2" />
              <div className="text-center text-xs text-muted-foreground">{activity.progress}%</div>
            </div>
          )}
        </TableCell>

        {/* Actions */}
        {isAdmin && (
          <TableCell className="w-24">
            <div className="flex gap-1">
              {!isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(activity)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(activity.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isUpdating}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSave(activity.id)}
                    disabled={isUpdating}
                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </TableCell>
        )}
      </TableRow>
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
  
  // Further separate pending activities by overdue status
  const overdueActivities = pendingActivities.filter(a => isOverdue(a));
  
  const upcomingActivities = pendingActivities.filter(a => !isOverdue(a));

  return (
    <div className="space-y-6">
      {/* Overdue Activities */}
      {overdueActivities.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Actividades Vencidas ({overdueActivities.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                   <TableHead className="w-20">#</TableHead>
                   <TableHead className="min-w-[250px]">Descripción</TableHead>
                   <TableHead className="w-32">Fecha Creación</TableHead>
                   <TableHead className="w-32">Fecha Planificada</TableHead>
                   <TableHead className="w-32">Hora Planificada</TableHead>
                   <TableHead className="w-32">Fecha de Cumplimiento</TableHead>
                   <TableHead className="w-32">Hora de Cumplimiento</TableHead>
                   <TableHead className="w-32">Progreso</TableHead>
                  {isAdmin && <TableHead className="w-24">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueActivities.map((activity) => (
                  <ActivityTableRow
                    key={activity.id}
                    activity={activity}
                    isOverdueRow={true}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pending Activities */}
      {upcomingActivities.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Actividades Pendientes ({upcomingActivities.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                   <TableHead className="w-20">#</TableHead>
                   <TableHead className="min-w-[250px]">Descripción</TableHead>
                   <TableHead className="w-32">Fecha Creación</TableHead>
                   <TableHead className="w-32">Fecha Planificada</TableHead>
                   <TableHead className="w-32">Hora Planificada</TableHead>
                   <TableHead className="w-32">Fecha de Cumplimiento</TableHead>
                   <TableHead className="w-32">Hora de Cumplimiento</TableHead>
                   <TableHead className="w-32">Progreso</TableHead>
                  {isAdmin && <TableHead className="w-24">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingActivities.map((activity) => (
                  <ActivityTableRow
                    key={activity.id}
                    activity={activity}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Completed Activities */}
      {completedActivities.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Actividades Completadas ({completedActivities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  isAdmin={isAdmin}
                  onUpdate={onUpdateActivity}
                  onDelete={onDeleteActivity}
                  onToggleComplete={onToggleComplete}
                  variant="completed"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}