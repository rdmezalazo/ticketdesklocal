import { useState, useRef, useMemo, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Printer, 
  Download, 
  Search, 
  Filter,
  Calendar,
  Check,
  X,
  Save,
  ChevronsUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useMaintenancePlan, MaintenanceItem } from "@/hooks/useMaintenancePlan";
import { useEquipos } from "@/hooks/useInventario";
import { useSettings } from "@/hooks/useSettings";
import { useUsers } from "@/hooks/useUsers";
import { useAssignedEquipment } from "@/hooks/useEquipmentAssignments";
import { cn } from "@/lib/utils";
import logoHoriz from "@/assets/logo_horiz.jpg";

const MONTHS = [
  { num: 1, label: "ENE" },
  { num: 2, label: "FEB" },
  { num: 3, label: "MAR" },
  { num: 4, label: "ABR" },
  { num: 5, label: "MAY" },
  { num: 6, label: "JUN" },
  { num: 7, label: "JUL" },
  { num: 8, label: "AGO" },
  { num: 9, label: "SET" },
  { num: 10, label: "OCT" },
  { num: 11, label: "NOV" },
  { num: 12, label: "DIC" },
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export default function MaintenancePlan() {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [searchQuery, setSearchQuery] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaintenanceItem | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const {
    items,
    config,
    loading,
    createItem,
    updateItem,
    deleteItem,
    updateSchedule,
    upsertConfig,
    getSchedule,
  } = useMaintenancePlan(selectedYear);

  const { equipos } = useEquipos();
  const { systemAreas } = useSettings();
  const { users, fetchUsers } = useUsers();
  const { assignedItems } = useAssignedEquipment();

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Popover states for searchable dropdowns
  const [codigoOpen, setCodigoOpen] = useState(false);
  const [responsableOpen, setResponsableOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [codigoSearch, setCodigoSearch] = useState("");
  const [responsableSearch, setResponsableSearch] = useState("");
  const [areaSearch, setAreaSearch] = useState("");
  const [inlineCodigoOpen, setInlineCodigoOpen] = useState(false);
  const [inlineCodigoSearch, setInlineCodigoSearch] = useState("");

  // Get unique values for filters
  const uniqueAreas = Array.from(new Set(items.map((i) => i.area))).sort();
  const uniqueTipos = Array.from(new Set(equipos.map((e) => e.tipo).filter(Boolean))).sort();

  // Active system areas for dropdown
  const activeSystemAreas = useMemo(() => 
    systemAreas.filter(area => area.is_active).sort((a, b) => a.name.localeCompare(b.name)),
    [systemAreas]
  );

  // Filter equipos by code or type for searchable dropdown
  const filteredEquipos = useMemo(() => {
    if (!codigoSearch) return equipos;
    const search = codigoSearch.toLowerCase();
    return equipos.filter(e => 
      e.codigo?.toLowerCase().includes(search) || 
      e.tipo?.toLowerCase().includes(search)
    );
  }, [equipos, codigoSearch]);

  // Filter users for searchable dropdown
  const filteredUsers = useMemo(() => {
    if (!responsableSearch) return users;
    const search = responsableSearch.toLowerCase();
    return users.filter(u => 
      u.full_name.toLowerCase().includes(search) || 
      u.email.toLowerCase().includes(search) ||
      u.area?.toLowerCase().includes(search)
    );
  }, [users, responsableSearch]);

  // Filter areas for searchable dropdown
  const filteredAreas = useMemo(() => {
    if (!areaSearch) return activeSystemAreas;
    const search = areaSearch.toLowerCase();
    return activeSystemAreas.filter(a => a.name.toLowerCase().includes(search));
  }, [activeSystemAreas, areaSearch]);

  const inlineFilteredEquipos = useMemo(() => {
    if (!inlineCodigoSearch) return equipos;
    const search = inlineCodigoSearch.toLowerCase();
    return equipos.filter(e => 
      e.codigo?.toLowerCase().includes(search) || 
      e.tipo?.toLowerCase().includes(search)
    );
  }, [equipos, inlineCodigoSearch]);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    area: "",
    tipo_equipo: "",
    cargo_responsable: "",
    codigo_equipo: "",
    actividad: "",
    tipo: "Interno" as "Interno" | "Externo",
    observaciones: "",
    mes_programado: "none" as "none" | `${number}`,
    is_programado: false,
    is_ejecutado: false,
  });

  // Nota: en edición, los checks P/E se cargan al cambiar el mes.

  // Inline "Notion-style" add row
  const [isInlineAddOpen, setIsInlineAddOpen] = useState(false);
  const [inlineData, setInlineData] = useState({
    area: "",
    tipo_equipo: "",
    cargo_responsable: "none" as "none" | string,
    codigo_equipo: "none" as "none" | string,
    actividad: "",
    tipo: "Interno" as "Interno" | "Externo",
    observaciones: "",
    mes_programado: "none" as "none" | `${number}`,
  });

  // Config form state
  const [configForm, setConfigForm] = useState({
    code: config?.code || "L-TI-PRG-001",
    version: config?.version || "1.0",
    date: config?.date || new Date().toLocaleDateString("es-PE"),
    elaborado_por: config?.elaborado_por || "",
    puesto_trabajo: config?.puesto_trabajo || "",
  });

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tipo_equipo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.actividad.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.codigo_equipo?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (item.cargo_responsable?.toLowerCase() || "").includes(searchQuery.toLowerCase());

    const matchesTipo = tipoFilter === "all" || item.tipo === tipoFilter;
    const matchesArea = areaFilter === "all" || item.area === areaFilter;

    return matchesSearch && matchesTipo && matchesArea;
  });

  const handleAddItem = () => {
    setFormData({
      area: "",
      tipo_equipo: "",
      cargo_responsable: "",
      codigo_equipo: "",
      actividad: "",
      tipo: "Interno",
      observaciones: "",
      mes_programado: "none",
      is_programado: false,
      is_ejecutado: false,
    });
    setEditingItem(null);
    setIsAddModalOpen(true);
  };

  const handleOpenInlineAdd = () => {
    setInlineData({
      area: "",
      tipo_equipo: "",
      cargo_responsable: "none",
      codigo_equipo: "none",
      actividad: "",
      tipo: "Interno",
      observaciones: "",
      mes_programado: "none",
    });
    setIsInlineAddOpen(true);
  };

  const handleSaveInlineAdd = async () => {
    if (!inlineData.area || !inlineData.tipo_equipo || !inlineData.actividad) {
      toast.error("Área, Tipo de Equipo y Actividad son requeridos");
      return;
    }

    const created = await createItem.mutateAsync({
      year: selectedYear,
      area: inlineData.area,
      tipo_equipo: inlineData.tipo_equipo,
      cargo_responsable: inlineData.cargo_responsable === "none" ? "" : inlineData.cargo_responsable,
      codigo_equipo: inlineData.codigo_equipo === "none" ? "" : inlineData.codigo_equipo,
      actividad: inlineData.actividad,
      tipo: inlineData.tipo,
      observaciones: inlineData.observaciones,
    });

    const month = inlineData.mes_programado !== "none" ? Number(inlineData.mes_programado) : null;
    if (month && month >= 1 && month <= 12) {
      await updateSchedule.mutateAsync({
        itemId: created.id,
        month,
        isProgramado: true,
      });
    }

    setIsInlineAddOpen(false);
  };

  const handleEditItem = (item: MaintenanceItem) => {
    const initialMonth =
      MONTHS.find((m) => {
        const s = getSchedule(item.id, m.num);
        return !!s?.is_programado || !!s?.is_ejecutado;
      })?.num ?? null;

    const initialSchedule = initialMonth ? getSchedule(item.id, initialMonth) : undefined;

    setFormData({
      area: item.area,
      tipo_equipo: item.tipo_equipo,
      cargo_responsable: item.cargo_responsable || "",
      codigo_equipo: item.codigo_equipo || "",
      actividad: item.actividad,
      tipo: item.tipo,
      observaciones: item.observaciones || "",
      mes_programado: initialMonth ? (String(initialMonth) as `${number}`) : "none",
      is_programado: !!initialSchedule?.is_programado,
      is_ejecutado: !!initialSchedule?.is_ejecutado,
    });
    setEditingItem(item);
    setIsAddModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!formData.area || !formData.tipo_equipo || !formData.actividad) {
      toast.error("Área, Tipo de Equipo y Actividad son requeridos");
      return;
    }

    if (editingItem) {
      await updateItem.mutateAsync({
        id: editingItem.id,
        area: formData.area,
        tipo_equipo: formData.tipo_equipo,
        cargo_responsable: formData.cargo_responsable,
        codigo_equipo: formData.codigo_equipo,
        actividad: formData.actividad,
        tipo: formData.tipo,
        observaciones: formData.observaciones,
      });

      const month = formData.mes_programado !== "none" ? Number(formData.mes_programado) : null;
      if (month && month >= 1 && month <= 12) {
        const isEjecutado = !!formData.is_ejecutado;
        const isProgramado = isEjecutado ? true : !!formData.is_programado;
        await updateSchedule.mutateAsync({
          itemId: editingItem.id,
          month,
          isProgramado,
          isEjecutado,
        });
      }
    } else {
      const created = await createItem.mutateAsync({
        year: selectedYear,
        area: formData.area,
        tipo_equipo: formData.tipo_equipo,
        cargo_responsable: formData.cargo_responsable,
        codigo_equipo: formData.codigo_equipo,
        actividad: formData.actividad,
        tipo: formData.tipo,
        observaciones: formData.observaciones,
      });

      const month = formData.mes_programado !== "none" ? Number(formData.mes_programado) : null;
      if (month && month >= 1 && month <= 12) {
        await updateSchedule.mutateAsync({
          itemId: created.id,
          month,
          isProgramado: true,
        });
      }
    }

    setIsAddModalOpen(false);
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm("¿Está seguro de eliminar este ítem?")) {
      await deleteItem.mutateAsync(id);
    }
  };

  const handleToggleProgramado = async (itemId: string, month: number) => {
    const schedule = getSchedule(itemId, month);
    await updateSchedule.mutateAsync({
      itemId,
      month,
      isProgramado: !schedule?.is_programado,
    });
  };

  const handleToggleEjecutado = async (itemId: string, month: number) => {
    const schedule = getSchedule(itemId, month);
    await updateSchedule.mutateAsync({
      itemId,
      month,
      isEjecutado: !schedule?.is_ejecutado,
    });
  };

  const handleSaveConfig = async () => {
    await upsertConfig.mutateAsync(configForm);
    setIsConfigModalOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;

    try {
      toast.loading("Generando PDF...", { id: "pdf-generation" });

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 5;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`Plan_Mantenimiento_${selectedYear}.pdf`);

      toast.success("PDF descargado correctamente", { id: "pdf-generation" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF", { id: "pdf-generation" });
    }
  };

  const displayConfig = config || {
    code: "L-TI-PRG-001",
    version: "1.0",
    date: new Date().toLocaleDateString("es-PE"),
    elaborado_por: "",
    puesto_trabajo: "",
    fecha_actualizacion: new Date().toLocaleDateString("es-PE"),
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Plan de Mantenimiento</h1>
          <p className="text-muted-foreground">
            Gestiona el programa anual de mantenimiento de equipos
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => {
            setConfigForm({
              code: config?.code || "L-TI-PRG-001",
              version: config?.version || "1.0",
              date: config?.date || new Date().toLocaleDateString("es-PE"),
              elaborado_por: config?.elaborado_por || "",
              puesto_trabajo: config?.puesto_trabajo || "",
            });
            setIsConfigModalOpen(true);
          }}>
            <Edit2 className="h-4 w-4 mr-2" />
            Configurar
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por área, equipo, actividad, código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Áreas</SelectItem>
                {uniqueAreas.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Tipos</SelectItem>
                <SelectItem value="Interno">Interno</SelectItem>
                <SelectItem value="Externo">Externo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{items.length}</div>
            <div className="text-sm text-muted-foreground">Total Equipos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">
              {items.reduce((acc, item) => {
                return acc + MONTHS.filter((m) => getSchedule(item.id, m.num)?.is_programado).length;
              }, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Programados (P)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {items.reduce((acc, item) => {
                return acc + MONTHS.filter((m) => getSchedule(item.id, m.num)?.is_ejecutado).length;
              }, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Ejecutados (E)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {items.filter((i) => i.tipo === "Interno").length} / {items.filter((i) => i.tipo === "Externo").length}
            </div>
            <div className="text-sm text-muted-foreground">Interno / Externo</div>
          </CardContent>
        </Card>
      </div>

      {/* Printable Report */}
      <div ref={printRef} className="bg-white print:block">
        {/* Report Header */}
        <div className="border-2 border-black mb-0 print:mb-0">
          <div className="flex">
            <div className="w-36 border-r-2 border-black p-2 flex items-center justify-center">
              <img src={logoHoriz} alt="Logo" className="h-14 object-contain" />
            </div>
            <div className="flex-1 flex items-center justify-center border-r-2 border-black">
              <h1 className="text-lg font-bold text-center px-4">
                PROGRAMA ANUAL DE MANTENIMIENTO DE EQUIPOS DE CÓMPUTO Y OTROS
              </h1>
            </div>
            <div className="w-44 text-xs">
              <div className="border-b border-black p-1">
                <span className="font-semibold">Código:</span> {displayConfig.code}
              </div>
              <div className="border-b border-black p-1">
                <span className="font-semibold">Versión:</span> {displayConfig.version}
              </div>
              <div className="p-1">
                <span className="font-semibold">Fecha:</span> {displayConfig.date}
              </div>
            </div>
          </div>
        </div>

        {/* Elaborado por section */}
        <div className="border-x-2 border-b-2 border-black mb-4 print:mb-2">
          <div className="flex text-sm">
            <div className="flex items-center border-r-2 border-black px-3 py-1">
              <span className="font-semibold">Elaborado por:</span>
              <span className="ml-2">{displayConfig.elaborado_por || "—"}</span>
            </div>
            <div className="flex items-center border-r-2 border-black px-3 py-1">
              <span className="font-semibold italic">Puesto de trabajo</span>
              <span className="ml-2">{displayConfig.puesto_trabajo || "—"}</span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center px-3 py-1">
              <span className="font-semibold">Fecha Actualización:</span>
              <span className="ml-2">{displayConfig.fecha_actualizacion || config?.fecha_actualizacion || "—"}</span>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="overflow-x-auto">
          <Table className="border-2 border-black text-xs">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="border border-black text-center font-bold w-10" rowSpan={2}>
                  N°
                </TableHead>
                <TableHead className="border border-black text-center font-bold w-20" rowSpan={2}>
                  ÁREA
                </TableHead>
                <TableHead className="border border-black text-center font-bold" rowSpan={2}>
                  TIPO DE EQUIPO
                </TableHead>
                <TableHead className="border border-black text-center font-bold" rowSpan={2}>
                  CARGO DEL RESPONSABLE
                </TableHead>
                <TableHead className="border border-black text-center font-bold" rowSpan={2}>
                  CODIGO DEL EQUIPO
                </TableHead>
                <TableHead className="border border-black text-center font-bold" rowSpan={2}>
                  ACTIVIDAD
                </TableHead>
                <TableHead className="border border-black text-center font-bold w-20" rowSpan={2}>
                  TIPO<br />(Interno o Externo)
                </TableHead>
                <TableHead className="border border-black text-center font-bold" colSpan={12}>
                  AÑO {selectedYear}
                </TableHead>
                <TableHead className="border border-black text-center font-bold" rowSpan={2}>
                  OBSERVACIONES
                </TableHead>
                <TableHead className="border border-black text-center font-bold w-20 print:hidden" rowSpan={2}>
                  ACCIONES
                </TableHead>
              </TableRow>
              <TableRow className="bg-muted/50">
                {MONTHS.map((m) => (
                  <TableHead key={m.num} className="border border-black text-center font-bold w-8 p-1">
                    {m.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={21} className="text-center py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={21} className="text-center py-8 text-muted-foreground">
                    No hay equipos en el plan. Haga clic en "Agregar" para comenzar.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="border border-black text-center">{index + 1}</TableCell>
                    <TableCell className="border border-black text-center">{item.area}</TableCell>
                    <TableCell className="border border-black text-center">{item.tipo_equipo}</TableCell>
                    <TableCell className="border border-black text-center">{item.cargo_responsable || "—"}</TableCell>
                    <TableCell className="border border-black text-center font-mono">{item.codigo_equipo || "—"}</TableCell>
                    <TableCell className="border border-black text-center">{item.actividad}</TableCell>
                    <TableCell className="border border-black text-center">{item.tipo}</TableCell>
                    {MONTHS.map((m) => {
                      const schedule = getSchedule(item.id, m.num);
                      return (
                        <TableCell
                          key={m.num}
                          className="border border-black p-0 text-center cursor-pointer print:cursor-default"
                        >
                          <div className="flex flex-col">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleToggleProgramado(item.id, m.num)}
                                  className={`text-xs font-bold py-0.5 hover:bg-yellow-200 transition-colors print:hover:bg-transparent ${
                                    schedule?.is_programado ? "bg-yellow-300" : ""
                                  }`}
                                >
                                  {schedule?.is_programado ? "P" : ""}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{schedule?.is_programado ? "Quitar Programado" : "Marcar Programado"}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleToggleEjecutado(item.id, m.num)}
                                  className={`text-xs font-bold py-0.5 hover:bg-green-200 transition-colors print:hover:bg-transparent ${
                                    schedule?.is_ejecutado ? "bg-green-300" : ""
                                  }`}
                                >
                                  {schedule?.is_ejecutado ? "E" : ""}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{schedule?.is_ejecutado ? "Quitar Ejecutado" : "Marcar Ejecutado"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell className="border border-black text-center text-xs">
                      {item.observaciones || ""}
                    </TableCell>
                    <TableCell className="border border-black text-center print:hidden">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleEditItem(item)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}

              {/* Inline add row (Notion-style) */}
              {isInlineAddOpen && !loading && (
                <TableRow className="print:hidden">
                  <TableCell className="border border-black text-center text-muted-foreground">—</TableCell>
                  <TableCell className="border border-black p-1">
                    <Select value={inlineData.area} onValueChange={(v) => setInlineData((p) => ({ ...p, area: v }))}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Área *" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeSystemAreas.map((a) => (
                          <SelectItem key={a.id} value={a.name}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="border border-black p-1">
                    <Input
                      className="h-8"
                      value={inlineData.tipo_equipo}
                      onChange={(e) => setInlineData((p) => ({ ...p, tipo_equipo: e.target.value }))}
                      placeholder="Tipo de equipo *"
                    />
                  </TableCell>
                  <TableCell className="border border-black p-1">
                    <Select
                      value={inlineData.cargo_responsable}
                      onValueChange={(v) => setInlineData((p) => ({ ...p, cargo_responsable: v }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Responsable" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {users.slice(0, 100).map((u) => (
                          <SelectItem key={u.user_id} value={u.full_name}>
                            {u.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="border border-black p-1">
              <Popover open={inlineCodigoOpen} onOpenChange={setInlineCodigoOpen}>
                <PopoverTrigger asChild>
                  <div className="relative w-full">
                    <Input
                      placeholder="Seleccionar equipo"
                      value={inlineCodigoSearch || (inlineData.codigo_equipo !== 'none' ? inlineData.codigo_equipo : '')}
                      onChange={(e) => {
                        setInlineCodigoSearch(e.target.value);
                        if (e.target.value === '') {
                            setInlineData(p => ({...p, codigo_equipo: 'none', area: '', tipo_equipo: '', cargo_responsable: 'none'}));
                        }
                      }}
                      onFocus={() => setInlineCodigoOpen(true)}
                      className="h-8 text-xs w-full"
                    />
                    <ChevronsUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" onPointerDown={(e) => e.preventDefault()}>
                  <Command>
                    <CommandEmpty>No se encontró equipo.</CommandEmpty>
                    <CommandGroup>
                      {inlineFilteredEquipos.slice(0, 200).map((equipo) => (
                        <CommandItem
                          value={equipo.codigo}
                          key={equipo.id}
                          onSelect={(currentValue) => {
                            const selectedEquipo = equipos.find(
                              (e) => e.codigo.toLowerCase() === currentValue.toLowerCase()
                            );
                            if (selectedEquipo) {
                              setInlineData((p) => ({
                                ...p,
                                codigo_equipo: selectedEquipo.codigo,
                                area: selectedEquipo.sede,
                                tipo_equipo: selectedEquipo.tipo,
                                cargo_responsable:
                                  assignedItems.find(
                                    (item) => item.equipo_id === selectedEquipo.id
                                  )?.equipment_assignments.worker_position || "",
                              }));
                            }
                            setInlineCodigoOpen(false);
                            setInlineCodigoSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              inlineData.codigo_equipo === equipo.codigo
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {equipo.codigo}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </TableCell>
                  <TableCell className="border border-black p-1">
                    <Input
                      className="h-8"
                      value={inlineData.actividad}
                      onChange={(e) => setInlineData((p) => ({ ...p, actividad: e.target.value }))}
                      placeholder="Actividad *"
                    />
                  </TableCell>
                  <TableCell className="border border-black p-1">
                    <Select
                      value={inlineData.tipo}
                      onValueChange={(v) => setInlineData((p) => ({ ...p, tipo: v as "Interno" | "Externo" }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Interno">Interno</SelectItem>
                        <SelectItem value="Externo">Externo</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Months cells (empty on inline add) */}
                  {MONTHS.map((m) => (
                    <TableCell key={m.num} className="border border-black p-0 text-center text-muted-foreground">
                      &nbsp;
                    </TableCell>
                  ))}

                  <TableCell className="border border-black p-1">
                    <div className="flex flex-col gap-2">
                      <Input
                        className="h-8"
                        value={inlineData.observaciones}
                        onChange={(e) => setInlineData((p) => ({ ...p, observaciones: e.target.value }))}
                        placeholder="Observaciones"
                      />
                      <Select
                        value={inlineData.mes_programado}
                        onValueChange={(v) => setInlineData((p) => ({ ...p, mes_programado: v as "none" | `${number}` }))}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Mes (P)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin programar</SelectItem>
                          {MONTHS.map((mm) => (
                            <SelectItem key={mm.num} value={String(mm.num)}>
                              {mm.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>

                  <TableCell className="border border-black p-1 print:hidden">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={handleSaveInlineAdd}
                        disabled={createItem.isPending}
                      >
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => setIsInlineAddOpen(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Notion-style add row button */}
        <div className="mt-2 print:hidden">
          {!isInlineAddOpen ? (
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={handleOpenInlineAdd}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva fila
            </Button>
          ) : (
            <div className="text-xs text-muted-foreground px-2">
              Completa la fila y pulsa “Guardar”.
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex gap-6 text-sm print:text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-300 border border-black flex items-center justify-center font-bold">
              P
            </div>
            <span>= Programado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-300 border border-black flex items-center justify-center font-bold">
              E
            </div>
            <span>= Ejecutado</span>
          </div>
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => {
        setIsAddModalOpen(open);
        if (!open) {
          setCodigoSearch("");
          setResponsableSearch("");
          setAreaSearch("");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Ítem" : "Agregar Ítem al Plan de Mantenimiento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Código del Equipo - Searchable by code or type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Código del Equipo</Label>
                <Popover open={codigoOpen} onOpenChange={setCodigoOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={codigoOpen}
                      className="w-full justify-between font-normal"
                    >
                      {formData.codigo_equipo || "Buscar código o tipo..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Buscar por código o tipo..." 
                        value={codigoSearch}
                        onValueChange={setCodigoSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontró equipo</CommandEmpty>
                        <CommandGroup>
                          {filteredEquipos.slice(0, 50).map((equipo) => (
                            <CommandItem
                              key={equipo.id}
                              value={`${equipo.codigo}-${equipo.tipo}`}
                              onSelect={() => {
                                setFormData({ 
                                  ...formData, 
                                  codigo_equipo: equipo.codigo,
                                  tipo_equipo: equipo.tipo || formData.tipo_equipo
                                });
                                setCodigoOpen(false);
                                setCodigoSearch("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.codigo_equipo === equipo.codigo ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{equipo.codigo}</span>
                                <span className="text-xs text-muted-foreground">
                                  {equipo.tipo} - {equipo.nombre}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Tipo de Equipo *</Label>
                <Input
                  value={formData.tipo_equipo}
                  onChange={(e) => setFormData({ ...formData, tipo_equipo: e.target.value })}
                  placeholder="Se llena al seleccionar código"
                  className="bg-muted/50"
                />
              </div>
            </div>

            {/* Programación por mes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mes</Label>
                <Select
                  value={formData.mes_programado}
                  onValueChange={(v) => {
                    const mes = v as "none" | `${number}`;
                    if (!editingItem) {
                      setFormData({ ...formData, mes_programado: mes });
                      return;
                    }

                    if (mes === "none") {
                      setFormData((prev) => ({
                        ...prev,
                        mes_programado: "none",
                        is_programado: false,
                        is_ejecutado: false,
                      }));
                      return;
                    }

                    const month = Number(mes);
                    const schedule = getSchedule(editingItem.id, month);
                    setFormData((prev) => ({
                      ...prev,
                      mes_programado: mes,
                      is_programado: !!schedule?.is_programado,
                      is_ejecutado: !!schedule?.is_ejecutado,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin programar</SelectItem>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.num} value={String(m.num)}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {editingItem
                    ? "Selecciona el mes que deseas actualizar para este ítem."
                    : "Al guardar, se marcará automáticamente “P” en el mes elegido."}
                </p>
              </div>

              {editingItem ? (
                <div className="space-y-2">
                  <Label>Estado del mes</Label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        disabled={formData.mes_programado === "none"}
                        checked={formData.is_programado}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            is_programado: e.target.checked,
                            is_ejecutado: e.target.checked ? prev.is_ejecutado : false,
                          }))
                        }
                      />
                      Programado (P)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        disabled={formData.mes_programado === "none"}
                        checked={formData.is_ejecutado}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            is_ejecutado: e.target.checked,
                            is_programado: e.target.checked ? true : prev.is_programado,
                          }))
                        }
                      />
                      Ejecutado (E)
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Si marcas “Ejecutado”, se marcará “Programado” automáticamente.
                  </p>
                </div>
              ) : (
                <div />
              )}
            </div>

            {/* Responsable - Searchable, auto-fills area */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Responsable</Label>
                <Popover open={responsableOpen} onOpenChange={setResponsableOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={responsableOpen}
                      className="w-full justify-between font-normal"
                    >
                      <span className="truncate">
                        {formData.cargo_responsable || "Buscar responsable..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Buscar por nombre o área..." 
                        value={responsableSearch}
                        onValueChange={setResponsableSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontró usuario</CommandEmpty>
                        <CommandGroup>
                          {filteredUsers.slice(0, 50).map((user) => (
                            <CommandItem
                              key={user.user_id}
                              value={`${user.full_name}-${user.area}`}
                              onSelect={() => {
                                setFormData({ 
                                  ...formData, 
                                  cargo_responsable: user.full_name,
                                  area: user.area || formData.area
                                });
                                setResponsableOpen(false);
                                setResponsableSearch("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.cargo_responsable === user.full_name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{user.full_name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {user.area} - {user.email}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Área *</Label>
                <Popover open={areaOpen} onOpenChange={setAreaOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={areaOpen}
                      className="w-full justify-between font-normal"
                    >
                      {formData.area || "Seleccionar área..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Buscar área..." 
                        value={areaSearch}
                        onValueChange={setAreaSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontró área</CommandEmpty>
                        <CommandGroup>
                          {filteredAreas.map((area) => (
                            <CommandItem
                              key={area.id}
                              value={area.name}
                              onSelect={() => {
                                setFormData({ ...formData, area: area.name });
                                setAreaOpen(false);
                                setAreaSearch("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.area === area.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: area.color }}
                                />
                                <span>{area.name}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label>Actividad *</Label>
              <Input
                value={formData.actividad}
                onChange={(e) => setFormData({ ...formData, actividad: e.target.value })}
                placeholder="Ej: Limpieza y cambio de pasta térmica"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => setFormData({ ...formData, tipo: v as "Interno" | "Externo" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Interno">Interno</SelectItem>
                    <SelectItem value="Externo">Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observaciones</Label>
                <Input
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveItem} disabled={createItem.isPending || updateItem.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Config Modal */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configuración del Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Código</Label>
                <Input
                  value={configForm.code}
                  onChange={(e) => setConfigForm({ ...configForm, code: e.target.value })}
                />
              </div>
              <div>
                <Label>Versión</Label>
                <Input
                  value={configForm.version}
                  onChange={(e) => setConfigForm({ ...configForm, version: e.target.value })}
                />
              </div>
              <div>
                <Label>Fecha</Label>
                <Input
                  value={configForm.date}
                  onChange={(e) => setConfigForm({ ...configForm, date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Elaborado por</Label>
              <Input
                value={configForm.elaborado_por}
                onChange={(e) => setConfigForm({ ...configForm, elaborado_por: e.target.value })}
                placeholder="Nombre del elaborador"
              />
            </div>
            <div>
              <Label>Puesto de trabajo</Label>
              <Input
                value={configForm.puesto_trabajo}
                onChange={(e) => setConfigForm({ ...configForm, puesto_trabajo: e.target.value })}
                placeholder="Ej: Supervisor T.I."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsConfigModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveConfig} disabled={upsertConfig.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
