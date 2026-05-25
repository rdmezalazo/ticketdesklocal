import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, LayoutDashboard, LayoutGrid, Inbox, Table, Kanban, Plus } from 'lucide-react';
import { TiTaskWithActivities, TiTaskStats } from '@/types/tiTask';
import { useTiTasks } from '@/hooks/useTiTasks';
import { supabase } from '@/integrations/supabase/client';
import { CreateTiTaskModal } from '@/components/CreateTiTaskModal';
import { TiTaskCardsView } from '@/components/TiTaskCardsView';
import { TiTaskTableView } from '@/components/TiTaskTableView';
import { TiTaskInboxView } from '@/components/TiTaskInboxView';
import { TiTaskKanbanView } from '@/components/TiTaskKanbanView';
import { TiTasksDashboard } from '@/components/titask/TiTasksDashboard';
import { TiTaskManagementModal } from '@/components/titask/TiTaskManagementModal';
import { DateFilter, DateFilterType } from '@/components/DateFilter';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { PermissionProtectedRoute } from '@/components/PermissionProtectedRoute';
import { useViewSettings, ViewMode } from '@/hooks/useViewSettings';

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';
type MainView = 'dashboard' | 'legacy';

export default function TiTasks() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [mainView, setMainView] = useState<MainView>('legacy');
  const [selectedTask, setSelectedTask] = useState<TiTaskWithActivities | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dateFilter, setDateFilter] = useState<{ value: DateFilterType; range: { from: Date | undefined; to: Date | undefined } }>({
    value: 'all',
    range: { from: undefined, to: undefined }
  });

  const { tiTasks, loading, refreshTiTasks } = useTiTasks();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasAccess } = useUserPermissions();
  const { enabledTiTaskViews, isViewEnabled, getDefaultView, loading: viewSettingsLoading } = useViewSettings();

  // Redirect if user doesn't have access
  useEffect(() => {
    if (!hasAccess('ti-tasks')) {
      navigate('/');
    }
  }, [hasAccess, navigate]);

  // Stats calculation
  const stats = useMemo((): TiTaskStats => {
    return tiTasks.reduce((acc, task) => {
      const effectiveStatus = task.conformidad_status ? 'closed' : task.status;
      acc.total++;
      switch (effectiveStatus) {
        case 'open':
          acc.open++;
          break;
        case 'in_progress':
          acc.inProgress++;
          break;
        case 'resolved':
          acc.resolved++;
          break;
        case 'closed':
          acc.closed++;
          break;
      }
      return acc;
    }, { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
  }, [tiTasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tiTasks.filter(task => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        task.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const effectiveStatus = task.conformidad_status ? 'closed' : task.status;
      const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;
      
      // Date filter
      let matchesDate = true;
      if (dateFilter.range.from && dateFilter.range.to) {
        const taskDate = new Date(task.created_at);
        matchesDate = taskDate >= dateFilter.range.from && taskDate <= dateFilter.range.to;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [tiTasks, searchTerm, statusFilter, dateFilter]);

  // Initialize view mode from settings
  useEffect(() => {
    if (!viewSettingsLoading && enabledTiTaskViews.length > 0) {
      const defaultView = getDefaultView('ti-tasks');
      if (viewMode !== defaultView && !searchParams.get('view')) {
        setViewMode(defaultView);
      }
    }
  }, [viewSettingsLoading, enabledTiTaskViews, getDefaultView]);

  // URL parameter synchronization
  useEffect(() => {
    const filter = searchParams.get('filter') as StatusFilter;
    const view = searchParams.get('view') as ViewMode;
    
    if (filter && filter !== statusFilter) {
      setStatusFilter(filter);
    }
    if (view && view !== viewMode && isViewEnabled('ti-tasks', view)) {
      setViewMode(view);
    }
  }, [searchParams, isViewEnabled]);

  const handleStatusFilterChange = (status: StatusFilter) => {
    setStatusFilter(status);
    const newParams = new URLSearchParams(searchParams);
    if (status === 'all') {
      newParams.delete('filter');
    } else {
      newParams.set('filter', status);
    }
    setSearchParams(newParams);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    if (!isViewEnabled('ti-tasks', mode)) return;
    
    setViewMode(mode);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', mode);
    setSearchParams(newParams);
  };

  const handleTaskView = (task: TiTaskWithActivities) => {
    setSelectedTask(task);
    setShowDetailsModal(true);
  };

  const handleDeleteTask = async (task: TiTaskWithActivities) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la tarea "${task.subject}"?`)) {
      try {
        const { error } = await supabase
          .from('ti_tasks')
          .delete()
          .eq('id', task.id);

        if (error) throw error;
        
        // Refresh the tasks list
        refreshTiTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('Error al eliminar la tarea');
      }
    }
  };

  const displayTasks = filteredTasks;

  const getStatusLabel = (status: StatusFilter) => {
    const labels = {
      all: 'Todas',
      open: 'Ingresadas',
      in_progress: 'En Proceso', 
      resolved: 'Resueltas',
      closed: 'Cerradas'
    };
    return labels[status];
  };

  return (
    <PermissionProtectedRoute requiredPermission="ti-tasks">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto p-6 space-y-6">
          {/* Modern Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Gestión de Tareas TI
              </h1>
              <p className="text-muted-foreground text-lg">
                Administra proyectos y actividades con herramientas modernas de gestión
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="shadow-lg hover:shadow-xl transition-all duration-200"
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Nueva Tarea
              </Button>
            </div>
          </div>

          {/* Main View Selector */}
          <Card className="shadow-lg border-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <Tabs value={mainView} onValueChange={(value) => setMainView(value as MainView)}>
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Buscar tareas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-md"
                      />
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-0 shadow-md">
                          <Filter className="h-4 w-4" />
                          {getStatusLabel(statusFilter)}
                          {statusFilter !== 'all' && (
                            <Badge variant="secondary" className="ml-1">
                              {statusFilter === 'open' && stats.open}
                              {statusFilter === 'in_progress' && stats.inProgress}
                              {statusFilter === 'resolved' && stats.resolved}
                              {statusFilter === 'closed' && stats.closed}
                            </Badge>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="backdrop-blur-sm">
                        <DropdownMenuItem onClick={() => handleStatusFilterChange('all')}>
                          Todas ({stats.total})
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusFilterChange('open')}>
                          Ingresadas ({stats.open})
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusFilterChange('in_progress')}>
                          En Progreso ({stats.inProgress})
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusFilterChange('resolved')}>
                          Resueltas ({stats.resolved})
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusFilterChange('closed')}>
                          Cerradas ({stats.closed})
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DateFilter
                      value={dateFilter.value}
                      dateRange={dateFilter.range}
                      onValueChange={(value) => setDateFilter(prev => ({ ...prev, value }))}
                      onDateRangeChange={(range) => setDateFilter(prev => ({ ...prev, range }))}
                    />
                  </div>

                  {/* View Toggle */}
                  <TabsList className="grid w-auto grid-cols-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm shadow-md">
                    <TabsTrigger value="dashboard" className="flex items-center space-x-2">
                      <LayoutDashboard className="h-4 w-4" />
                      <span className="hidden sm:inline">Dashboard</span>
                    </TabsTrigger>
                    <TabsTrigger value="legacy" className="flex items-center space-x-2">
                      <LayoutGrid className="h-4 w-4" />
                      <span className="hidden sm:inline">Vistas Clásicas</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </Tabs>
            </CardContent>
          </Card>

          {/* Content Area */}
          {loading || viewSettingsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent shadow-lg"></div>
            </div>
          ) : (
            <Tabs value={mainView} onValueChange={(value) => setMainView(value as MainView)}>
              <TabsContent value="dashboard" className="space-y-6 mt-0">
                <TiTasksDashboard
                  tiTasks={filteredTasks}
                  stats={stats}
                  onViewTask={handleTaskView}
                />
              </TabsContent>

              <TabsContent value="legacy" className="space-y-6 mt-0">
                {enabledTiTaskViews.length === 0 ? (
                  <Card className="shadow-lg">
                    <CardContent className="pt-6">
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="mb-2">No hay vistas habilitadas para las tareas TI</p>
                        <p className="text-sm">Contacta al administrador para habilitar al menos una vista</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : displayTasks.length === 0 ? (
                  <Card className="shadow-lg">
                    <CardContent className="pt-6">
                      <div className="text-center py-8 text-muted-foreground">
                        No se encontraron tareas que coincidan con los filtros seleccionados
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {/* Legacy View Mode Selector */}
                    {!viewSettingsLoading && enabledTiTaskViews.length > 1 && (
                      <div className="flex justify-center">
                        <div className="flex gap-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm p-1 rounded-lg shadow-md">
                          {isViewEnabled('ti-tasks', 'cards') && (
                            <Button
                              variant={viewMode === 'cards' ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => handleViewModeChange('cards')}
                            >
                              <LayoutGrid className="h-4 w-4" />
                            </Button>
                          )}
                          {isViewEnabled('ti-tasks', 'table') && (
                            <Button
                              variant={viewMode === 'table' ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => handleViewModeChange('table')}
                            >
                              <Table className="h-4 w-4" />
                            </Button>
                          )}
                          {isViewEnabled('ti-tasks', 'inbox') && (
                            <Button
                              variant={viewMode === 'inbox' ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => handleViewModeChange('inbox')}
                            >
                              <Inbox className="h-4 w-4" />  
                            </Button>
                          )}
                          {isViewEnabled('ti-tasks', 'kanban') && (
                            <Button
                              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => handleViewModeChange('kanban')}
                            >
                              <Kanban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Legacy Views */}
                    <div className="rounded-xl overflow-hidden shadow-lg">
                      {viewMode === 'cards' && isViewEnabled('ti-tasks', 'cards') && (
                        <TiTaskCardsView 
                          tiTasks={displayTasks} 
                          onViewTask={handleTaskView}
                        />
                      )}
                      {viewMode === 'table' && isViewEnabled('ti-tasks', 'table') && (
                        <TiTaskTableView 
                          tiTasks={displayTasks} 
                          onViewTask={handleTaskView}
                          onDeleteTask={handleDeleteTask}
                          onTaskUpdated={refreshTiTasks}
                        />
                      )}
                      {viewMode === 'inbox' && isViewEnabled('ti-tasks', 'inbox') && (
                        <TiTaskInboxView 
                          tiTasks={displayTasks} 
                          onViewTask={handleTaskView}
                        />
                      )}
                      {viewMode === 'kanban' && isViewEnabled('ti-tasks', 'kanban') && (
                        <TiTaskKanbanView 
                          tiTasks={displayTasks} 
                          onViewTask={handleTaskView}
                          onTaskUpdated={refreshTiTasks}
                        />
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Task Management Modal */}
          <TiTaskManagementModal
            task={selectedTask}
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedTask(null);
            }}
            onTaskUpdated={refreshTiTasks}
          />

          {/* Create Task Modal */}
          <CreateTiTaskModal 
            open={showCreateModal}
            onOpenChange={setShowCreateModal}
            onTaskCreated={refreshTiTasks}
          />
        </div>
      </div>
    </PermissionProtectedRoute>
  );
}