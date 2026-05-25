import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Edit, Clock, Users, Send } from "lucide-react";
import { useAutomaticReports } from "@/hooks/useAutomaticReports";
import { useToast } from "@/hooks/use-toast";

export function AutomaticReportSettings() {
  const { configs, sentHistory, loading, createConfig, updateConfig, deleteConfig, testReportSend } = useAutomaticReports();
  const { toast } = useToast();
  const [testingConfigId, setTestingConfigId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    report_type: "both" as "tickets" | "ti_tasks" | "both",
    recipient_emails: "",
    work_start_time: "08:00",
    work_end_time: "18:00",
    frequency: "daily" as "daily" | "weekly" | "monthly",
    period_type: "daily" as "daily" | "weekly" | "monthly" | "date_range",
    start_date: "",
    end_date: "",
    send_time: "18:00",
    is_active: true,
    include_status_filter: true,
    include_priority_filter: true,
    include_category_filter: true,
    include_assignee_filter: false,
    include_area_filter: false,
    include_charts: true,
    include_summary: true
  });

  const resetForm = () => {
    setFormData({
      name: "",
      report_type: "both",
      recipient_emails: "",
      work_start_time: "08:00",
      work_end_time: "18:00",
      frequency: "daily",
      period_type: "daily",
      start_date: "",
      end_date: "",
      send_time: "18:00",
      is_active: true,
      include_status_filter: true,
      include_priority_filter: true,
      include_category_filter: true,
      include_assignee_filter: false,
      include_area_filter: false,
      include_charts: true,
      include_summary: true
    });
    setEditingConfig(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate emails
    const emailArray = formData.recipient_emails.split(',').map(email => email.trim()).filter(email => email);
    if (emailArray.length === 0) {
      toast({
        title: "Error",
        description: "Debe agregar al menos un email destinatario",
        variant: "destructive"
      });
      return;
    }

    // Validate dates if period_type is date_range
    if (formData.period_type === 'date_range') {
      if (!formData.start_date || !formData.end_date) {
        toast({
          title: "Error",
          description: "Las fechas de inicio y fin son requeridas para reportes de rango personalizado",
          variant: "destructive"
        });
        return;
      }
      
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        toast({
          title: "Error",
          description: "La fecha de inicio no puede ser mayor que la fecha de fin",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const configData = {
        ...formData,
        recipient_emails: emailArray,
        // Only include dates if period_type is 'date_range', otherwise set to null
        start_date: formData.period_type === 'date_range' && formData.start_date ? formData.start_date : null,
        end_date: formData.period_type === 'date_range' && formData.end_date ? formData.end_date : null
      };

      if (editingConfig) {
        await updateConfig(editingConfig.id, configData);
      } else {
        await createConfig(configData);
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleEdit = (config: any) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      report_type: config.report_type,
      recipient_emails: config.recipient_emails.join(', '),
      work_start_time: config.work_start_time,
      work_end_time: config.work_end_time,
      frequency: config.frequency || 'daily',
      period_type: config.period_type || 'daily',
      start_date: config.start_date || '',
      end_date: config.end_date || '',
      send_time: config.send_time || '18:00',
      is_active: config.is_active,
      include_status_filter: config.include_status_filter ?? true,
      include_priority_filter: config.include_priority_filter ?? true,
      include_category_filter: config.include_category_filter ?? true,
      include_assignee_filter: config.include_assignee_filter ?? false,
      include_area_filter: config.include_area_filter ?? false,
      include_charts: config.include_charts ?? true,
      include_summary: config.include_summary ?? true
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta configuración?')) {
      await deleteConfig(id);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES');
  };

  const handleTestReport = async (configId: string) => {
    setTestingConfigId(configId);
    try {
      await testReportSend(configId);
      toast({
        title: "Éxito",
        description: "Reporte de prueba enviado correctamente",
      });
    } catch (error) {
      console.error('Error sending test report:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el reporte de prueba",
        variant: "destructive"
      });
    } finally {
      setTestingConfigId(null);
    }
  };

  if (loading) {
    return <div>Cargando configuraciones de reportes...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Existing Configurations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Configuraciones de Reportes Automáticos</CardTitle>
            <CardDescription>
              Gestiona el envío automático de reportes al final de cada jornada laboral
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Configuración
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingConfig ? 'Editar Configuración' : 'Nueva Configuración de Reporte'}
                </DialogTitle>
                <DialogDescription>
                  Configure el envío automático de reportes con diferentes frecuencias y rangos de fecha
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre de la Configuración</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Reporte Diario Gerencia"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="report_type">Tipo de Reporte</Label>
                    <Select value={formData.report_type} onValueChange={(value: any) => setFormData({ ...formData, report_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tickets">Solo Tickets</SelectItem>
                        <SelectItem value="ti_tasks">Solo Tareas TI</SelectItem>
                        <SelectItem value="both">Tickets y Tareas TI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="frequency">Frecuencia de Envío</Label>
                    <Select value={formData.frequency} onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diario</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="period_type">Período del Reporte</Label>
                    <Select value={formData.period_type} onValueChange={(value: any) => setFormData({ ...formData, period_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diario</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                        <SelectItem value="date_range">Rango de Fechas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.period_type === 'date_range' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_date">Fecha de Inicio</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required={formData.period_type === 'date_range'}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_date">Fecha de Fin</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        required={formData.period_type === 'date_range'}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="emails">Emails Destinatarios</Label>
                  <Textarea
                    id="emails"
                    value={formData.recipient_emails}
                    onChange={(e) => setFormData({ ...formData, recipient_emails: e.target.value })}
                    placeholder="gerencia@empresa.com, supervisor@empresa.com"
                    className="min-h-[100px]"
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Separe múltiples emails con comas
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="send_time">Hora de Envío</Label>
                    <Input
                      id="send_time"
                      type="time"
                      value={formData.send_time}
                      onChange={(e) => setFormData({ ...formData, send_time: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="start_time">Hora de Inicio de Jornada</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.work_start_time}
                      onChange={(e) => setFormData({ ...formData, work_start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">Hora de Fin de Jornada</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.work_end_time}
                      onChange={(e) => setFormData({ ...formData, work_end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Filtros del Reporte</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Selecciona qué información incluir en el reporte
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="include_summary"
                          checked={formData.include_summary}
                          onCheckedChange={(checked) => setFormData({ ...formData, include_summary: checked })}
                        />
                        <Label htmlFor="include_summary">Incluir Resumen</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="include_charts"
                          checked={formData.include_charts}
                          onCheckedChange={(checked) => setFormData({ ...formData, include_charts: checked })}
                        />
                        <Label htmlFor="include_charts">Incluir Gráficos</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="include_status_filter"
                          checked={formData.include_status_filter}
                          onCheckedChange={(checked) => setFormData({ ...formData, include_status_filter: checked })}
                        />
                        <Label htmlFor="include_status_filter">Filtro por Estado</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="include_priority_filter"
                          checked={formData.include_priority_filter}
                          onCheckedChange={(checked) => setFormData({ ...formData, include_priority_filter: checked })}
                        />
                        <Label htmlFor="include_priority_filter">Filtro por Prioridad</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="include_category_filter"
                          checked={formData.include_category_filter}
                          onCheckedChange={(checked) => setFormData({ ...formData, include_category_filter: checked })}
                        />
                        <Label htmlFor="include_category_filter">Filtro por Categoría</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="include_assignee_filter"
                          checked={formData.include_assignee_filter}
                          onCheckedChange={(checked) => setFormData({ ...formData, include_assignee_filter: checked })}
                        />
                        <Label htmlFor="include_assignee_filter">Filtro por Asignado</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="include_area_filter"
                          checked={formData.include_area_filter}
                          onCheckedChange={(checked) => setFormData({ ...formData, include_area_filter: checked })}
                        />
                        <Label htmlFor="include_area_filter">Filtro por Área</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Configuración Activa</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingConfig ? 'Actualizar' : 'Crear'} Configuración
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay configuraciones de reportes automáticos.
              <br />
              Crea una nueva configuración para comenzar.
            </div>
          ) : (
            <div className="space-y-4">
              {configs.map((config) => (
                <Card key={config.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{config.name}</h4>
                          <Badge variant={config.is_active ? "default" : "secondary"}>
                            {config.is_active ? "Activa" : "Inactiva"}
                          </Badge>
                          <Badge variant="outline">
                            {config.report_type === 'both' ? 'Tickets y TI' : 
                             config.report_type === 'tickets' ? 'Solo Tickets' : 'Solo TI'}
                          </Badge>
                        </div>
                        
                         <div className="flex items-center gap-4 text-sm text-muted-foreground">
                           <div className="flex items-center gap-1">
                             <Clock className="h-3 w-3" />
                             Envío: {config.send_time || '18:00'}
                           </div>
                           <div className="flex items-center gap-1">
                             <Clock className="h-3 w-3" />
                             Jornada: {config.work_start_time} - {config.work_end_time}
                           </div>
                           <div className="flex items-center gap-1">
                             <Users className="h-3 w-3" />
                             {config.recipient_emails.length} destinatario(s)
                           </div>
                         </div>

                         <div className="flex items-center gap-2 text-sm">
                           <Badge variant="secondary">
                             Frecuencia: {config.frequency === 'daily' ? 'Diario' : 
                                        config.frequency === 'weekly' ? 'Semanal' : 'Mensual'}
                           </Badge>
                           <Badge variant="secondary">
                             Período: {config.period_type === 'daily' ? 'Diario' : 
                                      config.period_type === 'weekly' ? 'Semanal' : 
                                      config.period_type === 'monthly' ? 'Mensual' : 'Rango personalizado'}
                           </Badge>
                         </div>

                        <div className="text-sm text-muted-foreground">
                          <strong>Destinatarios:</strong> {config.recipient_emails.join(', ')}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestReport(config.id)}
                          disabled={testingConfigId === config.id || !config.is_active}
                        >
                          <Send className="h-4 w-4" />
                          {testingConfigId === config.id ? 'Enviando...' : 'Probar'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(config)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(config.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sent Reports History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Reportes Enviados</CardTitle>
          <CardDescription>
            Últimos reportes enviados automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sentHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay reportes enviados aún.
            </div>
          ) : (
            <div className="space-y-2">
              {sentHistory.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{report.email_subject || `Reporte ${report.report_type}`}</div>
                    <div className="text-sm text-muted-foreground">
                      Enviado a: {report.recipient_emails.join(', ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      <Badge variant={report.email_status === 'sent' ? 'default' : 'destructive'}>
                        {report.email_status === 'sent' ? 'Enviado' : 'Error'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(report.sent_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
