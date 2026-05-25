import { useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { Home, Ticket, BarChart3, Settings, Users, Bell, Headphones, MessageCircle, Wrench, FileText, Monitor, CalendarCheck, Paperclip } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
const menuItems = [{
  title: "Dashboard",
  url: "/",
  icon: Home,
  permission: "dashboard"
}, {
  title: "Chat de Soporte",
  url: "/chatsupport",
  icon: MessageCircle,
  permission: "chatsupport"
}, {
  title: "Tareas de TI",
  url: "/ti-tasks",
  icon: Wrench,
  permission: "ti-tasks"
}, {
  title: "Tickets",
  url: "/tickets",
  icon: Ticket,
  permission: "tickets"
}, {
  title: "Inventario",
  url: "/inventario",
  icon: Monitor,
  permission: "inventario"
}, {
  title: "Equipos Asignados",
  url: "/equipment-assignments",
  icon: Monitor,
  permission: "equipment-assignments"
}, {
  title: "Plan de Mantenimiento",
  url: "/maintenance-plan",
  icon: CalendarCheck,
  permission: "maintenance-plan"
}, {
  title: "Reportes de Gestión",
  url: "/datareports",
  icon: BarChart3,
  permission: "reports"
}, {
  title: "Configuración de Formatos de TI",
  url: "/report-designer",
  icon: FileText,
  permission: "report-designer"
}, {
  title: "Usuarios",
  url: "/users",
  icon: Users,
  permission: "users"
}, {
  title: "Notificaciones",
  url: "/notifications",
  icon: Bell,
  permission: "notifications"
}, {
  title: "Configuración",
  url: "/settings",
  icon: Settings,
  permission: "settings"
}];
export function AppSidebar() {
  const {
    state
  } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const {
    hasAccess,
    loading
  } = useUserPermissions();

  // Filtrar elementos del menú basados en permisos
  const visibleMenuItems = menuItems.filter(item => loading || hasAccess(item.permission));
  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({
    isActive
  }: {
    isActive: boolean;
  }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`;
  return <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-primary rounded-lg">
            <Headphones className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && <div>
              <h2 className="font-semibold text-sidebar-foreground">TicketDesk</h2>
              <p className="text-xs text-sidebar-foreground/70">Sistema de Gestión</p>
            </div>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className={getNavCls}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>;
}