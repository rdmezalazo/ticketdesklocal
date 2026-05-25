import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Bell, Plus, Trash2, UserPlus, Ticket, PauseCircle, PlayCircle, EyeOff } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NotificationSetting {
  key: string;
  label: string;
  description: string;
}

const ticketNotificationSettings: NotificationSetting[] = [
  {
    key: "email_notifications_ticket_created",
    label: "Nuevo Ticket Creado",
    description: "Enviar notificación cuando se crea un nuevo ticket"
  },
  {
    key: "email_notifications_ticket_updated", 
    label: "Ticket Actualizado",
    description: "Enviar notificación cuando se actualiza un ticket"
  },
  {
    key: "email_notifications_activity_added",
    label: "Actividad Agregada", 
    description: "Enviar notificación cuando se agrega una nueva actividad"
  },
  {
    key: "email_notifications_activity_completed",
    label: "Actividad Completada",
    description: "Enviar notificación cuando se completa una actividad"
  },
  {
    key: "email_notifications_ticket_status_changed",
    label: "Estado del Ticket Cambiado",
    description: "Enviar notificación cuando cambia el estado del ticket"
  },
  {
    key: "email_notifications_ticket_resolved",
    label: "Ticket Resuelto",
    description: "Enviar notificación cuando el ticket se marca como resuelto"
  }
];

const tiTaskNotificationSettings: NotificationSetting[] = [
  {
    key: "email_notifications_ti_task_created",
    label: "Nueva Tarea de TI Creada",
    description: "Enviar notificación cuando se crea una nueva tarea de TI"
  },
  {
    key: "email_notifications_ti_task_activity_added",
    label: "Actividad Agregada",
    description: "Enviar notificación cuando se agrega una actividad a una tarea de TI"
  },
  {
    key: "email_notifications_ti_task_activity_completed",
    label: "Actividad Completada",
    description: "Enviar notificación cuando se completa una actividad de tarea de TI"
  },
  {
    key: "email_notifications_ti_task_resolved",
    label: "Tarea Resuelta",
    description: "Enviar notificación cuando una tarea de TI se marca como resuelta"
  }
];

export function EmailNotificationSettings() {
  const { 
    appSettings, 
    getSettingValue, 
    updateAppSetting,
    notificationRecipients,
    createNotificationRecipient,
    updateNotificationRecipient,
    deleteNotificationRecipient
  } = useSettings();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [newRecipientName, setNewRecipientName] = useState("");
  const [isAddingRecipient, setIsAddingRecipient] = useState(false);
  const [recipientToDelete, setRecipientToDelete] = useState<string | null>(null);

  useEffect(() => {
    const newSettings: Record<string, boolean> = {};
    [...ticketNotificationSettings, ...tiTaskNotificationSettings].forEach(setting => {
      newSettings[setting.key] = getSettingValue(setting.key, true);
    });
    setSettings(newSettings);
  }, [appSettings, getSettingValue]);

  const handleToggleSetting = async (key: string, enabled: boolean) => {
    try {
      await updateAppSetting(key, enabled);
      setSettings(prev => ({ ...prev, [key]: enabled }));
      
      toast({
        title: "Configuración actualizada",
        description: `Las notificaciones por correo han sido ${enabled ? 'habilitadas' : 'deshabilitadas'}.`,
      });
    } catch (error) {
      console.error('Error updating email notification setting:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración.",
        variant: "destructive",
      });
    }
  };

  const handleAddRecipient = async () => {
    if (!newRecipientEmail.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un correo electrónico.",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(newRecipientEmail)) {
      toast({
        title: "Error",
        description: "Por favor ingresa un correo electrónico válido.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingRecipient(true);
    try {
      await createNotificationRecipient({
        email: newRecipientEmail.trim(),
        full_name: newRecipientName.trim() || undefined
      });
      
      setNewRecipientEmail("");
      setNewRecipientName("");
      
      toast({
        title: "Destinatario agregado",
        description: "El destinatario ha sido agregado exitosamente.",
      });
    } catch (error) {
      console.error('Error adding recipient:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el destinatario. Puede que el correo ya esté registrado.",
        variant: "destructive",
      });
    } finally {
      setIsAddingRecipient(false);
    }
  };

  const handleDeleteRecipient = async (id: string) => {
    try {
      await deleteNotificationRecipient(id);
      setRecipientToDelete(null);
      
      toast({
        title: "Destinatario eliminado",
        description: "El destinatario ha sido eliminado exitosamente.",
      });
    } catch (error) {
      console.error('Error deleting recipient:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el destinatario.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateNotificationRecipient(id, { active: !currentActive });
      
      toast({
        title: currentActive ? "Destinatario suspendido" : "Destinatario activado",
        description: currentActive 
          ? "Este destinatario no recibirá notificaciones temporalmente."
          : "Este destinatario volverá a recibir notificaciones.",
      });
    } catch (error) {
      console.error('Error toggling recipient active status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del destinatario.",
        variant: "destructive",
      });
    }
  };

  const handleToggleBcc = async (id: string, currentBcc: boolean) => {
    try {
      await updateNotificationRecipient(id, { is_bcc: !currentBcc });
      
      toast({
        title: currentBcc ? "CCO desactivado" : "CCO activado",
        description: currentBcc
          ? "Este destinatario será visible en las notificaciones."
          : "Este destinatario estará en copia oculta (CCO).",
      });
    } catch (error) {
      console.error('Error toggling recipient BCC status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado CCO del destinatario.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Notificaciones de Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Notificaciones de Tickets
          </CardTitle>
          <CardDescription>
            Configura cuándo enviar notificaciones por correo para eventos de tickets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {ticketNotificationSettings.map((setting, index) => (
              <div key={setting.key}>
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label htmlFor={setting.key} className="text-base font-medium">
                      {setting.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {setting.description}
                    </p>
                  </div>
                  <Switch
                    id={setting.key}
                    checked={settings[setting.key] || false}
                    onCheckedChange={(checked) => handleToggleSetting(setting.key, checked)}
                  />
                </div>
                {index < ticketNotificationSettings.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notificaciones de Tareas de TI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones de Tareas de TI
          </CardTitle>
          <CardDescription>
            Configura cuándo enviar notificaciones por correo para eventos de tareas de TI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {tiTaskNotificationSettings.map((setting, index) => (
              <div key={setting.key}>
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label htmlFor={setting.key} className="text-base font-medium">
                      {setting.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {setting.description}
                    </p>
                  </div>
                  <Switch
                    id={setting.key}
                    checked={settings[setting.key] || false}
                    onCheckedChange={(checked) => handleToggleSetting(setting.key, checked)}
                  />
                </div>
                {index < tiTaskNotificationSettings.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <div className="flex items-start gap-2">
              <Bell className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-500">Información importante:</p>
                <p className="text-muted-foreground mt-1">
                  Las notificaciones de tareas de TI incluirán siempre un cuadro detallado con todas las actividades,
                  mostrando número, descripción, fecha planificada, progreso y estado con colores distintivos.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Destinatarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Lista de Destinatarios para poner en conocimiento
          </CardTitle>
          <CardDescription>
            Correos adicionales que recibirán las notificaciones habilitadas, junto con el Administrador y el solicitante del ticket
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Formulario para agregar destinatario */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="recipient-email">Correo Electrónico *</Label>
                <Input
                  id="recipient-email"
                  type="email"
                  placeholder="ejemplo@empresa.com"
                  value={newRecipientEmail}
                  onChange={(e) => setNewRecipientEmail(e.target.value)}
                  disabled={isAddingRecipient}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="recipient-name">Nombre (Opcional)</Label>
                <Input
                  id="recipient-name"
                  type="text"
                  placeholder="Nombre completo"
                  value={newRecipientName}
                  onChange={(e) => setNewRecipientName(e.target.value)}
                  disabled={isAddingRecipient}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleAddRecipient}
                  disabled={isAddingRecipient}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Lista de destinatarios */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Destinatarios Actuales</Label>
            {notificationRecipients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay destinatarios adicionales configurados</p>
                <p className="text-sm">Agrega correos electrónicos para notificaciones</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notificationRecipients.map((recipient) => (
                  <div
                    key={recipient.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{recipient.full_name || "Sin nombre"}</p>
                        {!recipient.active && (
                          <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded-full border border-orange-500/20">
                            Suspendido
                          </span>
                        )}
                        {recipient.is_bcc && (
                          <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-full border border-blue-500/20">
                            CCO
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{recipient.email}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(recipient.id, recipient.active)}
                        className={recipient.active ? "text-orange-500 hover:text-orange-600 hover:bg-orange-500/10" : "text-green-500 hover:text-green-600 hover:bg-green-500/10"}
                        title={recipient.active ? "Suspender notificaciones" : "Activar notificaciones"}
                      >
                        {recipient.active ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleBcc(recipient.id, recipient.is_bcc)}
                        className={recipient.is_bcc ? "text-blue-500 hover:text-blue-600 hover:bg-blue-500/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}
                        title={recipient.is_bcc ? "Quitar de CCO" : "Poner en CCO"}
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRecipientToDelete(recipient.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Eliminar destinatario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-500">Información de envío:</p>
                <p className="text-muted-foreground mt-1">
                  Cuando una notificación esté habilitada, se enviará a:<br />
                  • Usuario Administrador de TI<br />
                  • Usuario que creó el ticket<br />
                  • Todos los destinatarios de esta lista
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={!!recipientToDelete} onOpenChange={() => setRecipientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar destinatario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará al destinatario de la lista de notificaciones. 
              Ya no recibirá correos de notificación del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => recipientToDelete && handleDeleteRecipient(recipientToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}