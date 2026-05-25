import { Edit, Power, Shield, Crown, User, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserType } from "@/pages/Users";

interface UserTableProps {
  users: UserType[];
  onEditUser: (user: UserType) => void;
  onToggleStatus: (userId: string, currentStatus: boolean) => void;
  onChangePassword?: (user: UserType) => void;
  canManageUsers?: boolean;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'ti':
      return <Shield className="h-4 w-4" />;
    case 'gerencia':
      return <Crown className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'ti':
      return 'Administrador TI';
    case 'gerencia':
      return 'Gerencia';
    case 'usuario':
      return 'Usuario';
    default:
      return role;
  }
};

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'ti':
      return 'default';
    case 'gerencia':
      return 'secondary';
    default:
      return 'outline';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function UserTable({ users, onEditUser, onToggleStatus, onChangePassword, canManageUsers = false }: UserTableProps) {
  if (users.length === 0) {
    return (
      <Card className="p-8 text-center">
        <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No se encontraron usuarios</h3>
        <p className="text-muted-foreground">
          No hay usuarios que coincidan con los filtros seleccionados.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último Acceso</TableHead>
              <TableHead>Registrado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground">{user.full_name}</div>
                      <div className="text-xs text-muted-foreground">ID: {user.user_id.slice(0, 8)}...</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-foreground">{user.email}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-foreground">{user.area}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-foreground">{user.cargo || "Sin especificar"}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(user.role)} className="gap-1">
                    {getRoleIcon(user.role)}
                    {getRoleLabel(user.role)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.active ? "default" : "destructive"}>
                    {user.active ? "Activo" : "Suspendido"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {user.last_login ? formatDate(user.last_login) : "Nunca"}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(user.created_at)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditUser(user)}
                      title="Editar usuario"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {canManageUsers && onChangePassword && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onChangePassword(user)}
                        title="Cambiar contraseña"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    )}
                    {canManageUsers && (
                      <Button
                        variant={user.active ? "destructive" : "default"}
                        size="sm"
                        onClick={() => onToggleStatus(user.user_id, user.active)}
                        title={user.active ? "Suspender usuario" : "Activar usuario"}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}