import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TiTaskWithActivities, TiTaskStats } from '@/types/tiTask';
import { isDateInPast } from '@/utils/dateUtils';
import { 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Activity,
  Target,
  Timer,
  Archive,
  Clock
} from 'lucide-react';

interface TiTasksDashboardProps {
  tiTasks: TiTaskWithActivities[];
  stats: TiTaskStats;
  onViewTask: (task: TiTaskWithActivities) => void;
}

export function TiTasksDashboard({ tiTasks, stats, onViewTask }: TiTasksDashboardProps) {

  // Calculate advanced metrics
  const metrics = useMemo(() => {
    const totalActivities = tiTasks.reduce((sum, task) => sum + (task.activities?.length || 0), 0);
    const completedActivities = tiTasks.reduce((sum, task) => 
      sum + (task.activities?.filter(a => a.completed).length || 0), 0
    );
    
    const overallProgress = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;
    
    // Tasks by priority
    const priorityDistribution = tiTasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Recent activity (tasks created in last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentTasks = tiTasks.filter(task => task.created_at >= weekAgo).length;

    // Overdue tasks (tasks with activities past due date)  
    const overdueTasks = tiTasks.filter(task => 
      task.activities?.some(activity => 
        !activity.completed && isDateInPast(activity.due_date)
      )
    ).length;

    return {
      totalActivities,
      completedActivities,
      overallProgress,
      priorityDistribution,
      recentTasks,
      overdueTasks
    };
  }, [tiTasks]);

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    color = 'text-primary',
    trend 
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    color?: string;
    trend?: { value: number; isPositive: boolean };
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            <TrendingUp className={`h-3 w-3 mr-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`} />
            <span className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}% esta semana
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const PriorityChart = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center space-x-2">
          <Target className="h-4 w-4" />
          <span>Distribución por Prioridad</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(metrics.priorityDistribution).map(([priority, count]) => {
          const percentage = Math.round((count / tiTasks.length) * 100);
          const config = {
            critical: { label: 'Crítica', color: 'bg-red-500', textColor: 'text-red-700' },
            high: { label: 'Alta', color: 'bg-orange-500', textColor: 'text-orange-700' },
            medium: { label: 'Media', color: 'bg-blue-500', textColor: 'text-blue-700' },
            low: { label: 'Baja', color: 'bg-green-500', textColor: 'text-green-700' }
          }[priority] || { label: priority, color: 'bg-gray-500', textColor: 'text-gray-700' };

          return (
            <div key={priority} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className={config.textColor}>{config.label}</span>
                <span className="font-medium">{count} ({percentage}%)</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

  const ProgressOverview = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center space-x-2">
          <Activity className="h-4 w-4" />
          <span>Progreso General</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary mb-2">
            {metrics.overallProgress}%
          </div>
          <p className="text-sm text-muted-foreground">
            {metrics.completedActivities} de {metrics.totalActivities} actividades completadas
          </p>
        </div>
        <Progress value={metrics.overallProgress} className="h-3" />
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {stats.closed}
            </div>
            <p className="text-xs text-muted-foreground">Tareas Cerradas</p>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-yellow-600">
              {stats.inProgress}
            </div>
            <p className="text-xs text-muted-foreground">En Progreso</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const RecentActivity = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center space-x-2">
          <Timer className="h-4 w-4" />
          <span>Actividad Reciente</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tiTasks
          .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
          .slice(0, 5)
          .map((task) => (
            <div 
              key={task.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onViewTask(task)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.subject}</p>
                <p className="text-xs text-muted-foreground">{task.code}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {task.status === 'open' && 'Nueva'}
                {task.status === 'in_progress' && 'Progreso'}
                {task.status === 'resolved' && 'Resuelta'}
                {task.status === 'closed' && 'Cerrada'}
              </Badge>
            </div>
          ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Tareas"
          value={stats.total}
          subtitle="Tareas activas en el sistema"
          icon={Archive}
          color="text-blue-600"
        />
        <MetricCard
          title="En Progreso"
          value={stats.inProgress}
          subtitle="Tareas siendo trabajadas"
          icon={Clock}
          color="text-yellow-600"
        />
        <MetricCard
          title="Completadas"
          value={stats.closed}
          subtitle="Tareas finalizadas"
          icon={CheckCircle}
          color="text-green-600"
        />
        <MetricCard
          title="Vencidas"
          value={metrics.overdueTasks}
          subtitle="Requieren atención inmediata"
          icon={AlertTriangle}
          color="text-red-600"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProgressOverview />
        <PriorityChart />
        <RecentActivity />
      </div>

    </div>
  );
}