import { Edit, Power, Shield, Crown, User, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserType } from "@/pages/Users";

interface UserCardsProps {
  users: UserType[];
  onEditUser: (user: UserType) => void;
  onToggleStatus: (userId: string, currentStatus: boolean) => void;
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
    year: 'numeric'
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function UserCards({ users, onEditUser, onToggleStatus }: UserCardsProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {users.map((user) => (
        <Card key={user.user_id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-sm">
                    {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm truncate">
                    {user.full_name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              <Badge variant={user.active ? "default" : "destructive"} className="text-xs">
                {user.active ? "Activo" : "Suspendido"}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Área:</span>
                <span className="text-xs font-medium text-foreground">{user.area}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Cargo:</span>
                <span className="text-xs font-medium text-foreground">{user.cargo || "Sin especificar"}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Rol:</span>
                <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs gap-1">
                  {getRoleIcon(user.role)}
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  Último acceso: {user.last_login ? formatDateTime(user.last_login) : "Nunca"}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Registrado: {formatDate(user.created_at)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onEditUser(user)}
              >
                <Edit className="h-3 w-3 mr-1" />
                Editar
              </Button>
              <Button
                variant={user.active ? "destructive" : "default"}
                size="sm"
                className="flex-1"
                onClick={() => onToggleStatus(user.user_id, user.active)}
              >
                <Power className="h-3 w-3 mr-1" />
                {user.active ? "Suspender" : "Activar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}