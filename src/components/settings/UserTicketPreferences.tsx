import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { User, Settings2, Eye, BarChart3 } from "lucide-react";

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  dashboard_show_all_tickets: boolean;
  page_show_all_tickets: boolean;
}

export function UserTicketPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshPreferences } = useUserPreferences();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId && users.length > 0) {
      const user = users.find(u => u.user_id === selectedUserId);
      setSelectedUser(user || null);
    }
  }, [selectedUserId, users]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, dashboard_show_all_tickets, page_show_all_tickets')
        .eq('active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
      
      // Select current user by default if available
      if (user && data?.some(u => u.user_id === user.id)) {
        setSelectedUserId(user.id);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = async (field: 'dashboard_show_all_tickets' | 'page_show_all_tickets', value: boolean) => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('user_id', selectedUser.user_id);

      if (error) throw error;

      // Update local state
      const updatedUser = { ...selectedUser, [field]: value };
      setSelectedUser(updatedUser);
      setUsers(users.map(u => u.user_id === selectedUser.user_id ? updatedUser : u));

      toast({
        title: "Configuración actualizada",
        description: "Las preferencias del usuario han sido guardadas correctamente",
      });

      // Refresh user preferences if we're updating the current user
      if (selectedUser.user_id === user?.id) {
        refreshPreferences();
      }
    } catch (error) {
      console.error('Error updating user preferences:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16" />
        <Skeleton className="h-32" />
      </div>
    );
  }

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
            Elige el usuario para configurar sus preferencias de visualización de tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un usuario..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.user_id} value={user.user_id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.full_name}</span>
                    <span className="text-sm text-muted-foreground">{user.email}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* User Preferences */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Preferencias de Tickets para {selectedUser.full_name}
            </CardTitle>
            <CardDescription>
              Configura qué tickets puede ver este usuario en el dashboard y en la página principal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dashboard Preference */}
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-start space-x-3 flex-1">
                <div className="mt-1">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dashboard-all-tickets" className="text-sm font-medium">
                    Mostrar todos los tickets en el dashboard
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Si está habilitado, el usuario verá estadísticas de todos los tickets en el dashboard. 
                    Si está deshabilitado, solo verá estadísticas de sus propios tickets.
                  </p>
                </div>
              </div>
              <Switch
                id="dashboard-all-tickets"
                checked={selectedUser.dashboard_show_all_tickets}
                onCheckedChange={(checked) => handlePreferenceChange('dashboard_show_all_tickets', checked)}
                disabled={saving}
              />
            </div>

            {/* Page Preference */}
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-start space-x-3 flex-1">
                <div className="mt-1">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="page-all-tickets" className="text-sm font-medium">
                    Mostrar todos los tickets en la página
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Si está habilitado, el usuario verá todos los tickets en las vistas de la página. 
                    Si está deshabilitado, solo verá sus propios tickets creados.
                  </p>
                </div>
              </div>
              <Switch
                id="page-all-tickets"
                checked={selectedUser.page_show_all_tickets}
                onCheckedChange={(checked) => handlePreferenceChange('page_show_all_tickets', checked)}
                disabled={saving}
              />
            </div>

            {/* Status Summary */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Resumen de configuración actual:</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Dashboard:</span>
                  <span className={selectedUser.dashboard_show_all_tickets ? "text-green-600" : "text-orange-600"}>
                    {selectedUser.dashboard_show_all_tickets ? "Todos los tickets" : "Solo sus tickets"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Página:</span>
                  <span className={selectedUser.page_show_all_tickets ? "text-green-600" : "text-orange-600"}>
                    {selectedUser.page_show_all_tickets ? "Todos los tickets" : "Solo sus tickets"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}