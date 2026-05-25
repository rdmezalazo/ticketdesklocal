import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditorWithMentions } from '@/components/ui/rich-text-editor-with-mentions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { TiTaskWithActivities, TiTaskPriority, TiTaskStatus } from '@/types/tiTask';
import { useTiTasks } from '@/hooks/useTiTasks';
import { useToast } from '@/hooks/use-toast';
import { useUsers } from '@/hooks/useUsers';
import { useSettings } from '@/hooks/useSettings';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  User, 
  Building, 
  MapPin, 
  Tag, 
  Edit3, 
  Save, 
  X,
  FileText,
  Clock,
  Bell,
  CalendarIcon
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { TiTaskReminderModal } from './TiTaskReminderModal';
import { ReminderFrequency } from '@/types/tiTask';

interface TiTaskFormProps {
  task: TiTaskWithActivities;
  isAdmin: boolean;
  onTaskUpdated?: () => void;
}

export function TiTaskForm({ task, isAdmin, onTaskUpdated }: TiTaskFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    subject: task.subject,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    category: task.category,
    assignee: task.assignee || '',
    sede: task.sede || 'Arequipa',
    area: task.area || 'Sistemas',
    tags: task.tags || [],
    created_at: task.created_at,
    reminder_date: task.reminder_date,
    reminder_frequency: task.reminder_frequency
  });
  const [isLoading, setIsLoading] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(
    Boolean(task.reminder_date && task.reminder_frequency?.type !== 'none')
  );

  const { updateTiTask } = useTiTasks();
  const { toast } = useToast();
  const { users, fetchUsers } = useUsers();
  const { systemAreas, tiTaskCategories, getSettingValue } = useSettings();
  
  const canEditCreatedDate = Boolean(getSettingValue('admin_titask_edit_created_date_enabled', false));

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSave = async () => {
    if (!isAdmin) return;
    
    try {
      setIsLoading(true);
      await updateTiTask(task.id, { ...formData, mentioned_users: mentionedUsers });
      toast({
        title: "Tarea actualizada",
        description: "Los cambios han sido guardados correctamente",
      });
      setIsEditing(false);
      onTaskUpdated?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la tarea",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      subject: task.subject,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      category: task.category,
      assignee: task.assignee || '',
      sede: task.sede || 'Arequipa',
      area: task.area || 'Sistemas',
      tags: task.tags || [],
      created_at: task.created_at,
      reminder_date: task.reminder_date,
      reminder_frequency: task.reminder_frequency
    });
    setReminderEnabled(Boolean(task.reminder_date && task.reminder_frequency?.type !== 'none'));
    setIsEditing(false);
  };

  const handleReminderSave = (reminderDate: string | undefined, reminderFrequency: ReminderFrequency) => {
    setFormData({
      ...formData,
      reminder_date: reminderDate,
      reminder_frequency: reminderFrequency
    });
    setReminderEnabled(Boolean(reminderDate && reminderFrequency.type !== 'none'));
  };

  const handleReminderToggle = (checked: boolean) => {
    setReminderEnabled(checked);
    if (checked) {
      setShowReminderModal(true);
    } else {
      setFormData({
        ...formData,
        reminder_date: undefined,
        reminder_frequency: { type: 'none' }
      });
    }
  };

  const getFrequencyText = (frequency?: ReminderFrequency) => {
    if (!frequency || frequency.type === 'none') return 'Sin recordatorio';
    switch (frequency.type) {
      case 'one_day_before': return '1 día antes';
      case 'same_day': return 'Mismo día';
      case 'three_times_daily': return '3 veces al día (9am, 1pm, 4pm)';
      default: return 'Sin recordatorio';
    }
  };

  const getStatusColor = (status: TiTaskStatus) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-300';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: TiTaskPriority) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: TiTaskStatus) => {
    switch (status) {
      case 'open': return 'Abierta';
      case 'in_progress': return 'En Progreso';
      case 'resolved': return 'Resuelta';
      case 'closed': return 'Cerrada';
      default: return status;
    }
  };

  const getPriorityText = (priority: TiTaskPriority) => {
    switch (priority) {
      case 'low': return 'Baja';
      case 'medium': return 'Media';
      case 'high': return 'Alta';
      case 'critical': return 'Crítica';
      default: return priority;
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-3">
      {/* Header with edit controls */}
      {isAdmin && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Información de la Tarea
          </h3>
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 className="h-4 w-4 mr-1" />
              Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isLoading}
              >
                <Save className="h-4 w-4 mr-1" />
                Guardar
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Header Info Section */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            {/* Assignee */}
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Asignado a:</span>
              <Badge variant="secondary" className="text-xs">
                {task.assignee_name || 'Sin asignar'}
              </Badge>
            </div>

            {/* Created and Updated dates */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Creado: {formatDate(isEditing && canEditCreatedDate ? formData.created_at : task.created_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Actualizado: {formatDate(task.updated_at)}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Progreso de Actividades</Label>
              <span className="text-xs font-medium">{task.activities_progress_avg || 0}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${task.activities_progress_avg || 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Container */}
      <Card>
        <CardContent className="p-3">
          <div className="space-y-3">
            {/* Subject */}
            <div className="space-y-1">
              <Label htmlFor="subject" className="text-xs font-medium">Asunto</Label>
              {isEditing ? (
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="h-8"
                />
              ) : (
                <p className="text-xs text-muted-foreground py-1.5 px-2 bg-muted/30 rounded-md">
                  {task.subject}
                </p>
              )}
            </div>

            {/* Created Date/Time - Only visible when editing and permission enabled */}
            {isEditing && canEditCreatedDate && (() => {
              const createdDate = new Date(formData.created_at);
              const isValidDate = !isNaN(createdDate.getTime());
              
              if (!isValidDate) return null;
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 rounded-md">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Fecha de Creación
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-8",
                            !createdDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {format(createdDate, "dd 'de' MMMM, yyyy", { locale: es })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={createdDate}
                          onSelect={(date) => {
                            if (date) {
                              // Preserve the time from the current created_at
                              const currentDate = new Date(formData.created_at);
                              date.setHours(currentDate.getHours(), currentDate.getMinutes(), currentDate.getSeconds());
                              setFormData({ ...formData, created_at: date });
                            }
                          }}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="created-time" className="text-xs font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Hora de Creación
                    </Label>
                    <Input
                      id="created-time"
                      type="time"
                      value={createdDate.toTimeString().slice(0, 5)}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':');
                        const newDate = new Date(formData.created_at);
                        newDate.setHours(parseInt(hours), parseInt(minutes));
                        setFormData({ ...formData, created_at: newDate });
                      }}
                      className="h-8"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Status, Priority, Category Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Status */}
              <div className="space-y-1">
                <Label htmlFor="status" className="text-xs font-medium">Estado</Label>
                {isEditing ? (
                  <Select
                    value={formData.status}
                    onValueChange={(value: TiTaskStatus) => 
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Abierta</SelectItem>
                      <SelectItem value="in_progress">En Progreso</SelectItem>
                      <SelectItem value="resolved">Resuelta</SelectItem>
                      <SelectItem value="closed">Cerrada</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center h-8">
                    <Badge className={`${getStatusColor(task.status)} text-xs`}>
                      {getStatusText(task.status)}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <Label htmlFor="priority" className="text-xs font-medium">Prioridad</Label>
                {isEditing ? (
                  <Select
                    value={formData.priority}
                    onValueChange={(value: TiTaskPriority) => 
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="critical">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center h-8">
                    <Badge className={`${getPriorityColor(task.priority)} text-xs`}>
                      {getPriorityText(task.priority)}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="space-y-1">
                <Label htmlFor="category" className="text-xs font-medium">Categoría</Label>
                {isEditing ? (
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiTaskCategories?.filter(category => category.is_active).map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center h-8">
                    <Badge variant="outline" className="text-xs">
                      {task.category}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Sede and Area Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Sede */}
              <div className="space-y-1">
                <Label htmlFor="sede" className="text-xs font-medium">Sede</Label>
                {isEditing ? (
                  <Select
                    value={formData.sede}
                    onValueChange={(value) => setFormData({ ...formData, sede: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arequipa">Arequipa</SelectItem>
                      <SelectItem value="Lima">Lima</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center h-8">
                    <Badge variant="outline" className="text-xs">
                      {task.sede}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Area */}
              <div className="space-y-1">
                <Label htmlFor="area" className="text-xs font-medium">Área</Label>
                {isEditing ? (
                  <Select
                    value={formData.area}
                    onValueChange={(value) => setFormData({ ...formData, area: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {systemAreas?.filter(area => area.is_active).map((area) => (
                        <SelectItem key={area.id} value={area.name}>
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center h-8">
                    <Badge variant="outline" className="text-xs">
                      {task.area}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="description" className="text-xs font-medium">Descripción</Label>
              {isEditing ? (
                <RichTextEditorWithMentions
                  content={formData.description}
                  onChange={(content) => setFormData({ ...formData, description: content })}
                  onMentionsChange={(mentions) => setMentionedUsers(mentions)}
                  placeholder="Descripción de la tarea... (usa @ para mencionar usuarios)"
                />
              ) : (
                <div 
                  className="description-content text-sm py-3 px-3 bg-muted/20 rounded-md border min-h-[4rem]"
                  dangerouslySetInnerHTML={{ 
                    __html: task.description || '<span class="text-muted-foreground italic">Sin descripción</span>' 
                  }}
                />
              )}
            </div>

            {/* Reminder Section */}
            {isAdmin && isEditing && (
              <>
                <Separator className="my-4" />
                <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-semibold">Configurar Recordatorio</Label>
                    </div>
                    <Switch
                      checked={reminderEnabled}
                      onCheckedChange={handleReminderToggle}
                    />
                  </div>
                  
                  {reminderEnabled && formData.reminder_date && (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarIcon className="h-3 w-3" />
                        <span>
                          Fecha: {format(new Date(formData.reminder_date), "dd 'de' MMMM, yyyy", { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Frecuencia: {getFrequencyText(formData.reminder_frequency)}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowReminderModal(true)}
                        className="mt-2"
                      >
                        Modificar Recordatorio
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Display Reminder Info when not editing */}
            {!isEditing && task.reminder_date && task.reminder_frequency?.type !== 'none' && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2 p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <Label className="text-sm font-semibold">Recordatorio Activo</Label>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3 w-3" />
                      <span>
                        Fecha: {format(new Date(task.reminder_date), "dd 'de' MMMM, yyyy", { locale: es })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>Frecuencia: {getFrequencyText(task.reminder_frequency)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </CardContent>
      </Card>

      {/* Reminder Modal */}
      <TiTaskReminderModal
        open={showReminderModal}
        onOpenChange={setShowReminderModal}
        reminderDate={formData.reminder_date}
        reminderFrequency={formData.reminder_frequency}
        onSave={handleReminderSave}
      />
    </div>
  );
}