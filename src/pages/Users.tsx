import { useState, useEffect } from "react";
import { Users as UsersIcon, Grid, Table, Search, UserPlus, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserTable } from "@/components/UserTable";
import { UserCards } from "@/components/UserCards";
import { EditUserModal } from "@/components/EditUserModal";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserPermissions } from "@/hooks/useUserPermissions";

export interface User {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  area: string;
  cargo?: string;
  sede: string;
  role: "usuario" | "gerencia" | "ti";
  active: boolean;
  avatar_url: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const { toast } = useToast();
  const { hasAnyAccess } = useUserPermissions();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setUsers(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los usuarios",
      });
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(user => 
        user.user_id === userId 
          ? { ...user, active: !currentStatus }
          : user
      ));

      toast({
        title: "Usuario actualizado",
        description: `Usuario ${!currentStatus ? 'activado' : 'suspendido'} correctamente`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado del usuario",
      });
      console.error('Error toggling user status:', error);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (updatedUser: Partial<User>) => {
    if (!selectedUser) return;

    try {
      // Use the secure database function instead of direct table update
      const { data, error } = await supabase.rpc('update_user_profile', {
        target_user_id: selectedUser.user_id,
        new_full_name: updatedUser.full_name || selectedUser.full_name,
        new_area: updatedUser.area || selectedUser.area,
        new_cargo: updatedUser.cargo || selectedUser.cargo || null,
        new_sede: updatedUser.sede || selectedUser.sede || 'Arequipa',
        new_role: updatedUser.role || selectedUser.role,
      });

      if (error) throw error;

      // Update local state with the returned data
      setUsers(users.map(user =>
        user.user_id === selectedUser.user_id
          ? { ...user, ...updatedUser }
          : user
      ));

      toast({
        title: "Usuario actualizado",
        description: "Los datos del usuario se actualizaron correctamente",
      });

      setIsEditModalOpen(false);
      setSelectedUser(null);
      
      // Refetch to ensure we have the latest data
      fetchUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo actualizar el usuario",
      });
      console.error('Error updating user:', error);
    }
  };

  const handleChangePassword = (user: User) => {
    setSelectedUserForPassword(user);
    setIsChangePasswordModalOpen(true);
  };

  const handleUpdatePassword = async (email: string, newPassword: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: {
          email,
          newPassword
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Contraseña actualizada",
        description: `La contraseña se actualizó correctamente para ${email}`,
      });

      setIsChangePasswordModalOpen(false);
      setSelectedUserForPassword(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo actualizar la contraseña",
      });
      console.error('Error updating password:', error);
      throw error;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.area.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && user.active) ||
                         (statusFilter === "inactive" && !user.active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleStats = () => {
    return {
      total: users.length,
      active: users.filter(u => u.active).length,
      ti: users.filter(u => u.role === 'ti').length,
      gerencia: users.filter(u => u.role === 'gerencia').length,
      usuario: users.filter(u => u.role === 'usuario').length,
    };
  };

  const stats = getRoleStats();
  const canManageUsers = hasAnyAccess(['users', 'settings']);

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-primary rounded-lg">
            <UsersIcon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
            <p className="text-sm text-muted-foreground">Administra todos los usuarios del sistema</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usuarios Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Administradores TI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.ti}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gerencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.gerencia}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.usuario}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ti">TI</SelectItem>
                  <SelectItem value="gerencia">Gerencia</SelectItem>
                  <SelectItem value="usuario">Usuario</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Suspendidos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <Table className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("cards")}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredUsers.length} de {users.length} usuarios
        </p>
      </div>

      {/* Users List */}
      {viewMode === "table" ? (
        <UserTable
          users={filteredUsers}
          onEditUser={handleEditUser}
          onToggleStatus={handleToggleUserStatus}
          onChangePassword={handleChangePassword}
          canManageUsers={canManageUsers}
        />
      ) : (
        <UserCards
          users={filteredUsers}
          onEditUser={handleEditUser}
          onToggleStatus={handleToggleUserStatus}
        />
      )}

      {/* Edit User Modal */}
      <EditUserModal
        user={selectedUser}
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        onUpdateUser={handleUpdateUser}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        user={selectedUserForPassword}
        open={isChangePasswordModalOpen}
        onClose={() => {
          setIsChangePasswordModalOpen(false);
          setSelectedUserForPassword(null);
        }}
        onChangePassword={handleUpdatePassword}
      />
    </div>
  );
};

export default Users;