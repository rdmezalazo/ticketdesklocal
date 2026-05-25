import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useTiTaskActivities } from '@/hooks/useTiTaskActivities';
import { useToast } from '@/hooks/use-toast';
import { Plus, Clock, Calendar } from 'lucide-react';
import { getTodayDateString } from '@/utils/dateUtils';

interface ActivityFormProps {
  taskId: string;
  onActivityAdded: () => void;
  onCancel: () => void;
}

export function ActivityForm({ taskId, onActivityAdded, onCancel }: ActivityFormProps) {
  // Get current date and time, rounded to nearest 15 minutes
  const getCurrentTime = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    return now.toTimeString().slice(0, 5); // HH:MM format
  };

  const [formData, setFormData] = useState({
    description: '',
    dueDate: '',
    startDate: getTodayDateString(),
    startTime: getCurrentTime(),
    endTime: '',
    progress: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  const { addActivity } = useTiTaskActivities(taskId);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim() || !formData.dueDate) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa la descripción y fecha límite",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const result = await addActivity(
        taskId,
        formData.description,
        formData.dueDate,
        formData.progress,
        formData.endTime || undefined,
        formData.startDate || undefined,
        formData.startTime || undefined
      );

      if (result) {
        toast({
          title: "Actividad creada",
          description: "La nueva actividad ha sido agregada correctamente",
        });
        
        setFormData({
          description: '',
          dueDate: '',
          startDate: getTodayDateString(),
          startTime: getCurrentTime(),
          endTime: '',
          progress: 0
        });
        
        onActivityAdded();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la actividad",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isDueDateToday = () => {
    if (!formData.dueDate) return false;
    return formData.dueDate === getTodayDateString();
  };

  // Calculate total duration (days and hours)
  const calculateDuration = () => {
    if (!formData.startDate || !formData.dueDate) return null;
    
    // Create start datetime
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime || '00:00'}`);
    
    // Create end datetime - use endTime if dueDate is today, otherwise end of day
    let endDateTime: Date;
    if (formData.endTime && isDueDateToday()) {
      endDateTime = new Date(`${formData.dueDate}T${formData.endTime}`);
    } else {
      endDateTime = new Date(`${formData.dueDate}T23:59`);
    }
    
    // Calculate difference in milliseconds
    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    
    // Convert to hours and days
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    
    return { days, hours };
  };

  const duration = calculateDuration();

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Nueva Actividad
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe la actividad a realizar..."
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de Inicio
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="startTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Hora de Inicio
              </Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="mt-1"
                step="900"
              />
            </div>

            <div>
              <Label htmlFor="dueDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha Planificada *
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="mt-1"
                required
                min={formData.startDate || getTodayDateString()}
              />
            </div>

            {isDueDateToday() && (
              <div>
                <Label htmlFor="endTime" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hora Planificada
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="mt-1"
                  step="900"
                />
              </div>
            )}

            {duration && (
              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duración Total
                </Label>
                <Input
                  type="text"
                  value={`${duration.days} ${duration.days === 1 ? 'día' : 'días'} ${duration.hours} ${duration.hours === 1 ? 'hora' : 'horas'}`}
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

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? 'Creando...' : 'Crear Actividad'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}