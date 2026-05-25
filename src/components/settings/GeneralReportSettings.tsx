import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings2, Ticket as TicketIcon, Wrench, BarChart3, Calendar } from "lucide-react";
import { useGeneralReportConfig, type GeneralReportConfig, type ChartType, type ChartConfig } from "@/hooks/useGeneralReportConfig";


export const GeneralReportSettings = () => {
  const { toast } = useToast();
  const { config, loading, saveConfig: saveConfigHook } = useGeneralReportConfig();
  const [localConfig, setLocalConfig] = useState(config);
  const [isSaving, setIsSaving] = useState(false);


  // Sync local config with hook config when it changes
  React.useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const success = await saveConfigHook(localConfig);
      
      if (success) {
        toast({
          title: "Configuración guardada",
          description: "Los cambios se han aplicado correctamente"
        });
      } else {
        toast({
          title: "Error al guardar",
          description: "No se pudo guardar la configuración. Inténtalo de nuevo.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving general report config:', error);
      toast({
        title: "Error de conexión",
        description: "Revisa tu conexión e inténtalo nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Validate that at least one filter/chart is enabled
  const hasValidConfiguration = () => {
    const hasFilters = Object.values(localConfig.filters).some(v => v);
    const hasTicketCharts = Object.values(localConfig.ticketCharts).some(v => v.enabled);
    const hasTiTaskCharts = Object.values(localConfig.tiTaskCharts).some(v => v.enabled);
    return hasFilters || hasTicketCharts || hasTiTaskCharts;
  };

  const updateFilter = (key: keyof GeneralReportConfig['filters'], value: boolean) => {
    setLocalConfig(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value }
    }));
  };

  const updateTicketChart = (key: keyof GeneralReportConfig['ticketCharts'], enabled: boolean) => {
    setLocalConfig(prev => ({
      ...prev,
      ticketCharts: { 
        ...prev.ticketCharts, 
        [key]: { ...prev.ticketCharts[key], enabled }
      }
    }));
  };

  const updateTicketChartType = (key: keyof GeneralReportConfig['ticketCharts'], type: ChartType) => {
    setLocalConfig(prev => ({
      ...prev,
      ticketCharts: { 
        ...prev.ticketCharts, 
        [key]: { ...prev.ticketCharts[key], type }
      }
    }));
  };

  const updateTicketChartDateRange = (key: keyof GeneralReportConfig['ticketCharts'], dateRange: boolean) => {
    setLocalConfig(prev => ({
      ...prev,
      ticketCharts: { 
        ...prev.ticketCharts, 
        [key]: { ...prev.ticketCharts[key], dateRange }
      }
    }));
  };

  const updateTiTaskChart = (key: keyof GeneralReportConfig['tiTaskCharts'], enabled: boolean) => {
    setLocalConfig(prev => ({
      ...prev,
      tiTaskCharts: { 
        ...prev.tiTaskCharts, 
        [key]: { ...prev.tiTaskCharts[key], enabled }
      }
    }));
  };

  const updateTiTaskChartType = (key: keyof GeneralReportConfig['tiTaskCharts'], type: ChartType) => {
    setLocalConfig(prev => ({
      ...prev,
      tiTaskCharts: { 
        ...prev.tiTaskCharts, 
        [key]: { ...prev.tiTaskCharts[key], type }
      }
    }));
  };

  const updateTiTaskChartDateRange = (key: keyof GeneralReportConfig['tiTaskCharts'], dateRange: boolean) => {
    setLocalConfig(prev => ({
      ...prev,
      tiTaskCharts: { 
        ...prev.tiTaskCharts, 
        [key]: { ...prev.tiTaskCharts[key], dateRange }
      }
    }));
  };


  return (
    <div className="space-y-6">
      {/* Filtros Disponibles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Filtros Disponibles
          </CardTitle>
          <CardDescription>
            Configura qué filtros estarán disponibles en todos los reportes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="filter-dates" className="text-sm">Fechas</Label>
              <Switch
                id="filter-dates"
                checked={localConfig.filters.dates}
                onCheckedChange={(value) => updateFilter('dates', value)}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="filter-areas" className="text-sm">Áreas</Label>
              <Switch
                id="filter-areas"
                checked={localConfig.filters.areas}
                onCheckedChange={(value) => updateFilter('areas', value)}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="filter-categories" className="text-sm">Categorías</Label>
              <Switch
                id="filter-categories"
                checked={localConfig.filters.categories}
                onCheckedChange={(value) => updateFilter('categories', value)}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="filter-productivity" className="text-sm">Productividad</Label>
              <Switch
                id="filter-productivity"
                checked={localConfig.filters.productivity}
                onCheckedChange={(value) => updateFilter('productivity', value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TicketIcon className="h-5 w-5" />
            Gráficos de Tickets
          </CardTitle>
          <CardDescription>
            Establece qué gráficos estarán disponibles para los reportes de tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { key: 'byStatus', label: 'Por Estado' },
              { key: 'byPriority', label: 'Por Prioridad' },
              { key: 'byAreas', label: 'Por Áreas' },
              { key: 'byCategories', label: 'Por Categorías' },
              { key: 'byProductivity', label: 'Por Productividad' },
              { key: 'byPending', label: 'Gráfico Pendientes' }
            ].map(({ key, label }) => (
              <div key={key} className="space-y-3 p-3 rounded-lg border bg-card">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      id={`ticket-${key}`}
                      checked={localConfig.ticketCharts[key as keyof GeneralReportConfig['ticketCharts']].enabled}
                      onCheckedChange={(value) => updateTicketChart(key as keyof GeneralReportConfig['ticketCharts'], value)}
                    />
                    <Label htmlFor={`ticket-${key}`} className="text-sm font-medium">{label}</Label>
                  </div>
                  {localConfig.ticketCharts[key as keyof GeneralReportConfig['ticketCharts']].enabled && (
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={localConfig.ticketCharts[key as keyof GeneralReportConfig['ticketCharts']].type}
                        onValueChange={(value: ChartType) => updateTicketChartType(key as keyof GeneralReportConfig['ticketCharts'], value)}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pie">Circular</SelectItem>
                          <SelectItem value="bar">Barras</SelectItem>
                          <SelectItem value="area">Área</SelectItem>
                          <SelectItem value="line">Línea</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {localConfig.ticketCharts[key as keyof GeneralReportConfig['ticketCharts']].enabled && (
                  <div className="flex items-center gap-3 pl-8">
                    <Switch
                      id={`ticket-${key}-daterange`}
                      checked={localConfig.ticketCharts[key as keyof GeneralReportConfig['ticketCharts']].dateRange}
                      onCheckedChange={(value) => updateTicketChartDateRange(key as keyof GeneralReportConfig['ticketCharts'], value)}
                    />
                    <Label htmlFor={`ticket-${key}-daterange`} className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Abcisas por rango de fechas
                    </Label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Tareas TI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Gráficos de Tareas TI
          </CardTitle>
          <CardDescription>
            Establece qué gráficos estarán disponibles para los reportes de tareas de TI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { key: 'byStatus', label: 'Por Estado' },
              { key: 'byPriority', label: 'Por Prioridad' },
              { key: 'byAreas', label: 'Por Áreas' },
              { key: 'byCategories', label: 'Por Categorías' },
              { key: 'byProductivity', label: 'Por Productividad' },
              { key: 'byPending', label: 'Gráfico Pendientes' },
              { key: 'ganttChart', label: 'Diagrama de Gantt' }
            ].map(({ key, label }) => (
              <div key={key} className="space-y-3 p-3 rounded-lg border bg-card">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      id={`ti-${key}`}
                      checked={localConfig.tiTaskCharts[key as keyof GeneralReportConfig['tiTaskCharts']].enabled}
                      onCheckedChange={(value) => updateTiTaskChart(key as keyof GeneralReportConfig['tiTaskCharts'], value)}
                    />
                    <Label htmlFor={`ti-${key}`} className="text-sm font-medium">{label}</Label>
                  </div>
                  {key !== 'ganttChart' && localConfig.tiTaskCharts[key as keyof GeneralReportConfig['tiTaskCharts']].enabled && (
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={(localConfig.tiTaskCharts[key as keyof GeneralReportConfig['tiTaskCharts']] as ChartConfig).type}
                        onValueChange={(value: ChartType) => updateTiTaskChartType(key as keyof GeneralReportConfig['tiTaskCharts'], value)}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pie">Circular</SelectItem>
                          <SelectItem value="bar">Barras</SelectItem>
                          <SelectItem value="area">Área</SelectItem>
                          <SelectItem value="line">Línea</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {key !== 'ganttChart' && localConfig.tiTaskCharts[key as keyof GeneralReportConfig['tiTaskCharts']].enabled && (
                  <div className="flex items-center gap-3 pl-8">
                    <Switch
                      id={`ti-${key}-daterange`}
                      checked={(localConfig.tiTaskCharts[key as keyof GeneralReportConfig['tiTaskCharts']] as ChartConfig).dateRange}
                      onCheckedChange={(value) => updateTiTaskChartDateRange(key as keyof GeneralReportConfig['tiTaskCharts'], value)}
                    />
                    <Label htmlFor={`ti-${key}-daterange`} className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Abcisas por rango de fechas
                    </Label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {!hasValidConfiguration() && (
          <p className="text-sm text-muted-foreground text-center">
            Selecciona al menos un filtro o gráfico para guardar la configuración
          </p>
        )}
        <Button 
          onClick={saveConfig} 
          disabled={isSaving || loading || !hasValidConfiguration()} 
          className="w-full"
        >
          {isSaving ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </div>
    </div>
  );
};