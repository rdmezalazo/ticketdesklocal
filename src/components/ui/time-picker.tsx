import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function TimePicker({ value, onChange, isOpen, onClose }: TimePickerProps) {
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [time, period] = value.split(' ');
      const [hours, minutes] = time.split(':');
      setSelectedHour(parseInt(hours));
      setSelectedMinute(parseInt(minutes));
      setSelectedPeriod(period as 'AM' | 'PM');
    }
  }, [value, isOpen]);

  // Scroll to selected values when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToSelected();
      }, 100);
    }
  }, [isOpen]);

  const scrollToSelected = () => {
    const scrollToElement = (container: HTMLDivElement | null, index: number) => {
      if (container) {
        const element = container.children[index] as HTMLElement;
        if (element) {
          element.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    };

    scrollToElement(hourRef.current, selectedHour - 1);
    scrollToElement(minuteRef.current, selectedMinute / 15);
    scrollToElement(periodRef.current, selectedPeriod === 'AM' ? 0 : 1);
  };

  const handleOk = () => {
    const formattedTime = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`;
    onChange(formattedTime);
    onClose();
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = [0, 15, 30, 45];
  const periods: ('AM' | 'PM')[] = ['AM', 'PM'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[320px] p-0">
        <div className="flex flex-col">
          <div className="flex h-[240px] divide-x divide-border">
            {/* Hours */}
            <div 
              ref={hourRef}
              className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
            >
              {hours.map((hour) => (
                <button
                  key={hour}
                  onClick={() => setSelectedHour(hour)}
                  className={cn(
                    "w-full py-3 text-center transition-colors hover:bg-accent",
                    selectedHour === hour && "bg-primary text-primary-foreground font-medium"
                  )}
                >
                  {hour.toString().padStart(2, '0')}
                </button>
              ))}
            </div>

            {/* Minutes */}
            <div 
              ref={minuteRef}
              className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
            >
              {minutes.map((minute) => (
                <button
                  key={minute}
                  onClick={() => setSelectedMinute(minute)}
                  className={cn(
                    "w-full py-3 text-center transition-colors hover:bg-accent",
                    selectedMinute === minute && "bg-primary text-primary-foreground font-medium"
                  )}
                >
                  {minute.toString().padStart(2, '0')}
                </button>
              ))}
            </div>

            {/* AM/PM */}
            <div 
              ref={periodRef}
              className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
            >
              {periods.map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={cn(
                    "w-full py-3 text-center transition-colors hover:bg-accent",
                    selectedPeriod === period && "bg-primary text-primary-foreground font-medium"
                  )}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-4 border-t">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-primary"
            >
              CANCEL
            </Button>
            <Button
              onClick={handleOk}
              className="text-primary"
              variant="ghost"
            >
              OK
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
