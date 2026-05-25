import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { TiTaskActivity } from '@/types/tiTask';
import { useToast } from '@/hooks/use-toast';
import { isDateInPast, getTodayDateString, formatDateSafe } from '@/utils/dateUtils';
import { 
  CheckCircle2, 
  Circle, 
  Edit3, 
  Save, 
  X, 
  Trash2, 
  Calendar,
  Clock,
  AlertTriangle,
  Target
} from 'lucide-react';

interface ActivityCardProps {
  activity: TiTaskActivity;
  isAdmin: boolean;
  onUpdate: (activityId: string, updates: Partial<TiTaskActivity>) => Promise<any>;
  onDelete: (activityId: string) => Promise<void>;
  onToggleComplete: (activity: TiTaskActivity) => Promise<any>;
  variant?: 'default' | 'overdue' | 'completed';
}

export function ActivityCard({ 
  activity, 
  isAdmin, 
  onUpdate, 
  onDelete, 
  onToggleComplete,
  variant = 'default'
}: ActivityCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editData, setEditData] = useState({
    description: activity.description,
    due_date: activity.due_date,
    end_time: activity.end_time || '',
    progress: activity.progress
  });

  const { toast } = useToast();

  const handleUpdate = async () => {
    try {
      setIsLoading(true);
      await onUpdate(activity.id, editData);
      setIsEditing(false);
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
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de eliminar esta actividad?')) {
      try {
        setIsLoading(true);
        await onDelete(activity.id);
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
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleToggleComplete = async () => {
    try {
      setIsLoading(true);
      await onToggleComplete(activity);
      toast({
        title: activity.completed ? "Actividad marcada como pendiente" : "Actividad completada",
        description: "El estado ha sido actualizado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado de la actividad",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      description: activity.description,
      due_date: activity.due_date,
      end_time: activity.end_time || '',
      progress: activity.progress
    });
    setIsEditing(false);
  };

  // Remove local formatDate function - using formatDateSafe from dateUtils instead

  const formatTime = (time: string) => {
    if (!time) return null;
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = () => {
    if (activity.completed) return false;
    return isDateInPast(activity.due_date);
  };

  const isDueDateToday = () => {
    if (!editData.due_date) return false;
    return editData.due_date === getTodayDateString();
  };

  const getCardStyles = () => {
    switch (variant) {
      case 'overdue':
        return 'border-red-200 bg-red-50/30';
      case 'completed':
        return 'border-green-200 bg-green-50/30';
      default:
        return isOverdue() ? 'border-red-200 bg-red-50/30' : '';
    }
  };

  return (
    <Card className={getCardStyles()}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleComplete}
                disabled={isLoading}
                className={`p-1 h-auto ${activity.completed 
                  ? 'text-green-600 hover:text-green-700' 
                  : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {activity.completed ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </Button>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  #{activity.activity_number}
                </Badge>
                
                {activity.completed && (
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    Completada
                  </Badge>
                )}
                
                {isOverdue() && !activity.completed && (
                  <Badge className="bg-red-100 text-red-800 border-red-300 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Vencida
                  </Badge>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-2">
                {!isEditing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isLoading}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleUpdate}
                      disabled={isLoading}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="space-y-3">
            {/* Description */}
            {isEditing ? (
              <div>
                <Textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="resize-none"
                />
              </div>
            ) : (
              <div 
                className={`description-content text-sm max-w-none ${activity.completed ? 'line-through text-muted-foreground' : ''}`}
                dangerouslySetInnerHTML={{ __html: activity.description }}
                style={{
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word'
                }}
              />
            )}

            {/* Date and Time */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {isEditing ? (
                <>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <Input
                      type="date"
                      value={editData.due_date}
                      onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                      className="w-auto h-8 text-xs"
                    />
                  </div>
                  {isDueDateToday() && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <Input
                        type="time"
                        value={editData.end_time}
                        onChange={(e) => setEditData({ ...editData, end_time: e.target.value })}
                        className="w-auto h-8 text-xs"
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDateSafe(activity.due_date)}</span>
                  </div>
                  {activity.end_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(activity.end_time)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Progreso</span>
                </div>
                <span className="text-sm font-medium">
                  {isEditing ? editData.progress : activity.progress}%
                </span>
              </div>
              
              {isEditing ? (
                <Slider
                  value={[editData.progress]}
                  onValueChange={(value) => setEditData({ ...editData, progress: value[0] })}
                  max={100}
                  step={5}
                  className="w-full"
                />
              ) : (
                <Progress value={activity.progress} className="h-2" />
              )}
            </div>

            {/* Completion info */}
            {activity.completed && activity.completed_at && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                <span>
                  Completada el {new Date(activity.completed_at).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}