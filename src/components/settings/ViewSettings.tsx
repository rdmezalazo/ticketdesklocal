import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/hooks/useSettings";
import { LayoutGrid, Table, Inbox, Kanban, Eye } from "lucide-react";

interface ViewConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const VIEW_CONFIGS: ViewConfig[] = [
  {
    id: 'cards',
    name: 'Vista de Tarjetas',
    icon: <LayoutGrid className="h-4 w-4" />,
    description: 'Muestra elementos en formato de tarjetas con información resumida'
  },
  {
    id: 'table',
    name: 'Vista de Tabla',
    icon: <Table className="h-4 w-4" />,
    description: 'Presenta los datos en formato tabular con opciones de ordenamiento'
  },
  {
    id: 'inbox',
    name: 'Vista Inbox',
    icon: <Inbox className="h-4 w-4" />,
    description: 'Organización estilo bandeja de entrada con vista previa'
  },
  {
    id: 'kanban',
    name: 'Vista Kanban',
    icon: <Kanban className="h-4 w-4" />,
    description: 'Tablero visual para gestión de flujo de trabajo por estados'
  }
];

export function ViewSettings() {
  const { loading, getSettingValue, updateAppSetting } = useSettings();
  
  const [ticketViews, setTicketViews] = useState<Record<string, boolean>>({});
  const [tiTaskViews, setTiTaskViews] = useState<Record<string, boolean>>({});

  // Load current settings
  useEffect(() => {
    if (!loading) {
      const ticketViewSettings = getSettingValue('ticket_enabled_views', {
        cards: true,
        table: true,
        inbox: true,
        kanban: true
      });
      
      const tiTaskViewSettings = getSettingValue('ti_task_enabled_views', {
        cards: true,
        table: true,
        inbox: true,
        kanban: true
      });

      setTicketViews(ticketViewSettings);
      setTiTaskViews(tiTaskViewSettings);
    }
  }, [loading, getSettingValue]);

  const handleTicketViewChange = async (viewId: string, enabled: boolean) => {
    const newSettings = { ...ticketViews, [viewId]: enabled };
    setTicketViews(newSettings);
    await updateAppSetting('ticket_enabled_views', newSettings);
  };

  const handleTiTaskViewChange = async (viewId: string, enabled: boolean) => {
    const newSettings = { ...tiTaskViews, [viewId]: enabled };
    setTiTaskViews(newSettings);
    await updateAppSetting('ti_task_enabled_views', newSettings);
  };

  const getEnabledCount = (views: Record<string, boolean>) => {
    return Object.values(views).filter(Boolean).length;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="tickets" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="tickets" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Tickets
        </TabsTrigger>
        <TabsTrigger value="ti-tasks" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Tareas TI
        </TabsTrigger>
      </TabsList>

      {/* Tickets Views Configuration */}
      <TabsContent value="tickets">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Vistas Habilitadas para Tickets</CardTitle>
                <CardDescription>
                  Controla qué vistas estarán disponibles en la página de tickets
                </CardDescription>
              </div>
              <Badge variant="outline">
                {getEnabledCount(ticketViews)} de {VIEW_CONFIGS.length} habilitadas
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {VIEW_CONFIGS.map((view) => (
              <div key={view.id} className="flex items-center justify-between space-x-4">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="mt-1">
                    {view.icon}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`ticket-${view.id}`} className="text-sm font-medium">
                      {view.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {view.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={`ticket-${view.id}`}
                  checked={ticketViews[view.id] || false}
                  onCheckedChange={(checked) => handleTicketViewChange(view.id, checked)}
                />
              </div>
            ))}
            
            {getEnabledCount(ticketViews) === 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Debes habilitar al menos una vista para que los usuarios puedan ver los tickets.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* TI Tasks Views Configuration */}
      <TabsContent value="ti-tasks">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Vistas Habilitadas para Tareas TI</CardTitle>
                <CardDescription>
                  Controla qué vistas estarán disponibles en la página de tareas TI
                </CardDescription>
              </div>
              <Badge variant="outline">
                {getEnabledCount(tiTaskViews)} de {VIEW_CONFIGS.length} habilitadas
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {VIEW_CONFIGS.map((view) => (
              <div key={view.id} className="flex items-center justify-between space-x-4">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="mt-1">
                    {view.icon}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`ti-task-${view.id}`} className="text-sm font-medium">
                      {view.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {view.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={`ti-task-${view.id}`}
                  checked={tiTaskViews[view.id] || false}
                  onCheckedChange={(checked) => handleTiTaskViewChange(view.id, checked)}
                />
              </div>
            ))}
            
            {getEnabledCount(tiTaskViews) === 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Debes habilitar al menos una vista para que los usuarios puedan ver las tareas TI.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}