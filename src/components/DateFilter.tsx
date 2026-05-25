import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Calendar as CalendarLucide } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export type DateFilterType = 'all' | 'today' | 'custom' | 'three_months' | 'last_month' | 'current_month';

interface DateFilterProps {
  value: DateFilterType;
  dateRange: DateRange;
  onValueChange: (value: DateFilterType) => void;
  onDateRangeChange: (range: DateRange) => void;
}

export const DateFilter = ({ value, dateRange, onValueChange, onDateRangeChange }: DateFilterProps) => {

  const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const getThreeMonthsAgo = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3);
    return date;
  };

  const getLastMonth = () => {
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    start.setDate(1);
    
    const end = new Date();
    end.setDate(0);
    
    return { from: start, to: end };
  };

  const getCurrentMonth = () => {
    const start = new Date();
    start.setDate(1);
    
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    
    return { from: start, to: end };
  };

  const handleFilterSelect = (filterType: DateFilterType) => {
    onValueChange(filterType);
    
    switch (filterType) {
      case 'all':
        onDateRangeChange({ from: undefined, to: undefined });
        break;
      case 'today':
        const today = getToday();
        onDateRangeChange({ from: today, to: today });
        break;
      case 'three_months':
        onDateRangeChange({ from: getThreeMonthsAgo(), to: new Date() });
        break;
      case 'last_month':
        onDateRangeChange(getLastMonth());
        break;
      case 'current_month':
        onDateRangeChange(getCurrentMonth());
        break;
      case 'custom':
        // Custom date range will be shown inline
        break;
    }
  };

  const getFilterLabel = () => {
    switch (value) {
      case 'all':
        return 'Todas las fechas';
      case 'today':
        return 'Hoy';
      case 'three_months':
        return 'Hace tres meses';
      case 'last_month':
        return 'Mes anterior';
      case 'current_month':
        return 'Mes actual';
      case 'custom':
        if (dateRange.from && dateRange.to) {
          return `${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`;
        } else if (dateRange.from) {
          return `Desde ${format(dateRange.from, 'dd/MM/yyyy', { locale: es })}`;
        } else if (dateRange.to) {
          return `Hasta ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`;
        }
        return 'Especifique fechas';
      default:
        return 'Filtrar por fecha';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <CalendarLucide className="h-4 w-4" />
            {getFilterLabel()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-background border border-border shadow-lg z-50">
          <DropdownMenuItem onClick={() => handleFilterSelect('all')}>
            Todas las fechas
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleFilterSelect('today')}>
            Hoy
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleFilterSelect('custom')}>
            Especifique fechas
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleFilterSelect('three_months')}>
            Hace tres meses
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleFilterSelect('last_month')}>
            Mes anterior
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleFilterSelect('current_month')}>
            Mes actual
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Inline Custom Date Range */}
      {value === 'custom' && (
        <>
          <div className="text-sm text-muted-foreground">desde</div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  format(dateRange.from, "dd/MM/yyyy", { locale: es })
                ) : (
                  <span>Fecha de inicio</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background z-50 pointer-events-auto" align="start">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={(date) =>
                  onDateRangeChange({ ...dateRange, from: date })
                }
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <div className="text-sm text-muted-foreground">hasta</div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateRange.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.to ? (
                  format(dateRange.to, "dd/MM/yyyy", { locale: es })
                ) : (
                  <span>Fecha de fin</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background z-50 pointer-events-auto" align="start">
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={(date) =>
                  onDateRangeChange({ ...dateRange, to: date })
                }
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onDateRangeChange({ from: undefined, to: undefined });
              onValueChange('all');
            }}
          >
            Limpiar
          </Button>
        </>
      )}
    </div>
  );
};