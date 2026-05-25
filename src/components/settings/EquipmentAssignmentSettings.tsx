import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAssignmentReasons, useReturnReasons } from "@/hooks/useEquipmentReasons";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function EquipmentAssignmentSettings() {
  return (
    <Tabs defaultValue="assignment" className="space-y-6">
      <TabsList>
        <TabsTrigger value="assignment">Motivos de Asignación</TabsTrigger>
        <TabsTrigger value="return">Motivos de Devolución</TabsTrigger>
      </TabsList>

      <TabsContent value="assignment">
        <AssignmentReasonsSection />
      </TabsContent>

      <TabsContent value="return">
        <ReturnReasonsSection />
      </TabsContent>
    </Tabs>
  );
}

function AssignmentReasonsSection() {
  const { reasons, isLoading, createReason, updateReason, deleteReason } = useAssignmentReasons();
  const [newReason, setNewReason] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    if (newReason.trim()) {
      createReason.mutate(newReason.trim());
      setNewReason("");
    }
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      updateReason.mutate({ id: editingId, name: editingName.trim() });
      setEditingId(null);
      setEditingName("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleToggleActive = (id: string, is_active: boolean) => {
    updateReason.mutate({ id, is_active: !is_active });
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      deleteReason.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Motivos de Asignación</CardTitle>
        <CardDescription>
          Configura los motivos disponibles al asignar equipos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new reason */}
        <div className="flex gap-2">
          <Input
            placeholder="Nuevo motivo de asignación..."
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={!newReason.trim() || createReason.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
        </div>

        {/* Reasons table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-[100px]">Estado</TableHead>
                <TableHead className="w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reasons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No hay motivos configurados
                  </TableCell>
                </TableRow>
              ) : (
                reasons.map((reason) => (
                  <TableRow key={reason.id}>
                    <TableCell>
                      {editingId === reason.id ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit();
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className={!reason.is_active ? "text-muted-foreground" : ""}>
                          {reason.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={reason.is_active}
                          onCheckedChange={() => handleToggleActive(reason.id, reason.is_active)}
                        />
                        <Badge variant={reason.is_active ? "default" : "secondary"}>
                          {reason.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingId === reason.id ? (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleStartEdit(reason.id, reason.name)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteId(reason.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar motivo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function ReturnReasonsSection() {
  const { reasons, isLoading, createReason, updateReason, deleteReason } = useReturnReasons();
  const [newReason, setNewReason] = useState("");
  const [newHasContinuity, setNewHasContinuity] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingContinuity, setEditingContinuity] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    if (newReason.trim()) {
      createReason.mutate({ name: newReason.trim(), has_continuity: newHasContinuity });
      setNewReason("");
      setNewHasContinuity(true);
    }
  };

  const handleStartEdit = (id: string, name: string, has_continuity: boolean) => {
    setEditingId(id);
    setEditingName(name);
    setEditingContinuity(has_continuity);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      updateReason.mutate({ id: editingId, name: editingName.trim(), has_continuity: editingContinuity });
      setEditingId(null);
      setEditingName("");
      setEditingContinuity(true);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingContinuity(true);
  };

  const handleToggleActive = (id: string, is_active: boolean) => {
    updateReason.mutate({ id, is_active: !is_active });
  };

  const handleToggleContinuity = (id: string, has_continuity: boolean) => {
    updateReason.mutate({ id, has_continuity: !has_continuity });
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      deleteReason.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Motivos de Devolución</CardTitle>
        <CardDescription>
          Configura los motivos disponibles al devolver equipos. Los motivos con "Continuidad" permiten seguir asignando el mismo equipo a la persona.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new reason */}
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Nuevo motivo de devolución..."
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1"
          />
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Switch
              checked={newHasContinuity}
              onCheckedChange={setNewHasContinuity}
            />
            <span className="text-sm text-muted-foreground">Continuidad</span>
          </div>
          <Button onClick={handleCreate} disabled={!newReason.trim() || createReason.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
        </div>

        {/* Reasons table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-[120px]">Continuidad</TableHead>
                <TableHead className="w-[100px]">Estado</TableHead>
                <TableHead className="w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reasons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No hay motivos configurados
                  </TableCell>
                </TableRow>
              ) : (
                reasons.map((reason) => (
                  <TableRow key={reason.id}>
                    <TableCell>
                      {editingId === reason.id ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit();
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className={!reason.is_active ? "text-muted-foreground" : ""}>
                          {reason.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === reason.id ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={editingContinuity}
                            onCheckedChange={setEditingContinuity}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={reason.has_continuity}
                            onCheckedChange={() => handleToggleContinuity(reason.id, reason.has_continuity)}
                          />
                          <Badge variant={reason.has_continuity ? "default" : "outline"}>
                            {reason.has_continuity ? "Sí" : "No"}
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={reason.is_active}
                          onCheckedChange={() => handleToggleActive(reason.id, reason.is_active)}
                        />
                        <Badge variant={reason.is_active ? "default" : "secondary"}>
                          {reason.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingId === reason.id ? (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleStartEdit(reason.id, reason.name, reason.has_continuity)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteId(reason.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar motivo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
