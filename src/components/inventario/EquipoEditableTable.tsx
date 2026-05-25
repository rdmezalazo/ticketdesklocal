import { useState, useRef, useCallback } from "react";
import { Check, X, Pencil, Trash2, ClipboardPaste, Save, AlertCircle, FileSpreadsheet, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Equipo, TipoEquipo, TIPOS_EQUIPO, SEDES, useEquipos } from "@/hooks/useInventario";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface EquipoEditableTableProps {
  equipos: Equipo[];
  inventarioId: string;
  onEditModal: (equipo: Equipo) => void;
  isLoading: boolean;
}

interface EditingCell {
  equipoId: string;
  field: keyof Equipo;
}

interface PastedEquipo {
  codigo?: string;
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
  isValid: boolean;
  errors: string[];
}

const EXPECTED_COLUMNS = [
  "Tipo", "Nombre", "Marca", "Modelo", "Nro. Serie", 
  "Fecha de alta del equipo", "Fecha de baja del equipo", 
  "Operativo (Si/No)", "Red /Línea", "Trajeta SIM"
];

export function EquipoEditableTable({ equipos, inventarioId, onEditModal, isLoading }: EquipoEditableTableProps) {
  const { updateEquipo, deleteEquipo, createEquipo } = useEquipos(inventarioId);
  const { toast } = useToast();
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [deleteEquipoId, setDeleteEquipoId] = useState<string | null>(null);
  const [pastedData, setPastedData] = useState<PastedEquipo[]>([]);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showPastePreview, setShowPastePreview] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [selectedSede, setSelectedSede] = useState("Arequipa");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [allowInsertCode, setAllowInsertCode] = useState(false);
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const tableRef = useRef<HTMLDivElement>(null);

  const handleStartEdit = (equipo: Equipo, field: keyof Equipo) => {
    setEditingCell({ equipoId: equipo.id, field });
    setEditValue(String(equipo[field] ?? ""));
  };

  const handleSaveEdit = useCallback((equipo: Equipo) => {
    if (!editingCell) return;
    
    const { field } = editingCell;
    let updateData: Partial<Equipo> = { id: equipo.id };
    
    if (field === "operativo") {
      updateData[field] = editValue === "true";
    } else if (field === "fecha_alta" || field === "fecha_baja") {
      updateData[field] = editValue || null;
    } else {
      (updateData as any)[field] = editValue || null;
    }
    
    updateEquipo.mutate(updateData as Partial<Equipo> & { id: string });
    setEditingCell(null);
  }, [editingCell, editValue, updateEquipo]);

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, equipo: Equipo) => {
    if (e.key === "Enter") {
      handleSaveEdit(equipo);
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const parseTipoFromName = (nombre: string): TipoEquipo => {
    const lowerName = nombre.toLowerCase();
    if (lowerName.includes("laptop") || lowerName.includes("portatil") || lowerName.includes("portátil")) return "LAPTOP";
    if (lowerName.includes("computadora") || lowerName.includes("pc") || lowerName.includes("desktop") || lowerName.includes("escritorio")) return "COMPUTADORA";
    if (lowerName.includes("celular") || lowerName.includes("telefono") || lowerName.includes("teléfono") || lowerName.includes("movil") || lowerName.includes("móvil")) return "CELULAR";
    if (lowerName.includes("camara") || lowerName.includes("cámara")) return "CAMARA";
    if (lowerName.includes("impresora") || lowerName.includes("printer")) return "IMPRESORA";
    if (lowerName.includes("monitor") || lowerName.includes("pantalla")) return "MONITOR";
    if (lowerName.includes("tablet") || lowerName.includes("ipad")) return "TABLET";
    if (lowerName.includes("router")) return "ROUTER";
    if (lowerName.includes("switch")) return "SWITCH";
    if (lowerName.includes("servidor") || lowerName.includes("server")) return "SERVIDOR";
    return "OTRO";
  };

  const parseDate = (dateStr: string): string => {
    if (!dateStr || dateStr.trim() === "" || dateStr === "-" || dateStr.toLowerCase() === "no aplica") return "";
    
    const cleanDate = dateStr.trim();
    
    // DD/MM/YYYY format
    const ddmmyyyy = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    
    // YYYY-MM-DD format (already correct)
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      return cleanDate;
    }
    
    // D/M/YYYY format
    const dmyyyy = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyyyy) {
      const [, day, month, year] = dmyyyy;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    
    return "";
  };

  const parseOperativo = (value: string): boolean => {
    const lower = value.toLowerCase().trim();
    return lower === "si" || lower === "sí" || lower === "yes" || lower === "true" || lower === "1" || lower === "x";
  };

  const validateAndParseData = (text: string, sede: string, includeCode: boolean): PastedEquipo[] => {
    const rows = text.split("\n").filter(row => row.trim());
    if (rows.length === 0) return [];

    // Skip header row if it looks like headers
    const firstRow = rows[0].toLowerCase();
    const startIndex = firstRow.includes("nombre") || firstRow.includes("marca") || firstRow.includes("modelo") || firstRow.includes("código") || firstRow.includes("codigo") ? 1 : 0;
    
    const parsed: PastedEquipo[] = [];
    
    for (let i = startIndex; i < rows.length; i++) {
      const cols = rows[i].split("\t");
      const errors: string[] = [];
      
      let colIndex = 0;
      
      // If including code, first column is Código
      const codigo = includeCode ? (cols[colIndex++]?.trim() || "") : undefined;
      
      // Expected order from Excel: [Código], Nombre, Marca, Modelo, Nro. Serie, Fecha Alta, Fecha Baja, Operativo, Red/Línea, Tarjeta SIM
      const nombre = cols[colIndex++]?.trim() || "";
      const marca = cols[colIndex++]?.trim() || "";
      const modelo = cols[colIndex++]?.trim() || "";
      const nro_serie = cols[colIndex++]?.trim() || "";
      const fecha_alta = parseDate(cols[colIndex++] || "");
      const fecha_baja = parseDate(cols[colIndex++] || "");
      const operativo = cols[colIndex] ? parseOperativo(cols[colIndex++]) : true;
      const red_linea = cols[colIndex++]?.trim() || "";
      const tarjeta_sim = cols[colIndex++]?.trim() || "";
      
      // Validations
      if (!nombre) {
        errors.push("El nombre es requerido");
      } else if (nombre.length > 200) {
        errors.push("El nombre es muy largo (máx. 200 caracteres)");
      }
      
      if (marca.length > 100) {
        errors.push("La marca es muy larga (máx. 100 caracteres)");
      }
      
      if (modelo.length > 100) {
        errors.push("El modelo es muy largo (máx. 100 caracteres)");
      }
      
      if (nro_serie.length > 100) {
        errors.push("El número de serie es muy largo (máx. 100 caracteres)");
      }

      if (includeCode && !codigo) {
        errors.push("El código es requerido cuando se permite insertar código");
      }
      
      // Skip completely empty rows
      if (!nombre && !marca && !modelo && !nro_serie) {
        continue;
      }
      
      const tipoEquipo = parseTipoFromName(nombre);
      
      const equipo: PastedEquipo = {
        codigo: includeCode ? codigo : undefined,
        sede,
        tipoEquipo,
        tipo: nombre, // Tipo equals nombre initially
        nombre,
        marca,
        modelo,
        nro_serie,
        fecha_alta,
        fecha_baja,
        operativo,
        red_linea,
        tarjeta_sim,
        isValid: errors.length === 0,
        errors,
      };
      
      parsed.push(equipo);
    }
    
    return parsed;
  };

  const handleOpenPasteModal = () => {
    setPasteText("");
    setPastedData([]);
    setImportProgress(0);
    setAllowInsertCode(false);
    setShowPasteModal(true);
  };

  const handleValidatePaste = () => {
    const parsed = validateAndParseData(pasteText, selectedSede, allowInsertCode);
    setPastedData(parsed);
    
    if (parsed.length === 0) {
      toast({
        title: "No se encontraron datos",
        description: "Asegúrese de pegar datos válidos desde Excel",
        variant: "destructive",
      });
      return;
    }
    
    setImportProgress(0);
    setShowPasteModal(false);
    setShowPastePreview(true);
  };

  const handleConfirmPaste = async () => {
    const validEquipos = pastedData.filter(eq => eq.isValid);
    
    if (validEquipos.length === 0) {
      toast({
        title: "No hay equipos válidos",
        description: "Corrija los errores antes de importar",
        variant: "destructive",
      });
      return;
    }
    
    setIsImporting(true);
    setImportProgress(0);
    let successCount = 0;
    let errorCount = 0;
    const totalCount = validEquipos.length;
    
    for (let i = 0; i < validEquipos.length; i++) {
      const equipo = validEquipos[i];
      try {
        await createEquipo.mutateAsync({
          inventario_id: inventarioId,
          codigo: allowInsertCode && equipo.codigo ? equipo.codigo : undefined,
          sede: equipo.sede,
          tipoEquipo: equipo.tipoEquipo,
          tipo: equipo.tipo,
          nombre: equipo.nombre,
          marca: equipo.marca || null,
          modelo: equipo.modelo || null,
          nro_serie: equipo.nro_serie || null,
          fecha_alta: equipo.fecha_alta || null,
          fecha_baja: equipo.fecha_baja || null,
          operativo: equipo.operativo,
          red_linea: equipo.red_linea || null,
          tarjeta_sim: equipo.tarjeta_sim || null,
        });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error("Error creating equipo:", error);
      }
      setImportProgress(Math.round(((i + 1) / totalCount) * 100));
    }
    
    setIsImporting(false);
    
    if (successCount > 0) {
      toast({
        title: `${successCount} equipo(s) importados exitosamente`,
        description: errorCount > 0 ? `${errorCount} equipo(s) fallaron` : undefined,
      });
    }
    
    setPastedData([]);
    setPasteText("");
    setImportProgress(0);
    setShowPastePreview(false);
  };

  const renderEditableCell = (equipo: Equipo, field: keyof Equipo, displayValue: React.ReactNode) => {
    const isEditing = editingCell?.equipoId === equipo.id && editingCell?.field === field;
    
    if (isEditing) {
      if (field === "operativo") {
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={editValue === "true"}
              onCheckedChange={(checked) => setEditValue(String(checked))}
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveEdit(equipo)}>
              <Save className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      }
      
      if (field === "sede") {
        return (
          <div className="flex items-center gap-1">
            <Select value={editValue} onValueChange={(v) => { setEditValue(v); }}>
              <SelectTrigger className="h-8 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEDES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveEdit(equipo)}>
              <Save className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      }
      
      if (field === "fecha_alta" || field === "fecha_baja") {
        return (
          <div className="flex items-center gap-1">
            <Input
              type="date"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-8 w-32"
              onKeyDown={(e) => handleKeyDown(e, equipo)}
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveEdit(equipo)}>
              <Save className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      }
      
      return (
        <div className="flex items-center gap-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-8"
            onKeyDown={(e) => handleKeyDown(e, equipo)}
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveEdit(equipo)}>
            <Save className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }
    
    return (
      <div 
        className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -mx-2 -my-1 min-h-[28px] flex items-center"
        onClick={() => handleStartEdit(equipo, field)}
      >
        {displayValue}
      </div>
    );
  };

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, "all"] as const;
  type PageSizeOption = typeof PAGE_SIZE_OPTIONS[number];
  
  const [pageSize, setPageSize] = useState<PageSizeOption>(25);
  const [currentPage, setCurrentPage] = useState(1);

  const validCount = pastedData.filter(eq => eq.isValid).length;
  const invalidCount = pastedData.filter(eq => !eq.isValid).length;

  // Get unique tipos for filter
  const uniqueTipos = Array.from(new Set(equipos.map(eq => eq.tipo).filter(Boolean))).sort();

  // Filter equipos by tipo and search query
  const filteredEquipos = equipos.filter(eq => {
    // Filter by tipo
    if (tipoFilter !== "all" && eq.tipo !== tipoFilter) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const searchFields = [
        eq.codigo,
        eq.nombre,
        eq.sede,
        eq.marca,
        eq.modelo,
        eq.nro_serie,
        eq.fecha_alta,
        eq.fecha_baja,
        eq.operativo ? "si" : "no",
        eq.operativo ? "sí" : "",
        eq.operativo ? "operativo" : "no operativo",
        eq.red_linea,
        eq.tarjeta_sim,
      ];
      
      const matchesSearch = searchFields.some(field => 
        field && field.toString().toLowerCase().includes(query)
      );
      
      if (!matchesSearch) {
        return false;
      }
    }
    
    return true;
  });

  // Pagination logic
  const totalItems = filteredEquipos.length;
  const effectivePageSize = pageSize === "all" ? totalItems : pageSize;
  const totalPages = pageSize === "all" ? 1 : Math.ceil(totalItems / effectivePageSize);
  const startIndex = (currentPage - 1) * effectivePageSize;
  const endIndex = startIndex + effectivePageSize;
  const paginatedEquipos = filteredEquipos.slice(startIndex, endIndex);

  // Reset to page 1 when page size or filter changes
  const handlePageSizeChange = (newSize: string) => {
    const size = newSize === "all" ? "all" : parseInt(newSize) as PageSizeOption;
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleTipoFilterChange = (newTipo: string) => {
    setTipoFilter(newTipo);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Haga clic en cualquier celda para editar directamente.
            </p>
            
            {/* Multi-field Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, nombre, marca, modelo, etc."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-8 w-80 pl-8"
                />
              </div>
            </div>
            
            {/* Tipo Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Filtrar por Tipo:</Label>
              <Select value={tipoFilter} onValueChange={handleTipoFilterChange}>
                <SelectTrigger className="h-8 w-40">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {uniqueTipos.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tipoFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  {filteredEquipos.length} de {equipos.length}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Mostrar:</Label>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-8 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size === "all" ? "Todo" : size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleOpenPasteModal}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Importar desde Excel
          </Button>
        </div>
        
        <div 
          ref={tableRef}
          className="rounded-md border overflow-x-auto"
        >
          {filteredEquipos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {tipoFilter !== "all" 
                ? `No hay equipos con tipo "${tipoFilter}". Seleccione otro filtro.`
                : "No hay equipos en este inventario. Agregue equipos o importe datos desde Excel."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Nro. Serie</TableHead>
                  <TableHead>F. Alta</TableHead>
                  <TableHead>F. Baja</TableHead>
                  <TableHead>Operativo</TableHead>
                  <TableHead>Red/Línea</TableHead>
                  <TableHead>Tarjeta SIM</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEquipos.map((equipo) => (
                  <TableRow key={equipo.id}>
                    <TableCell className="font-mono font-medium">{equipo.codigo}</TableCell>
                    <TableCell>
                      {renderEditableCell(equipo, "tipo", equipo.tipo)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(equipo, "nombre", equipo.nombre)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(equipo, "sede", equipo.sede)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(equipo, "marca", equipo.marca || "-")}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(equipo, "modelo", equipo.modelo || "-")}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(equipo, "nro_serie", equipo.nro_serie || "-")}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(
                        equipo, 
                        "fecha_alta", 
                        equipo.fecha_alta ? format(new Date(equipo.fecha_alta), "dd/MM/yyyy") : "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(
                        equipo, 
                        "fecha_baja", 
                        equipo.fecha_baja ? format(new Date(equipo.fecha_baja), "dd/MM/yyyy") : "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(
                        equipo, 
                        "operativo", 
                        equipo.operativo ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-destructive" />
                        )
                      )}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(equipo, "red_linea", equipo.red_linea || "-")}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(equipo, "tarjeta_sim", equipo.tarjeta_sim || "-")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => onEditModal(equipo)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar en modal</TooltipContent>
                        </Tooltip>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteEquipoId(equipo.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination controls */}
        {equipos.length > 0 && pageSize !== "all" && totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Mostrando {startIndex + 1} - {Math.min(endIndex, totalItems)} de {totalItems} equipos
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="px-2">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}

        {/* Delete Equipo Confirmation */}
        <AlertDialog open={!!deleteEquipoId} onOpenChange={() => setDeleteEquipoId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  if (deleteEquipoId) deleteEquipo.mutate(deleteEquipoId);
                  setDeleteEquipoId(null);
                }}
                className="bg-destructive text-destructive-foreground"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Paste Modal */}
        <Dialog open={showPasteModal} onOpenChange={setShowPasteModal}>
          <DialogContent className="w-[95vw] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Importar desde Excel
              </DialogTitle>
              <DialogDescription>
                Copie los datos desde Excel y péguelos en el área de texto. La estructura esperada es:
                <br />
                <span className="font-mono text-xs">
                  {allowInsertCode ? "Código | " : ""}Nombre | Marca | Modelo | Nro. Serie | Fecha Alta | Fecha Baja | Operativo | Red/Línea | Tarjeta SIM
                </span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sede para todos los equipos *</Label>
                  <Select value={selectedSede} onValueChange={setSelectedSede}>
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
                
                <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
                  <Switch
                    id="allow-insert-code"
                    checked={allowInsertCode}
                    onCheckedChange={setAllowInsertCode}
                  />
                  <div className="flex-1">
                    <Label htmlFor="allow-insert-code" className="cursor-pointer font-medium">
                      Permitir insertar Código
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Incluye la columna Código desde Excel en lugar de generarlo automáticamente
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Datos desde Excel (Ctrl+V para pegar)</Label>
                <Textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={allowInsertCode 
                    ? "Pegue aquí los datos copiados desde Excel incluyendo la columna Código...&#10;&#10;Ejemplo:&#10;AQP-LAP-001	Laptop	Lenovo	ThinkPad L480	20LTS0B200	15/06/2023		Si		&#10;AQP-PC-001	Computadora	PC Compatible	ASUS 1401 i5 10	No Aplica	2/07/2024		Si		"
                    : "Pegue aquí los datos copiados desde Excel...&#10;&#10;Ejemplo:&#10;Laptop	Lenovo	ThinkPad L480	20LTS0B200	15/06/2023		Si		&#10;Computadora de Escritorio	PC Compatible	ASUS 1401 i5 10	No Aplica	2/07/2024		Si		"
                  }
                  className="min-h-[250px] font-mono text-sm"
                />
              </div>
              
              <div className="bg-muted/50 p-3 rounded-md text-sm">
                <p className="font-medium mb-1">Instrucciones:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {allowInsertCode ? (
                    <>
                      <li>Seleccione las filas en Excel <strong>incluyendo la columna Código</strong></li>
                      <li>El código se usará tal como viene desde Excel</li>
                    </>
                  ) : (
                    <>
                      <li>Seleccione las filas en Excel (sin incluir el código)</li>
                      <li>El código se generará automáticamente</li>
                    </>
                  )}
                  <li>Copie con Ctrl+C y pegue aquí con Ctrl+V</li>
                  <li>El tipo de equipo se detecta automáticamente según el nombre</li>
                </ul>
              </div>
            </div>
            
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setShowPasteModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleValidatePaste} disabled={!pasteText.trim()}>
                Validar datos
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Paste Preview Dialog */}
        <Dialog open={showPastePreview} onOpenChange={(open) => !isImporting && setShowPastePreview(open)}>
          <DialogContent className="w-[95vw] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Vista previa de datos a importar</DialogTitle>
              <DialogDescription className="flex items-center gap-4 flex-wrap">
                <span>Se encontraron {pastedData.length} registros.</span>
                {validCount > 0 && (
                  <Badge variant="default" className="bg-green-500">
                    {validCount} válidos
                  </Badge>
                )}
                {invalidCount > 0 && (
                  <Badge variant="destructive">
                    {invalidCount} con errores
                  </Badge>
                )}
                {allowInsertCode && (
                  <Badge variant="outline">
                    Con código personalizado
                  </Badge>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto rounded-md border">
              <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[50px]">Estado</TableHead>
                      {allowInsertCode && <TableHead>Código</TableHead>}
                      <TableHead>Sede</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Nro. Serie</TableHead>
                      <TableHead>F. Alta</TableHead>
                      <TableHead>F. Baja</TableHead>
                      <TableHead>Operativo</TableHead>
                      <TableHead>Red/Línea</TableHead>
                      <TableHead>SIM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastedData.map((eq, idx) => (
                      <TableRow key={idx} className={!eq.isValid ? "bg-destructive/10" : ""}>
                        <TableCell>
                          {eq.isValid ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <ul className="text-xs">
                                  {eq.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        {allowInsertCode && (
                          <TableCell className="font-mono text-xs">
                            {eq.codigo || <span className="text-destructive">Vacío</span>}
                          </TableCell>
                        )}
                        <TableCell>{eq.sede}</TableCell>
                        <TableCell className="text-xs">
                          {TIPOS_EQUIPO.find(t => t.value === eq.tipoEquipo)?.label || eq.tipoEquipo}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate" title={eq.nombre}>
                          {eq.nombre || <span className="text-destructive">Vacío</span>}
                        </TableCell>
                        <TableCell>{eq.marca || "-"}</TableCell>
                        <TableCell>{eq.modelo || "-"}</TableCell>
                        <TableCell>{eq.nro_serie || "-"}</TableCell>
                        <TableCell>{eq.fecha_alta || "-"}</TableCell>
                        <TableCell>{eq.fecha_baja || "-"}</TableCell>
                        <TableCell>{eq.operativo ? "Sí" : "No"}</TableCell>
                        <TableCell>{eq.red_linea || "-"}</TableCell>
                        <TableCell>{eq.tarjeta_sim || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            {invalidCount > 0 && !isImporting && (
              <div className="bg-destructive/10 p-3 rounded-md text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Hay {invalidCount} registros con errores</p>
                  <p className="text-muted-foreground">Solo se importarán los {validCount} registros válidos.</p>
                </div>
              </div>
            )}
            
            {isImporting && (
              <div className="space-y-2 p-3 rounded-md border bg-muted/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Importando equipos...</span>
                  <span className="text-muted-foreground">{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Por favor espere mientras se importan los equipos. No cierre esta ventana.
                </p>
              </div>
            )}
            
            <DialogFooter className="pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPastePreview(false);
                  setShowPasteModal(true);
                }}
                disabled={isImporting}
              >
                Volver a editar
              </Button>
              <Button variant="outline" onClick={() => {
                setPastedData([]);
                setShowPastePreview(false);
              }} disabled={isImporting}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmPaste} 
                disabled={validCount === 0 || isImporting}
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importando... {importProgress}%
                  </>
                ) : (
                  <>Importar {validCount} equipos</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
