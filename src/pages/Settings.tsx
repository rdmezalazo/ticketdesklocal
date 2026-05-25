import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Settings as SettingsIcon, 
  MessageCircle, 
  Ticket, 
  Users, 
  Palette, 
  Shield, 
  Eye, 
  UserCog, 
  Mail, 
  FileText, 
  Laptop,
  Monitor,
  Menu,
  X 
} from "lucide-react";
import { ChatSettings } from "@/components/settings/ChatSettings";
import { TicketSettings } from "@/components/settings/TicketSettings";
import { TiTaskSettings } from "@/components/settings/TiTaskSettings";
import { SystemAreasSettings } from "@/components/settings/SystemAreasSettings";
import { UserPermissions } from "@/components/settings/UserPermissions";
import { ViewSettings } from "@/components/settings/ViewSettings";
import { UserTicketPreferences } from "@/components/settings/UserTicketPreferences";
import { EmailNotificationSettings } from "@/components/settings/EmailNotificationSettings";
import { AutomaticReportSettings } from "@/components/settings/AutomaticReportSettings";
import { GeneralReportSettings } from "@/components/settings/GeneralReportSettings";
import { EquipmentAssignmentSettings } from "@/components/settings/EquipmentAssignmentSettings";

type SettingsSection = 
  | 'general'
  | 'chat'
  | 'tickets'
  | 'titasks'
  | 'areas'
  | 'equipment'
  | 'email'
  | 'reports'
  | 'views'
  | 'preferences'
  | 'users';

interface SettingsMenuItem {
  id: SettingsSection;
  label: string;
  icon: any;
  description: string;
}

const settingsMenuItems: SettingsMenuItem[] = [
  {
    id: 'general',
    label: 'General',
    icon: SettingsIcon,
    description: 'Configuración general del sistema'
  },
  {
    id: 'chat',
    label: 'Chat de Soporte',
    icon: MessageCircle,
    description: 'Configuración del chat de soporte'
  },
  {
    id: 'tickets',
    label: 'Tickets',
    icon: Ticket,
    description: 'Configuración de tickets'
  },
  {
    id: 'titasks',
    label: 'Tareas TI',
    icon: Laptop,
    description: 'Configuración de tareas de TI'
  },
  {
    id: 'areas',
    label: 'Áreas',
    icon: Palette,
    description: 'Configuración de áreas del sistema'
  },
  {
    id: 'equipment',
    label: 'Asignación Equipos',
    icon: Monitor,
    description: 'Motivos de asignación y devolución'
  },
  {
    id: 'email',
    label: 'Notificaciones',
    icon: Mail,
    description: 'Configuración de notificaciones por email'
  },
  {
    id: 'reports',
    label: 'Reportes',
    icon: FileText,
    description: 'Configuración de reportes automáticos'
  },
  {
    id: 'views',
    label: 'Vistas',
    icon: Eye,
    description: 'Configuración de vistas del sistema'
  },
  {
    id: 'preferences',
    label: 'Preferencias',
    icon: UserCog,
    description: 'Preferencias de usuario'
  },
  {
    id: 'users',
    label: 'Usuarios',
    icon: Users,
    description: 'Gestión de permisos de usuario'
  }
];

export default function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeMenuItem = settingsMenuItems.find(item => item.id === activeSection);

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return <GeneralReportSettings />;
      
      case 'chat':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Configuración del Chat de Soporte
              </CardTitle>
              <CardDescription>
                Configura las opciones de archivos adjuntos y funcionalidades del chat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChatSettings />
            </CardContent>
          </Card>
        );
      
      case 'tickets':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Configuración de Tickets
              </CardTitle>
              <CardDescription>
                Gestiona categorías, prioridades y estados de los tickets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TicketSettings />
            </CardContent>
          </Card>
        );
      
      case 'titasks':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Laptop className="h-5 w-5" />
                Configuración de Tareas TI
              </CardTitle>
              <CardDescription>
                Gestiona categorías, prioridades y estados de las tareas de TI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TiTaskSettings />
            </CardContent>
          </Card>
        );
      
      case 'areas':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Configuración de Áreas del Sistema
              </CardTitle>
              <CardDescription>
                Gestiona las áreas disponibles para tickets y tareas TI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SystemAreasSettings />
            </CardContent>
          </Card>
        );
      
      case 'equipment':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Configuración de Asignación de Equipos
              </CardTitle>
              <CardDescription>
                Gestiona los motivos de asignación y devolución de equipos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EquipmentAssignmentSettings />
            </CardContent>
          </Card>
        );
      
      case 'email':
        return <EmailNotificationSettings />;
      
      case 'reports':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Configuración de Reportes Automáticos
              </CardTitle>
              <CardDescription>
                Configura el envío automático de reportes diarios a contactos de gerencia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AutomaticReportSettings />
            </CardContent>
          </Card>
        );
      
      case 'views':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Configuración de Vistas
              </CardTitle>
              <CardDescription>
                Controla qué vistas estarán disponibles para tickets y tareas TI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ViewSettings />
            </CardContent>
          </Card>
        );
      
      case 'preferences':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Preferencias de Usuario
              </CardTitle>
              <CardDescription>
                Configura las preferencias de visualización de tickets para cada usuario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserTicketPreferences />
            </CardContent>
          </Card>
        );
      
      case 'users':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permisos de Usuario
              </CardTitle>
              <CardDescription>
                Establece qué páginas puede ver cada usuario del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserPermissions />
            </CardContent>
          </Card>
        );
      
      default:
        return <GeneralReportSettings />;
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside className={cn(
        "bg-background border-r transition-all duration-300 flex-shrink-0",
        sidebarCollapsed ? "w-16" : "w-80"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-primary rounded-lg">
                  <SettingsIcon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Configuración</h2>
                  <p className="text-sm text-muted-foreground">Sistema</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-8 w-8 p-0"
            >
              {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Sidebar Menu */}
        <nav className="p-2 space-y-1">
          {settingsMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground font-medium" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.label}</div>
                    <div className="text-xs opacity-75 truncate">{item.description}</div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Content Header */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-primary rounded-lg">
              {activeMenuItem && <activeMenuItem.icon className="h-6 w-6 text-primary-foreground" />}
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {activeMenuItem?.label || 'Configuración del Sistema'}
              </h1>
              <p className="text-muted-foreground">
                {activeMenuItem?.description || 'Gestiona los parámetros y configuraciones del sistema'}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}