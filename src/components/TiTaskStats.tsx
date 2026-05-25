import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TiTaskStats } from '@/types/tiTask';
import { Wrench, ClipboardList, Clock, CheckCircle, XCircle } from 'lucide-react';

interface TiTaskStatsProps {
  stats: TiTaskStats;
  onStatClick?: (filter: string) => void;
}

export function TiTaskStatsComponent({ stats, onStatClick }: TiTaskStatsProps) {
  const handleClick = (filter: string) => {
    onStatClick?.(filter);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleClick('all')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tareas</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            Todas las tareas de TI
          </p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleClick('open')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Abiertas</CardTitle>
          <Wrench className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
          <p className="text-xs text-muted-foreground">
            Tareas por iniciar
          </p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleClick('in_progress')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
          <Clock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          <p className="text-xs text-muted-foreground">
            Tareas en desarrollo
          </p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleClick('resolved')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resueltas</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          <p className="text-xs text-muted-foreground">
            Tareas completadas
          </p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleClick('closed')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cerradas</CardTitle>
          <XCircle className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-600">{stats.closed}</div>
          <p className="text-xs text-muted-foreground">
            Tareas finalizadas
          </p>
        </CardContent>
      </Card>
    </div>
  );
}