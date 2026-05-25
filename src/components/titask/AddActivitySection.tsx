import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import { isToday, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getTodayDateString } from '@/utils/dateUtils';
import { supabase } from '@/integrations/supabase/client';

interface AddActivitySectionProps {
  taskId: string;
  onAddActivity: (
    taskId: string,
    description: string,
    dueDate: string,
    progress: number,
    endTime?: string
  ) => Promise<any>; // Changed from Promise<void> to Promise<any>
}

export function AddActivitySection({ taskId, onAddActivity }: AddActivitySectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    description: '',
    dueDate: '',
    endTime: '',
    progress: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      toast({
        title: "Error",
        description: "La descripción es obligatoria",
        variant: "destructive"
      });
      return;
    }

    if (!formData.dueDate) {
      toast({
        title: "Error", 
        description: "La fecha límite es obligatoria",
        variant: "destructive"
      });
      return;
    }

    // Additional client-side validation for date
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
        title: "Error",
        description: "La fecha límite no puede ser anterior a hoy",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await onAddActivity(
        taskId,
        formData.description.trim(),
        formData.dueDate,
        formData.progress,
        formData.endTime || undefined
      );

      if (result) {
        // Reset form only if activity was created successfully 
        setFormData({ description: '', dueDate: '', endTime: '', progress: 0 });
        setIsAdding(false);
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar la actividad",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ description: '', dueDate: '', endTime: '', progress: 0 });
    setIsAdding(false);
  };

  const isDueDateToday = formData.dueDate && isToday(parseISO(formData.dueDate));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Nueva Actividad
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isAdding ? (
          <Button onClick={() => setIsAdding(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Nueva Actividad
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="description">
                Descripción <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe detalladamente la actividad a realizar..."
                className="min-h-[100px] resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dueDate">
                  Fecha Planificada <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  min={getTodayDateString()}
                  required
                />
              </div>

              {isDueDateToday && (
                <div>
                  <Label htmlFor="endTime">Hora Planificada</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="progress">
                Progreso inicial: {formData.progress}%
              </Label>
              <Input
                id="progress"
                type="range"
                min="0"
                max="100"
                step="5"
                value={formData.progress}
                onChange={(e) => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Agregando...' : 'Agregar Actividad'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}