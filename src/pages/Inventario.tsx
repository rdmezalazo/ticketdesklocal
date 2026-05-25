import { useState } from "react";
import { Package, Plus, Pencil, Trash2, ChevronRight, ChevronDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useInventarios, useEquipos, Inventario, Equipo, TIPOS_EQUIPO, SEDES, TipoEquipo } from "@/hooks/useInventario";
import { EquipoEditableTable } from "@/components/inventario/EquipoEditableTable";
import { EquipoListReport } from "@/components/inventario/EquipoListReport";
import { format } from "date-fns";

export default function InventarioPage() {
  const { inventarios, isLoading: loadingInventarios, createInventario, updateInventario, deleteInventario } = useInventarios();
  const [selectedInventarioId, setSelectedInventarioId] = useState<string | null>(null);
  const [expandedInventarios, setExpandedInventarios] = useState<Set<string>>(new Set());
  
  // Modal states
  const [showInventarioModal, setShowInventarioModal] = useState(false);
  const [showEquipoModal, setShowEquipoModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportInventario, setReportInventario] = useState<Inventario | null>(null);
  const [editingInventario, setEditingInventario] = useState<Inventario | null>(null);
  const [editingEquipo, setEditingEquipo] = useState<Equipo | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "inventario" | "equipo"; id: string } | null>(null);

  const currentYear = new Date().getFullYear();
  const MIN_YEAR = 2000;
  const MAX_YEAR = currentYear + 1;

  // Form states
  const [inventarioForm, setInventarioForm] = useState({
    year: currentYear,
    fecha_inventario: format(new Date(), "yyyy-MM-dd"),
    vigente: true,
    comentario: "",
  });

  const isInventarioFormValid =
    inventarioForm.year >= MIN_YEAR &&
    inventarioForm.year <= MAX_YEAR &&
    !!inventarioForm.fecha_inventario;

  const [equipoForm, setEquipoForm] = useState({
    sede: "Arequipa",
    tipoEquipo: "COMPUTADORA" as TipoEquipo,
    tipo: "",
    nombre: "",
    marca: "",
    modelo: "",
    nro_serie: "",
    fecha_alta: "",
    fecha_baja: "",
    operativo: true,
    red_linea: "",
    tarjeta_sim: "",
  });

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedInventarios);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedInventarios(newExpanded);
  };

  const handleCreateInventario = () => {
    setEditingInventario(null);
    setInventarioForm({
      year: currentYear,
      fecha_inventario: format(new Date(), "yyyy-MM-dd"),
      vigente: true,
      comentario: "",
    });
    setShowInventarioModal(true);
  };

  const handleEditInventario = (inv: Inventario) => {
    setEditingInventario(inv);
    setInventarioForm({
      year: inv.year,
      fecha_inventario: inv.fecha_inventario,
      vigente: inv.vigente,
      comentario: inv.comentario || "",
    });
    setShowInventarioModal(true);
  };

  const handleSaveInventario = () => {
    if (editingInventario) {
      updateInventario.mutate({ id: editingInventario.id, ...inventarioForm });
    } else {
      createInventario.mutate(inventarioForm);
    }
    setShowInventarioModal(false);
  };

  const handleCreateEquipo = (inventarioId: string) => {
    setSelectedInventarioId(inventarioId);
    setEditingEquipo(null);
    setEquipoForm({
      sede: "Arequipa",
      tipoEquipo: "COMPUTADORA",
      tipo: "",
      nombre: "",
      marca: "",
      modelo: "",
      nro_serie: "",
      fecha_alta: format(new Date(), "yyyy-MM-dd"),
      fecha_baja: "",
      operativo: true,
      red_linea: "",
      tarjeta_sim: "",
    });
    setShowEquipoModal(true);
  };

  const handleEditEquipo = (equipo: Equipo) => {
    setSelectedInventarioId(equipo.inventario_id);
    setEditingEquipo(equipo);
    // Extract tipoEquipo from codigo
    const tipoMatch = equipo.codigo.match(/-([A-Z]+)-/);
    const tipoCode = tipoMatch ? tipoMatch[1] : "OTR";
    const tipoMap: Record<string, TipoEquipo> = {
      COM: "COMPUTADORA",
      LAP: "LAPTOP",
      CEL: "CELULAR",
      CAM: "CAMARA",
      IMP: "IMPRESORA",
      MON: "MONITOR",
      TAB: "TABLET",
      ROU: "ROUTER",
      SWI: "SWITCH",
      SER: "SERVIDOR",
      OTR: "OTRO",
    };
    
    setEquipoForm({
      sede: equipo.sede,
      tipoEquipo: tipoMap[tipoCode] || "OTRO",
      tipo: equipo.tipo || "",
      nombre: equipo.nombre,
      marca: equipo.marca || "",
      modelo: equipo.modelo || "",
      nro_serie: equipo.nro_serie || "",
      fecha_alta: equipo.fecha_alta || "",
      fecha_baja: equipo.fecha_baja || "",
      operativo: equipo.operativo,
      red_linea: equipo.red_linea || "",
      tarjeta_sim: equipo.tarjeta_sim || "",
    });
    setShowEquipoModal(true);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm?.type === "inventario") {
      deleteInventario.mutate(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  const handleShowReport = (inv: Inventario) => {
    setReportInventario(inv);
    setShowReportModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Inventario
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de inventarios y equipos de cómputo
          </p>
        </div>
        <Button onClick={handleCreateInventario}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Inventario
        </Button>
      </div>

      {loadingInventarios ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : inventarios.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay inventarios registrados</p>
            <Button onClick={handleCreateInventario} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Crear primer inventario
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {inventarios.map((inv) => (
            <InventarioCard
              key={inv.id}
              inventario={inv}
              isExpanded={expandedInventarios.has(inv.id)}
              onToggle={() => toggleExpanded(inv.id)}
              onEdit={() => handleEditInventario(inv)}
              onDelete={() => setDeleteConfirm({ type: "inventario", id: inv.id })}
              onAddEquipo={() => handleCreateEquipo(inv.id)}
              onEditEquipo={handleEditEquipo}
              onShowReport={() => handleShowReport(inv)}
            />
          ))}
        </div>
      )}

      {/* Report Modal */}
      {reportInventario && (
        <ReportWrapper 
          open={showReportModal} 
          onOpenChange={setShowReportModal} 
          inventario={reportInventario} 
        />
      )}

      {/* Inventario Modal */}
      <Dialog open={showInventarioModal} onOpenChange={setShowInventarioModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingInventario ? "Editar Inventario" : "Nuevo Inventario"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Año *</Label>
                <Input
                  type="number"
                  value={inventarioForm.year}
                  min={MIN_YEAR}
                  max={MAX_YEAR}
                  step={1}
                  onChange={(e) =>
                    setInventarioForm({
                      ...inventarioForm,
                      year: e.target.value ? parseInt(e.target.value) : currentYear,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Entre {MIN_YEAR} y {MAX_YEAR}. Usado para agrupar los inventarios por año.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Fecha de Inventario *</Label>
                <Input
                  type="date"
                  value={inventarioForm.fecha_inventario}
                  onChange={(e) => setInventarioForm({ ...inventarioForm, fecha_inventario: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Fecha en la que se realizó o se realizará el conteo físico.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={inventarioForm.vigente}
                onCheckedChange={(checked) => setInventarioForm({ ...inventarioForm, vigente: checked })}
              />
              <div className="flex flex-col">
                <Label>Vigente</Label>
                <span className="text-xs text-muted-foreground">
                  Solo un inventario vigente debería usarse para registrar nuevos equipos.
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comentario</Label>
              <Textarea
                value={inventarioForm.comentario}
                onChange={(e) => setInventarioForm({ ...inventarioForm, comentario: e.target.value })}
                placeholder="Comentarios adicionales..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setShowInventarioModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveInventario} disabled={!isInventarioFormValid}>
              {editingInventario ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Equipo Modal */}
      <EquipoModal
        open={showEquipoModal}
        onOpenChange={setShowEquipoModal}
        inventarioId={selectedInventarioId}
        editingEquipo={editingEquipo}
        form={equipoForm}
        setForm={setEquipoForm}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === "inventario" 
                ? "Esta acción eliminará el inventario y todos los equipos asociados. Esta acción no se puede deshacer."
                : "Esta acción eliminará el equipo. Esta acción no se puede deshacer."}
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
    </div>
  );
}

// Inventario Card Component
function InventarioCard({
  inventario,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddEquipo,
  onEditEquipo,
  onShowReport,
}: {
  inventario: Inventario;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddEquipo: () => void;
  onEditEquipo: (equipo: Equipo) => void;
  onShowReport: () => void;
}) {
  const { equipos, isLoading } = useEquipos(inventario.id);

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-3 cursor-pointer hover:opacity-80">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <CardTitle className="text-lg">
                  Inventario {inventario.year}
                </CardTitle>
                <Badge variant={inventario.vigente ? "default" : "secondary"}>
                  {inventario.vigente ? "Vigente" : "No Vigente"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {equipos.length} equipos
                </span>
              </div>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onShowReport}>
                <FileText className="h-4 w-4 mr-1" />
                Ver Formato
              </Button>
              <Button variant="outline" size="sm" onClick={onAddEquipo}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar Equipo
              </Button>
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
          {inventario.comentario && (
            <p className="text-sm text-muted-foreground ml-8">{inventario.comentario}</p>
          )}
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <EquipoEditableTable
              equipos={equipos}
              inventarioId={inventario.id}
              onEditModal={onEditEquipo}
              isLoading={isLoading}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Equipo Modal Component
function EquipoModal({
  open,
  onOpenChange,
  inventarioId,
  editingEquipo,
  form,
  setForm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventarioId: string | null;
  editingEquipo: Equipo | null;
  form: {
    sede: string;
    tipoEquipo: TipoEquipo;
    tipo: string;
    nombre: string;
    marca: string;
    modelo: string;
    nro_serie: string;
    fecha_alta: string;
    fecha_baja: string;
    operativo: boolean;
    red_linea: string;
    tarjeta_sim: string;
  };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
}) {
  const { createEquipo, updateEquipo } = useEquipos(inventarioId || undefined);

  const handleSave = () => {
    if (editingEquipo) {
      updateEquipo.mutate({
        id: editingEquipo.id,
        sede: form.sede,
        tipo: form.tipo,
        nombre: form.nombre,
        marca: form.marca || null,
        modelo: form.modelo || null,
        nro_serie: form.nro_serie || null,
        fecha_alta: form.fecha_alta || null,
        fecha_baja: form.fecha_baja || null,
        operativo: form.operativo,
        red_linea: form.red_linea || null,
        tarjeta_sim: form.tarjeta_sim || null,
      });
    } else if (inventarioId) {
      createEquipo.mutate({
        inventario_id: inventarioId,
        sede: form.sede,
        tipoEquipo: form.tipoEquipo,
        tipo: form.tipo || form.nombre, // Use tipo or nombre as fallback
        nombre: form.nombre,
        marca: form.marca || null,
        modelo: form.modelo || null,
        nro_serie: form.nro_serie || null,
        fecha_alta: form.fecha_alta || null,
        fecha_baja: form.fecha_baja || null,
        operativo: form.operativo,
        red_linea: form.red_linea || null,
        tarjeta_sim: form.tarjeta_sim || null,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingEquipo ? "Editar Equipo" : "Nuevo Equipo"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sede *</Label>
              <Select value={form.sede} onValueChange={(v) => setForm({ ...form, sede: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEDES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Equipo *</Label>
              <Select 
                value={form.tipoEquipo} 
                onValueChange={(v) => setForm({ ...form, tipoEquipo: v as TipoEquipo })}
                disabled={!!editingEquipo}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_EQUIPO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingEquipo && (
                <p className="text-xs text-muted-foreground">El tipo de equipo no se puede cambiar</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo (Categoría editable)</Label>
            <Input
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              placeholder="Ej: Laptop, Computadora de Escritorio, etc."
            />
            <p className="text-xs text-muted-foreground">
              Puede usar este campo para categorizar libremente sus equipos
            </p>
          </div>

          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: PC Recepción"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input
                value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
                placeholder="Ej: HP, Dell, Lenovo"
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                placeholder="Ej: ProBook 450"
              />
            </div>
            <div className="space-y-2">
              <Label>Nro. Serie</Label>
              <Input
                value={form.nro_serie}
                onChange={(e) => setForm({ ...form, nro_serie: e.target.value })}
                placeholder="Número de serie"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha de Alta</Label>
              <Input
                type="date"
                value={form.fecha_alta}
                onChange={(e) => setForm({ ...form, fecha_alta: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de Baja</Label>
              <Input
                type="date"
                value={form.fecha_baja}
                onChange={(e) => setForm({ ...form, fecha_baja: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.operativo}
              onCheckedChange={(checked) => setForm({ ...form, operativo: checked })}
            />
            <Label>Operativo</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Red / Línea</Label>
              <Input
                value={form.red_linea}
                onChange={(e) => setForm({ ...form, red_linea: e.target.value })}
                placeholder="Ej: 192.168.1.100"
              />
            </div>
            <div className="space-y-2">
              <Label>Tarjeta SIM</Label>
              <Input
                value={form.tarjeta_sim}
                onChange={(e) => setForm({ ...form, tarjeta_sim: e.target.value })}
                placeholder="Número de SIM"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!form.nombre}>
            {editingEquipo ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Report Wrapper Component - fetches equipos for the report
function ReportWrapper({
  open,
  onOpenChange,
  inventario,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventario: Inventario;
}) {
  const { equipos } = useEquipos(inventario.id);

  return (
    <EquipoListReport
      open={open}
      onOpenChange={onOpenChange}
      equipos={equipos}
      inventarioYear={inventario.year}
      inventarioFecha={inventario.fecha_inventario}
    />
  );
}
