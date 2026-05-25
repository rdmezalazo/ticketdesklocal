import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Bell, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReminderFrequency } from '@/types/tiTask';

interface TiTaskReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminderDate?: string;
  reminderFrequency?: ReminderFrequency;
  onSave: (reminderDate: string | undefined, reminderFrequency: ReminderFrequency) => void;
}

export function TiTaskReminderModal({
  open,
  onOpenChange,
  reminderDate,
  reminderFrequency,
  onSave
}: TiTaskReminderModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    reminderDate ? new Date(reminderDate) : undefined
  );
  const [frequency, setFrequency] = useState<ReminderFrequency['type']>(
    reminderFrequency?.type || 'none'
  );

  const handleSave = () => {
    const dateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined;
    onSave(dateString, { type: frequency });
    onOpenChange(false);
  };

  const handleClear = () => {
    setSelectedDate(undefined);
    setFrequency('none');
    onSave(undefined, { type: 'none' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configurar Recordatorio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Fecha de Recordatorio */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Fecha de Recordatorio</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "dd 'de' MMMM, yyyy", { locale: es })
                  ) : (
                    <span>Seleccionar fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Frecuencia de Recordatorios */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Frecuencia de Recordatorios
            </Label>
            <Select value={frequency} onValueChange={(value: ReminderFrequency['type']) => setFrequency(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin recordatorio</SelectItem>
                <SelectItem value="one_day_before">1 día antes</SelectItem>
                <SelectItem value="same_day">Mismo día de la fecha</SelectItem>
                <SelectItem value="three_times_daily">3 veces al día (9am, 1pm, 4pm)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {frequency === 'one_day_before' && 'Se enviará un recordatorio un día antes de la fecha seleccionada'}
              {frequency === 'same_day' && 'Se enviará un recordatorio el mismo día de la fecha seleccionada'}
              {frequency === 'three_times_daily' && 'Se enviarán recordatorios a las 9:00am, 1:00pm y 4:00pm cada día hasta la fecha'}
              {frequency === 'none' && 'No se enviarán recordatorios automáticos'}
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClear}>
            Limpiar
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar Recordatorio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
