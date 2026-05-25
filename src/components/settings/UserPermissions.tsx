import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Check, X } from "lucide-react";

interface User {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  area: string;
}

const availablePages = [
  { slug: 'dashboard', name: 'Dashboard', description: 'Página principal del sistema' },
  { slug: 'users', name: 'Usuarios', description: 'Gestión de usuarios del sistema' },
  { slug: 'ti-tasks', name: 'Tareas TI', description: 'Gestión de tareas internas de TI' },
  { slug: 'tickets', name: 'Tickets y Soporte', description: 'Gestión de tickets de soporte y mesa de ayuda' },
  { slug: 'chatsupport', name: 'Chat de Soporte', description: 'Chat en tiempo real con usuarios' },
  { slug: 'inventario', name: 'Inventario', description: 'Gestión de inventarios y equipos de cómputo' },
  { slug: 'equipment-assignments', name: 'Equipos Asignados', description: 'Gestión de asignación y devolución de equipos a trabajadores' },
  { slug: 'maintenance-plan', name: 'Plan de Mantenimiento', description: 'Programación y seguimiento del plan de mantenimiento de equipos' },
  { slug: 'reports', name: 'Reportes', description: 'Visualización de reportes y estadísticas del sistema' },
  { slug: 'datareports', name: 'Reportes de Gestión', description: 'Análisis detallado de tickets y tareas de TI' },
  { slug: 'report-designer', name: 'Configuración de Formatos de TI', description: 'Diseño y personalización de plantillas de reportes' },
  { slug: 'settings', name: 'Configuración', description: 'Configuraciones del sistema' },
];

export function UserPermissions() {
  const { loading, userPermissions, updateUserPermissions } = useSettings();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [userPerms, setUserPerms] = useState<{ [key: string]: boolean }>({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, role, area')
          .eq('active', true)
          .order('full_name');

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Update user permissions when selected user changes
  useEffect(() => {
    if (selectedUser && userPermissions) {
      const permissions: { [key: string]: boolean } = {};
      
      availablePages.forEach(page => {
        const permission = userPermissions.find(
          p => p.user_id === selectedUser && p.page_slug === page.slug
        );
        permissions[page.slug] = permission?.can_access || false;
      });
      
      setUserPerms(permissions);
    }
  }, [selectedUser, userPermissions]);

  const handlePermissionChange = (pageSlug: string, canAccess: boolean) => {
    setUserPerms(prev => ({ ...prev, [pageSlug]: canAccess }));
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const permissions = Object.entries(userPerms).map(([page_slug, can_access]) => ({
        page_slug,
        can_access
      }));

      await updateUserPermissions(selectedUser, permissions);
    } catch (error) {
      console.error('Error saving permissions:', error);
    } finally {
      setSaving(false);
    }
  };

  const getPermissionsSummary = (userId: string) => {
    const userPermissionsCount = userPermissions.filter(
      p => p.user_id === userId && p.can_access
    ).length;
    return `${userPermissionsCount}/${availablePages.length} páginas`;
  };

  if (loading || loadingUsers) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const selectedUserData = users.find(u => u.user_id === selectedUser);

  return (
    <div className="space-y-6">
      {/* User Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Seleccionar Usuario
          </CardTitle>
          <CardDescription>
            Elige un usuario para gestionar sus permisos de acceso a las páginas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <span className="font-medium">{user.full_name}</span>
                        <span className="text-sm text-muted-foreground ml-2">({user.email})</span>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant="outline">{user.role}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {getPermissionsSummary(user.user_id)}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedUserData && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedUserData.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedUserData.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{selectedUserData.role}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{selectedUserData.area}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Configuration */}
      {selectedUser && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permisos de Acceso
              </CardTitle>
              <CardDescription>
                Configura a qué páginas puede acceder este usuario
              </CardDescription>
            </div>
            <Button onClick={handleSavePermissions} disabled={saving}>
              {saving ? "Guardando..." : "Guardar Permisos"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availablePages.map((page) => (
                <div key={page.slug} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`page-${page.slug}`} className="font-medium">
                        {page.name}
                      </Label>
                      {userPerms[page.slug] ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {page.description}
                    </p>
                  </div>
                  <Switch
                    id={`page-${page.slug}`}
                    checked={userPerms[page.slug] || false}
                    onCheckedChange={(checked) => handlePermissionChange(page.slug, checked)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Permissions Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Permisos</CardTitle>
          <CardDescription>
            Vista general de los permisos de todos los usuarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.user_id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-sm">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{user.role}</Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{getPermissionsSummary(user.user_id)}</p>
                  <p className="text-xs text-muted-foreground">{user.area}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}