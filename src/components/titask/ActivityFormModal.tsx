import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimePicker } from '@/components/ui/time-picker';
import { useTiTaskActivities } from '@/hooks/useTiTaskActivities';
import { useToast } from '@/hooks/use-toast';
import { Plus, Clock, Calendar, Edit, CheckCircle2 } from 'lucide-react';
import { getTodayDateString } from '@/utils/dateUtils';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface ActivityFormModalProps {
  taskId: string;
  activityId?: string;
  isOpen: boolean;
  onClose: () => void;
  onActivityAdded: () => void;
}

export function ActivityFormModal({ taskId, activityId, isOpen, onClose, onActivityAdded }: ActivityFormModalProps) {
  // Get current date and time, rounded UP to nearest 15 minutes
  const getCurrentTime = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    const hours = now.getHours();
    const mins = now.getMinutes();
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hours12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${ampm}`;
  };

  // Get time 15 minutes from now
  const getTime15MinutesLater = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15 + 15; // Add 15 minutes
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    const hours = now.getHours();
    const mins = now.getMinutes();
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hours12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${ampm}`;
  };

  const [formData, setFormData] = useState({
    description: '',
    dueDate: getTodayDateString(), // Set to today by default
    startDate: getTodayDateString(),
    startTime: getCurrentTime(),
    endTime: getTime15MinutesLater(), // Set to 15 minutes later by default
    progress: 0,
    completionDate: '',
    completionTime: ''
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(new Date());
  const [selectedCompletionDate, setSelectedCompletionDate] = useState<Date | undefined>(undefined);
  const [canEditCompletion, setCanEditCompletion] = useState(false);
  const [isStartTimePickerOpen, setIsStartTimePickerOpen] = useState(false);
  const [isEndTimePickerOpen, setIsEndTimePickerOpen] = useState(false);
  const [isCompletionTimePickerOpen, setIsCompletionTimePickerOpen] = useState(false);
  const { user } = useAuth();

  // Helper functions for 12-hour format
  const convertTo12Hour = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
    return `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const convertTo24Hour = (time12: string) => {
    if (!time12) return '';
    const [time, ampm] = time12.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);
    if (ampm === 'PM' && hour24 !== 12) hour24 += 12;
    if (ampm === 'AM' && hour24 === 12) hour24 = 0;
    return `${hour24.toString().padStart(2, '0')}:${minutes}`;
  };
  const [isLoading, setIsLoading] = useState(false);

  const { activities, addActivity, updateActivity } = useTiTaskActivities(taskId);
  const { toast } = useToast();

  const isEditing = !!activityId;

  // Check if user can edit completion date/time
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) return;
      
      // Check if user is TI or gerencia
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      const isAdmin = profile?.role === 'ti' || profile?.role === 'gerencia';
      
      // Check if setting is enabled
      const { data: setting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'admin_titask_edit_completion_datetime_enabled')
        .single();
      
      const settingEnabled = setting?.value === 'true' || setting?.value === true;
      
      setCanEditCompletion(isAdmin && settingEnabled);
    };
    
    checkPermissions();
  }, [user]);

  // Load activity data when editing
  useEffect(() => {
    if (isEditing && activityId && activities.length > 0) {
      const activity = activities.find(a => a.id === activityId);
      if (activity) {
        const activityDate = activity.due_date ? parse(activity.due_date, 'yyyy-MM-dd', new Date()) : undefined;
        const startDateParsed = activity.start_date ? parse(activity.start_date, 'yyyy-MM-dd', new Date()) : undefined;
        const completionDateParsed = activity.completion_date ? parse(activity.completion_date, 'yyyy-MM-dd', new Date()) : undefined;
        
        setFormData({
          description: activity.description,
          dueDate: activity.due_date,
          startDate: activity.start_date || getTodayDateString(),
          startTime: convertTo12Hour(activity.start_time || ''),
          endTime: convertTo12Hour(activity.end_time || ''),
          progress: activity.progress,
          completionDate: activity.completion_date || '',
          completionTime: convertTo12Hour(activity.completion_time || '')
        });
        setSelectedDate(activityDate);
        setSelectedStartDate(startDateParsed || new Date());
        setSelectedCompletionDate(completionDateParsed);
      }
    }
  }, [isEditing, activityId, activities]);

  const handleClose = () => {
    setFormData({
      description: '',
      dueDate: getTodayDateString(),
      startDate: getTodayDateString(),
      startTime: getCurrentTime(),
      endTime: getTime15MinutesLater(),
      progress: 0,
      completionDate: '',
      completionTime: ''
    });
    setSelectedDate(new Date());
    setSelectedStartDate(new Date());
    setSelectedCompletionDate(undefined);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      toast({
        title: "Campos requeridos",
        description: "La descripción es obligatoria",
        variant: "destructive",
      });
      return;
    }

    if (!formData.dueDate) {
      toast({
        title: "Campos requeridos",
        description: "La fecha planificada es obligatoria",
        variant: "destructive",
      });
      return;
    }

    // Additional client-side validation for date (only for new activities)
    if (!isEditing) {
      // Check admin setting for allowing past due dates
      const { data: allowPastDueDateSetting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'admin_titask_allow_past_due_date_enabled')
        .single();

      const allowPastDueDate = allowPastDueDateSetting?.value === 'true' || allowPastDueDateSetting?.value === true;
      
      const today = getTodayDateString();
      if (!allowPastDueDate && formData.dueDate < today) {
        toast({
          title: "Error de validación",
          description: "La fecha planificada no puede ser anterior a hoy",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setIsLoading(true);
      
      let result;
      if (isEditing && activityId) {
        const updates: any = {
          description: formData.description.trim(),
          due_date: formData.dueDate,
          progress: formData.progress,
          end_time: convertTo24Hour(formData.endTime) || undefined
        };
        
        // Only include completion fields if user can edit them and progress is 100
        if (canEditCompletion && formData.progress === 100) {
          updates.completion_date = formData.completionDate || null;
          updates.completion_time = convertTo24Hour(formData.completionTime) || null;
        }
        
        result = await updateActivity(activityId, updates);
      } else {
        result = await addActivity(
          taskId,
          formData.description.trim(),
          formData.dueDate,
          formData.progress,
          convertTo24Hour(formData.endTime) || undefined,
          formData.startDate || undefined,
          convertTo24Hour(formData.startTime) || undefined
        );
      }

      if (result) {
        setFormData({
          description: '',
          dueDate: getTodayDateString(),
          startDate: getTodayDateString(),
          startTime: getCurrentTime(),
          endTime: getTime15MinutesLater(),
          progress: 0,
          completionDate: '',
          completionTime: ''
        });
        
        onActivityAdded();
        onClose();
      }
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} activity:`, error);
      toast({
        title: "Error",
        description: `No se pudo ${isEditing ? 'actualizar' : 'crear'} la actividad`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isDueDateTodayOrFuture = () => {
    if (!formData.dueDate) return false;
    const today = getTodayDateString();
    return formData.dueDate >= today;
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      setFormData({ ...formData, dueDate: dateString, endTime: '' });
    } else {
      setFormData({ ...formData, dueDate: '', endTime: '' });
    }
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    setSelectedStartDate(date);
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      // Set both startDate and dueDate to the same value
      setFormData({ ...formData, startDate: dateString, dueDate: dateString });
      setSelectedDate(date);
    } else {
      setFormData({ ...formData, startDate: '', dueDate: '' });
      setSelectedDate(undefined);
    }
  };

  // Helper to add 15 minutes to a time string
  const addMinutesToTime = (time12: string, minutesToAdd: number) => {
    if (!time12) return '';
    const time24 = convertTo24Hour(time12);
    const [hours, minutes] = time24.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + minutesToAdd;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    const time24Result = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    return convertTo12Hour(time24Result);
  };

  // Calculate duration in days, hours, and minutes
  const calculateDuration = () => {
    if (!formData.startDate || !formData.dueDate) return null;
    
    // Parse dates
    const startDateTime = new Date(formData.startDate);
    const dueDateTime = new Date(formData.dueDate);
    
    // If we have times, add them to the calculation
    if (formData.startTime && formData.endTime) {
      const startTime24 = convertTo24Hour(formData.startTime);
      const endTime24 = convertTo24Hour(formData.endTime);
      
      const [startHours, startMinutes] = startTime24.split(':').map(Number);
      const [endHours, endMinutes] = endTime24.split(':').map(Number);
      
      startDateTime.setHours(startHours, startMinutes, 0, 0);
      dueDateTime.setHours(endHours, endMinutes, 0, 0);
    }
    
    // Calculate total difference in milliseconds
    const diffTime = dueDateTime.getTime() - startDateTime.getTime();
    
    // Calculate days, hours, and minutes separately
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const remainingAfterDays = diffTime % (1000 * 60 * 60 * 24);
    const diffHours = Math.floor(remainingAfterDays / (1000 * 60 * 60));
    const remainingAfterHours = remainingAfterDays % (1000 * 60 * 60);
    const diffMinutes = Math.floor(remainingAfterHours / (1000 * 60));
    
    return { days: diffDays, hours: diffHours, minutes: diffMinutes };
  };

  const duration = calculateDuration();
  
  // Format duration string
  const formatDuration = () => {
    if (!duration) return '';
    const parts = [];
    if (duration.days > 0) {
      parts.push(`${duration.days} ${duration.days === 1 ? 'día' : 'días'}`);
    }
    if (duration.hours > 0) {
      parts.push(`${duration.hours} ${duration.hours === 1 ? 'hora' : 'horas'}`);
    }
    if (duration.minutes > 0) {
      parts.push(`${duration.minutes} ${duration.minutes === 1 ? 'minuto' : 'minutos'}`);
    }
    return parts.length > 0 ? parts.join(' ') : '0 minutos';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Edit className="h-5 w-5" />
                Editar Actividad
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Nueva Actividad
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe la actividad a realizar..."
                className="mt-1"
                required
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de Inicio
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !selectedStartDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedStartDate ? format(selectedStartDate, 'dd/MM/yyyy', { locale: es }) : <span>Seleccionar fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedStartDate}
                      onSelect={handleStartDateSelect}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="startTime" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hora de Inicio
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsStartTimePickerOpen(true)}
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !formData.startTime && "text-muted-foreground"
                  )}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  {formData.startTime || "Seleccionar hora"}
                </Button>
                <TimePicker
                  value={formData.startTime}
                  onChange={(value) => {
                    const newEndTime = addMinutesToTime(value, 15);
                    setFormData({ ...formData, startTime: value, endTime: newEndTime });
                  }}
                  isOpen={isStartTimePickerOpen}
                  onClose={() => setIsStartTimePickerOpen(false)}
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha Planificada *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: es }) : <span>Seleccionar fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => !isEditing && formData.startDate && date < new Date(formData.startDate)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {isDueDateTodayOrFuture() && (
                <div>
                  <Label htmlFor="endTime" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Hora Planificada
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEndTimePickerOpen(true)}
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1",
                      !formData.endTime && "text-muted-foreground"
                    )}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {formData.endTime || "Seleccionar hora"}
                  </Button>
                  <TimePicker
                    value={formData.endTime}
                    onChange={(value) => setFormData({ ...formData, endTime: value })}
                    isOpen={isEndTimePickerOpen}
                    onClose={() => setIsEndTimePickerOpen(false)}
                  />
                </div>
              )}

              {duration !== null && (
                <div>
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Duración
                  </Label>
                  <Input
                    type="text"
                    value={formatDuration()}
                    className="mt-1 bg-muted"
                    readOnly
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Progreso inicial</Label>
              <div className="mt-2 space-y-3">
                <Slider
                  value={[formData.progress]}
                  onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>0%</span>
                  <span className="font-medium">{formData.progress}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Completion date/time fields - only show if admin and progress is 100 */}
            {isEditing && canEditCompletion && formData.progress === 100 && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Fecha y Hora de Cumplimiento (Edición Manual)</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Fecha de Cumplimiento
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !selectedCompletionDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {selectedCompletionDate ? format(selectedCompletionDate, 'dd/MM/yyyy', { locale: es }) : <span>Seleccionar fecha</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={selectedCompletionDate}
                          onSelect={(date) => {
                            setSelectedCompletionDate(date);
                            if (date) {
                              setFormData({ ...formData, completionDate: format(date, 'yyyy-MM-dd') });
                            } else {
                              setFormData({ ...formData, completionDate: '' });
                            }
                          }}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="completionTime" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Hora de Cumplimiento
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCompletionTimePickerOpen(true)}
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !formData.completionTime && "text-muted-foreground"
                      )}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {formData.completionTime || "Seleccionar hora"}
                    </Button>
                    <TimePicker
                      value={formData.completionTime}
                      onChange={(value) => setFormData({ ...formData, completionTime: value })}
                      isOpen={isCompletionTimePickerOpen}
                      onClose={() => setIsCompletionTimePickerOpen(false)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading 
                ? (isEditing ? 'Guardando...' : 'Creando...') 
                : (isEditing ? 'Guardar Cambios' : 'Crear Actividad')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}