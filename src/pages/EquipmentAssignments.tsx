import { useState, useEffect, useMemo } from "react";
import { Laptop, Plus, FileText, Pencil, Trash2, Search, Check, ChevronsUpDown, User, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  useEquipmentAssignments, 
  useAssignmentItems,
  useAssignedEquipment,
  EQUIPMENT_CONDITIONS,
  EquipmentAssignment,
  EquipmentAssignmentItem
} from "@/hooks/useEquipmentAssignments";
import { useAssignmentReasons, useReturnReasons } from "@/hooks/useEquipmentReasons";
import { useEquipos, Equipo } from "@/hooks/useInventario";
import { useUsers } from "@/hooks/useUsers";
import { EquipmentAssignmentReport } from "@/components/equipmentAssignments/EquipmentAssignmentReport";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function EquipmentAssignments() {
  const { assignments, isLoading, createAssignment, updateAssignment, deleteAssignment } = useEquipmentAssignments();
  const { equipos } = useEquipos();
  const { users, fetchUsers } = useUsers();
  const { assignedItems, isEquipmentAssigned } = useAssignedEquipment();
  const { activeReasons: assignmentReasons } = useAssignmentReasons();
  const { activeReasons: returnReasons } = useReturnReasons();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showNewModal, setShowNewModal] = useState(false);
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<EquipmentAssignment | null>(null);
  const [selectedItem, setSelectedItem] = useState<EquipmentAssignmentItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteItemConfirm, setDeleteItemConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form states for new assignment
  const [workerOpen, setWorkerOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [assignerName, setAssignerName] = useState("Ronald Meza");
  const [assignerPosition, setAssignerPosition] = useState("Responsable de TI");
  const [workerDni, setWorkerDni] = useState("");
  const [observations, setObservations] = useState("");

  // Equipment item form states
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<Equipo | null>(null);
  const [assignmentReason, setAssignmentReason] = useState("");
  const [equipmentCondition, setEquipmentCondition] = useState("Usado");

  // Edit item form states
  const [editAssignmentReason, setEditAssignmentReason] = useState("");
  const [editEquipmentCondition, setEditEquipmentCondition] = useState("");

  // Return form states
  const [returnReason, setReturnReason] = useState("");
  const [returnDate, setReturnDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Load assigner info from current user
  useEffect(() => {
    const loadAssignerInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, cargo')
          .eq('user_id', user.id)
          .single();
        
        if (profile) {
          if (profile.full_name !== "Ronald Meza") {
            setAssignerName(profile.full_name);
            setAssignerPosition(profile.cargo || "Responsable de TI");
          }
        }
      }
    };
    loadAssignerInfo();
  }, []);

  // Group assignments by worker
  const assignmentsByWorker = useMemo(() => {
    const grouped = new Map<string, EquipmentAssignment[]>();
    
    assignments.forEach((assignment) => {
      const existing = grouped.get(assignment.worker_id) || [];
      grouped.set(assignment.worker_id, [...existing, assignment]);
    });

    return grouped;
  }, [assignments]);

  const filteredWorkers = useMemo(() => {
    const workers = Array.from(assignmentsByWorker.entries()).map(([workerId, workerAssignments]) => ({
      workerId,
      workerName: workerAssignments[0].worker_name,
      workerPosition: workerAssignments[0].worker_position,
      assignments: workerAssignments,
    }));

    return workers.filter(w => 
      w.workerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [assignmentsByWorker, searchTerm]);

  const filteredEquipos = equipos.filter(e => {
    const search = equipmentSearch.toLowerCase();
    return (
      e.codigo.toLowerCase().includes(search) ||
      e.tipo.toLowerCase().includes(search) ||
      e.nombre.toLowerCase().includes(search)
    );
  });

  // Check if worker already has an assignment
  const getExistingAssignment = (workerId: string) => {
    return assignments.find(a => a.worker_id === workerId && a.status === "active");
  };

  const handleCreateAssignment = async () => {
    if (!selectedWorker) return;

    // Check if worker already has an active assignment
    const existing = getExistingAssignment(selectedWorker.user_id);
    if (existing) {
      toast({
        title: "El trabajador ya tiene una asignación activa",
        description: "Agregue equipos a la asignación existente.",
        variant: "destructive",
      });
      return;
    }

    await createAssignment.mutateAsync({
      worker_id: selectedWorker.user_id,
      worker_name: selectedWorker.full_name,
      worker_position: selectedWorker.cargo || null,
      worker_dni: workerDni || null,
      assigner_name: assignerName,
      assigner_position: assignerPosition,
      assignment_date: format(new Date(), "yyyy-MM-dd"),
      status: "active",
      observations: observations || null,
    });

    // Reset form
    setSelectedWorker(null);
    setWorkerDni("");
    setObservations("");
    setShowNewModal(false);
  };

  const handleAddEquipmentToAssignment = async () => {
    if (!selectedAssignment || !selectedEquipment || !assignmentReason) return;

    const { error } = await supabase.from("equipment_assignment_items").insert({
      assignment_id: selectedAssignment.id,
      equipo_id: selectedEquipment.id,
      equipo_codigo: selectedEquipment.codigo,
      equipo_nombre: selectedEquipment.nombre,
      equipo_marca: selectedEquipment.marca,
      equipo_modelo: selectedEquipment.modelo,
      equipo_serie: selectedEquipment.nro_serie,
      assignment_reason: assignmentReason,
      equipment_condition: equipmentCondition,
      delivery_date: format(new Date(), "yyyy-MM-dd"),
    });

    if (error) {
      toast({ title: "Error al agregar equipo", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Equipo agregado exitosamente" });
    queryClient.invalidateQueries({ queryKey: ["equipment-assignment-items"] });
    queryClient.invalidateQueries({ queryKey: ["all-assigned-equipment"] });

    // Reset form
    setSelectedEquipment(null);
    setAssignmentReason("");
    setEquipmentCondition("Usado");
    setEquipmentSearch("");
    setShowAddEquipmentModal(false);
  };

  const handleUpdateItem = async () => {
    if (!selectedItem) return;

    const { error } = await supabase
      .from("equipment_assignment_items")
      .update({
        assignment_reason: editAssignmentReason,
        equipment_condition: editEquipmentCondition,
      })
      .eq("id", selectedItem.id);

    if (error) {
      toast({ title: "Error al actualizar", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Equipo actualizado" });
    queryClient.invalidateQueries({ queryKey: ["equipment-assignment-items"] });
    setShowEditItemModal(false);
    setSelectedItem(null);
  };

  const handleReturnItem = async () => {
    if (!selectedItem || !returnReason) return;

    const { error } = await supabase
      .from("equipment_assignment_items")
      .update({
        return_reason: returnReason,
        return_date: returnDate,
      })
      .eq("id", selectedItem.id);

    if (error) {
      toast({ title: "Error al registrar devolución", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Devolución registrada" });
    queryClient.invalidateQueries({ queryKey: ["equipment-assignment-items"] });
    queryClient.invalidateQueries({ queryKey: ["all-assigned-equipment"] });
    setShowReturnModal(false);
    setSelectedItem(null);
    setReturnReason("");
    setReturnDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleDeleteItem = async () => {
    if (!deleteItemConfirm) return;

    const { error } = await supabase
      .from("equipment_assignment_items")
      .delete()
      .eq("id", deleteItemConfirm);

    if (error) {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Equipo eliminado de la asignación" });
    queryClient.invalidateQueries({ queryKey: ["equipment-assignment-items"] });
    queryClient.invalidateQueries({ queryKey: ["all-assigned-equipment"] });
    setDeleteItemConfirm(null);
  };

  const handleShowReport = (assignment: EquipmentAssignment) => {
    setSelectedAssignment(assignment);
    setShowReportModal(true);
  };

  const handleOpenAddEquipment = (assignment: EquipmentAssignment) => {
    setSelectedAssignment(assignment);
    setShowAddEquipmentModal(true);
  };

  const handleOpenEditItem = (item: EquipmentAssignmentItem) => {
    setSelectedItem(item);
    setEditAssignmentReason(item.assignment_reason);
    setEditEquipmentCondition(item.equipment_condition);
    setShowEditItemModal(true);
  };

  const handleOpenReturnItem = (item: EquipmentAssignmentItem) => {
    setSelectedItem(item);
    setReturnReason("");
    setReturnDate(format(new Date(), "yyyy-MM-dd"));
    setShowReturnModal(true);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      deleteAssignment.mutate(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Laptop className="h-6 w-6" />
            Equipos Asignados
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de asignación y devolución de equipos
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Asignación
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por trabajador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Workers with Assignments */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredWorkers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Laptop className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay asignaciones registradas</p>
            <Button onClick={() => setShowNewModal(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Crear primera asignación
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredWorkers.map((worker) => (
            <WorkerAssignmentCard
              key={worker.workerId}
              workerName={worker.workerName}
              workerPosition={worker.workerPosition}
              assignments={worker.assignments}
              onShowReport={handleShowReport}
              onAddEquipment={handleOpenAddEquipment}
              onEditItem={handleOpenEditItem}
              onReturnItem={handleOpenReturnItem}
              onDeleteItem={(id) => setDeleteItemConfirm(id)}
              onDeleteAssignment={(id) => setDeleteConfirm(id)}
            />
          ))}
        </div>
      )}

      {/* New Assignment Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Asignación de Equipos</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Worker Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trabajador *</Label>
                <Popover open={workerOpen} onOpenChange={setWorkerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={workerOpen}
                      className="w-full justify-between"
                    >
                      {selectedWorker ? selectedWorker.full_name : "Seleccionar trabajador..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar por nombre o área..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                        <CommandGroup>
                          {users.map((user) => {
                            const hasAssignment = !!getExistingAssignment(user.user_id);
                            return (
                              <CommandItem
                                key={user.user_id}
                                value={`${user.full_name} ${user.area}`}
                                onSelect={() => {
                                  if (!hasAssignment) {
                                    setSelectedWorker(user);
                                    setWorkerOpen(false);
                                  }
                                }}
                                disabled={hasAssignment}
                                className={cn(hasAssignment && "opacity-50")}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedWorker?.user_id === user.user_id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col flex-1">
                                  <div className="flex items-center gap-2">
                                    <span>{user.full_name}</span>
                                    {hasAssignment && (
                                      <Badge variant="secondary" className="text-xs">Ya tiene asignación</Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">{user.area}</span>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Puesto del Trabajador</Label>
                <Input
                  value={selectedWorker?.cargo || ""}
                  disabled
                  placeholder="Se mostrará al seleccionar trabajador"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>DNI/CE N°</Label>
                <Input
                  value={workerDni}
                  onChange={(e) => setWorkerDni(e.target.value)}
                  placeholder="Número de documento"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Asignación</Label>
                <Input
                  value={format(new Date(), "dd/MM/yyyy")}
                  disabled
                />
              </div>
            </div>

            {/* Assigner Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre del que Asigna</Label>
                <Input
                  value={assignerName}
                  onChange={(e) => setAssignerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Puesto de Trabajo</Label>
                <Input
                  value={assignerPosition}
                  onChange={(e) => setAssignerPosition(e.target.value)}
                />
              </div>
            </div>

            {/* Observations */}
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Observaciones adicionales..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateAssignment}
              disabled={!selectedWorker || createAssignment.isPending}
            >
              {createAssignment.isPending ? "Guardando..." : "Crear Asignación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Equipment Modal */}
      <Dialog open={showAddEquipmentModal} onOpenChange={setShowAddEquipmentModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Equipo a {selectedAssignment?.worker_name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código de Equipo *</Label>
                <Popover open={equipmentOpen} onOpenChange={setEquipmentOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={equipmentOpen}
                      className="w-full justify-between text-left"
                    >
                      {selectedEquipment ? selectedEquipment.codigo : "Buscar equipo..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Buscar por código, tipo o nombre..." 
                        value={equipmentSearch}
                        onValueChange={setEquipmentSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontraron equipos.</CommandEmpty>
                        <CommandGroup>
                          {filteredEquipos.map((equipo) => {
                            const assignedTo = isEquipmentAssigned(equipo.id);
                            const isBaja = !equipo.operativo;
                            const isDisabled = !!assignedTo || isBaja;

                            return (
                              <CommandItem
                                key={equipo.id}
                                value={`${equipo.codigo} ${equipo.tipo} ${equipo.nombre}`}
                                onSelect={() => {
                                  if (isBaja) {
                                    toast({
                                      title: "Equipo no disponible",
                                      description: "Este equipo está de baja en el inventario actual y no puede ser asignado.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  if (!isDisabled) {
                                    setSelectedEquipment(equipo);
                                    setEquipmentOpen(false);
                                  }
                                }}
                                disabled={isDisabled}
                                className={cn(isDisabled && "opacity-50")}
                              >
                                <div className="flex flex-col flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-medium">{equipo.codigo}</span>
                                    {isBaja && (
                                      <Badge variant="destructive" className="text-xs">
                                        Baja
                                      </Badge>
                                    )}
                                    {!isDisabled && !isBaja && (
                                      <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                        Disponible
                                      </Badge>
                                    )}
                                    {assignedTo && !isBaja && (
                                      <Badge variant="secondary" className="text-xs">
                                        Asignado a: {(assignedTo as any).equipment_assignments?.worker_name}
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-sm">{equipo.nombre}</span>
                                  <span className="text-xs text-muted-foreground">{equipo.tipo}</span>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Motivo de Asignación *</Label>
                <Select value={assignmentReason} onValueChange={setAssignmentReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignmentReasons.map((reason) => (
                      <SelectItem key={reason.id} value={reason.name}>{reason.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={equipmentCondition} onValueChange={setEquipmentCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_CONDITIONS.map((cond) => (
                      <SelectItem key={cond} value={cond}>{cond}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha de Entrega</Label>
                <Input value={format(new Date(), "dd/MM/yyyy")} disabled />
              </div>
            </div>

            {/* Selected Equipment Preview */}
            {selectedEquipment && (
              <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <p className="font-medium">{selectedEquipment.nombre}</p>
                <p className="text-sm text-muted-foreground">
                  {[selectedEquipment.marca, selectedEquipment.modelo, selectedEquipment.nro_serie].filter(Boolean).join(" • ")}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEquipmentModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddEquipmentToAssignment}
              disabled={!selectedEquipment || !assignmentReason}
            >
              Agregar Equipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Modal */}
      <Dialog open={showEditItemModal} onOpenChange={setShowEditItemModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Equipo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="font-mono font-medium">{selectedItem?.equipo_codigo}</p>
              <p className="text-sm">{selectedItem?.equipo_nombre}</p>
              <p className="text-xs text-muted-foreground">
                {[selectedItem?.equipo_marca, selectedItem?.equipo_modelo, selectedItem?.equipo_serie].filter(Boolean).join(" • ")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Motivo de Asignación</Label>
              <Select value={editAssignmentReason} onValueChange={setEditAssignmentReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignmentReasons.map((reason) => (
                    <SelectItem key={reason.id} value={reason.name}>{reason.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={editEquipmentCondition} onValueChange={setEditEquipmentCondition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_CONDITIONS.map((cond) => (
                    <SelectItem key={cond} value={cond}>{cond}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditItemModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateItem}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Item Modal */}
      <Dialog open={showReturnModal} onOpenChange={setShowReturnModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Devolución</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="font-mono font-medium">{selectedItem?.equipo_codigo}</p>
              <p className="text-sm">{selectedItem?.equipo_nombre}</p>
            </div>

            <div className="space-y-2">
              <Label>Motivo de Devolución *</Label>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar motivo" />
                </SelectTrigger>
                <SelectContent>
                  {returnReasons.map((reason) => (
                    <SelectItem key={reason.id} value={reason.name}>{reason.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha de Devolución</Label>
              <Input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReturnItem} disabled={!returnReason}>
              Registrar Devolución
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      {selectedAssignment && (
        <EquipmentAssignmentReport
          open={showReportModal}
          onOpenChange={setShowReportModal}
          assignment={selectedAssignment}
        />
      )}

      {/* Delete Assignment Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar asignación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la asignación y todos los equipos asociados. Esta acción no se puede deshacer.
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

      {/* Delete Item Confirmation */}
      <AlertDialog open={!!deleteItemConfirm} onOpenChange={() => setDeleteItemConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar equipo de la asignación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Worker Assignment Card Component (grouped by worker)
function WorkerAssignmentCard({
  workerName,
  workerPosition,
  assignments,
  onShowReport,
  onAddEquipment,
  onEditItem,
  onReturnItem,
  onDeleteItem,
  onDeleteAssignment,
}: {
  workerName: string;
  workerPosition: string | null;
  assignments: EquipmentAssignment[];
  onShowReport: (assignment: EquipmentAssignment) => void;
  onAddEquipment: (assignment: EquipmentAssignment) => void;
  onEditItem: (item: EquipmentAssignmentItem) => void;
  onReturnItem: (item: EquipmentAssignmentItem) => void;
  onDeleteItem: (id: string) => void;
  onDeleteAssignment: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  
  // Get the main active assignment for this worker
  const activeAssignment = assignments.find(a => a.status === "active") || assignments[0];
  const { items } = useAssignmentItems(activeAssignment.id);

  const activeItems = items.filter(i => !i.return_date);
  const returnedItems = items.filter(i => !!i.return_date);

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-6 -mt-6 px-6 pt-6 pb-3">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{workerName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{workerPosition || "Sin puesto"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{activeItems.length} equipo(s)</Badge>
                {returnedItems.length > 0 && (
                  <Badge variant="outline">{returnedItems.length} devuelto(s)</Badge>
                )}
                <Badge variant={activeAssignment.status === "active" ? "default" : "secondary"}>
                  {activeAssignment.status === "active" ? "Activo" : "Cerrado"}
                </Badge>
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="space-y-1 text-muted-foreground">
                <p>Asignado por: <span className="text-foreground">{activeAssignment.assigner_name}</span></p>
                <p>Fecha: <span className="text-foreground">{format(new Date(activeAssignment.assignment_date), "dd/MM/yyyy")}</span></p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onAddEquipment(activeAssignment)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Equipo
                </Button>
                <Button variant="outline" size="sm" onClick={() => onShowReport(activeAssignment)}>
                  <FileText className="h-4 w-4 mr-1" />
                  Ver Formato
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDeleteAssignment(activeAssignment.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Equipment Table */}
            {items.length > 0 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre del Equipo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Entrega</TableHead>
                      <TableHead>Devolución</TableHead>
                      <TableHead className="w-[120px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className={item.return_date ? "opacity-60" : ""}>
                        <TableCell className="font-mono">{item.equipo_codigo}</TableCell>
                        <TableCell>
                          <div>
                            <p>{item.equipo_nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {[item.equipo_marca, item.equipo_modelo, item.equipo_serie].filter(Boolean).join(" • ")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{item.assignment_reason}</TableCell>
                        <TableCell>
                          <Badge variant={item.equipment_condition === "Nuevo" ? "default" : "secondary"}>
                            {item.equipment_condition}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(item.delivery_date), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          {item.return_date ? (
                            <div>
                              <p className="text-sm">{format(new Date(item.return_date), "dd/MM/yyyy")}</p>
                              <p className="text-xs text-muted-foreground">{item.return_reason}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {!item.return_date && (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onEditItem(item)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onReturnItem(item)}
                                title="Registrar devolución"
                              >
                                <RotateCcw className="h-4 w-4 text-orange-500" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onDeleteItem(item.id)}
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {items.length === 0 && (
              <div className="text-center py-6 text-muted-foreground border rounded-lg">
                No hay equipos asignados. Haz clic en "Agregar Equipo" para comenzar.
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
