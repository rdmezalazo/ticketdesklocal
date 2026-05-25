import { useState, useEffect } from "react";
import { User, Shield, Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserType } from "@/pages/Users";

interface EditUserModalProps {
  user: UserType | null;
  open: boolean;
  onClose: () => void;
  onUpdateUser: (updatedUser: Partial<UserType>) => void;
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

export function EditUserModal({ user, open, onClose, onUpdateUser }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    full_name: "",
    area: "",
    cargo: "",
    sede: "Arequipa",
    role: "usuario" as "usuario" | "gerencia" | "ti",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        area: user.area,
        cargo: user.cargo || "",
        sede: user.sede || "Arequipa",
        role: user.role,
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      onUpdateUser(formData);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form after a short delay to avoid visual glitch
    setTimeout(() => {
      setFormData({
        full_name: "",
        area: "",
        cargo: "",
        sede: "Arequipa",
        role: "usuario",
      });
    }, 150);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Editar Usuario
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info Header */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>
                {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-medium text-foreground">{user.full_name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={user.active ? "default" : "destructive"} className="text-xs">
                  {user.active ? "Activo" : "Suspendido"}
                </Badge>
                <Badge variant="outline" className="text-xs gap-1">
                  {getRoleIcon(user.role)}
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre Completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Ingrese el nombre completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Área</Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="Ingrese el área de trabajo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                placeholder="Ingrese el cargo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sede">Sede</Label>
              <Select
                value={formData.sede}
                onValueChange={(value: string) => setFormData({ ...formData, sede: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arequipa">Arequipa</SelectItem>
                  <SelectItem value="Lima">Lima</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol del Usuario</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usuario">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Usuario
                    </div>
                  </SelectItem>
                  <SelectItem value="gerencia">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      Gerencia
                    </div>
                  </SelectItem>
                  <SelectItem value="ti">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Administrador TI
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit">
                Guardar Cambios
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}