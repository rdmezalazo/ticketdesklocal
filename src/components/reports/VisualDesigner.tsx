import { useState, useCallback, useRef, useEffect } from "react";
import {
  ArrowLeft, Eye, Save, RotateCcw, Plus, GripVertical,
  Trash2, Settings2, LayoutGrid, EyeOff, Copy, ChevronDown, ChevronRight,
  MonitorPlay, Palette, Type, AlignLeft, AlignCenter, AlignRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  ReportTemplateConfig, SectionConfig, ReportField, FieldType,
  SectionLayout, fontFamilies, fontSizes
} from "@/types/reportDesigner";
import { TemplatePreview } from "./designer/TemplatePreview";
import { useReportTemplate } from "@/hooks/useReportTemplate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface VisualDesignerProps {
  onBack: () => void;
  defaultTemplate: ReportTemplateConfig;
  storageKey: string;
}

interface GridCell {
  row: number;
  col: number;
  fieldId?: string;
}

interface GridLayout {
  rows: number;
  cols: number;
  cells: GridCell[];
}

export function VisualDesigner({ onBack, defaultTemplate, storageKey }: VisualDesignerProps) {
  const { template, loading, saving, saveTemplate, updateTemplate, resetTemplate } = useReportTemplate(storageKey, defaultTemplate);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [resizingField, setResizingField] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"layout" | "style">("layout");
  const [liveResizeWidth, setLiveResizeWidth] = useState<number | null>(null);
  const dragOverCell = useRef<{ row: number; col: number } | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const templateRef = useRef(template);
  const updateTemplateRef = useRef(updateTemplate);

  // Mantener refs actualizados
  useEffect(() => {
    templateRef.current = template;
  }, [template]);

  useEffect(() => {
    updateTemplateRef.current = updateTemplate;
  }, [updateTemplate]);

  const updateSection = (sectionId: string, updates: Partial<SectionConfig>) => {
    updateTemplate({
      sections: template.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s)
    });
  };

  const updateField = (sectionId: string, fieldId: string, updates: Partial<ReportField>) => {
    updateTemplate({
      sections: template.sections.map(s =>
        s.id === sectionId
          ? { ...s, fields: s.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f) }
          : s
      )
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingField) return;

      const currentTemplate = templateRef.current;
      let foundSectionId: string | null = null;
      let foundField: ReportField | undefined;

      for (const section of currentTemplate.sections) {
        const field = section.fields.find(f => f.id === resizingField);
        if (field) {
          foundSectionId = section.id;
          foundField = field;
          break;
        }
      }

      if (!foundSectionId || !foundField) return;

      const delta = e.clientX - resizeStartX.current;
      const newLabelWidth = Math.max(10, Math.min(90, resizeStartWidth.current + delta));
      const newValueWidth = 100 - newLabelWidth;

      // Actualizar estado en tiempo real para visualización
      setLiveResizeWidth(newLabelWidth);

      updateTemplateRef.current({
        sections: currentTemplate.sections.map(s =>
          s.id === foundSectionId
            ? {
                ...s,
                fields: s.fields.map(f =>
                  f.id === resizingField
                    ? { ...f, labelWidth: newLabelWidth, valueWidth: newValueWidth }
                    : f
                )
              }
            : s
        )
      });
    };

    const handleMouseUp = () => {
      setResizingField(null);
      setLiveResizeWidth(null);
    };

    if (resizingField) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingField]);

  const handleSave = async () => {
    await saveTemplate(template);
    toast.success('Plantilla guardada exitosamente');
  };

  const handleReset = () => {
    resetTemplate();
    toast.info('Plantilla restaurada a valores por defecto');
  };

  const getSectionGrid = (section: SectionConfig): GridLayout => {
    const gridConfig = section.gridConfig || { rows: 2, cols: 2, cells: [] };
    return gridConfig as GridLayout;
  };

  const assignFieldToCell = (sectionId: string, fieldId: string, row: number, col: number) => {
    const section = template.sections.find(s => s.id === sectionId);
    if (!section) return;

    const gridConfig = getSectionGrid(section);
    const field = section.fields.find(f => f.id === fieldId);
    if (!field) return;

    const newCells = gridConfig.cells.filter(c => c.fieldId !== fieldId);
    newCells.push({ row, col, fieldId });

    updateSection(sectionId, {
      gridConfig: { rows: gridConfig.rows, cols: gridConfig.cols, cells: newCells }
    });
  };

  const removeFieldFromCell = (sectionId: string, row: number, col: number) => {
    const section = template.sections.find(s => s.id === sectionId);
    if (!section) return;

    const gridConfig = getSectionGrid(section);
    const newCells = gridConfig.cells.filter(c => !(c.row === row && c.col === col));

    updateSection(sectionId, {
      gridConfig: { rows: gridConfig.rows, cols: gridConfig.cols, cells: newCells }
    });
  };

  const getFieldAtCell = (section: SectionConfig, row: number, col: number): ReportField | undefined => {
    const gridConfig = getSectionGrid(section);
    const cell = gridConfig.cells.find(c => c.row === row && c.col === col);
    if (!cell?.fieldId) return undefined;
    return section.fields.find(f => f.id === cell.fieldId);
  };

  const addField = (sectionId: string) => {
    const section = template.sections.find(s => s.id === sectionId);
    if (!section) return;

    const newField: ReportField = {
      id: `field_${Date.now()}`,
      label: `Campo ${section.fields.length + 1}`,
      type: 'text',
      required: false,
      order: section.fields.length,
      column: 1,
      columnWidth: 100,
      colspan: 1,
      labelColspan: 1,
      valueColspan: 1,
      // No establecer labelWidth/valueWidth para que herede de la sección
      fontSize: 11,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textColor: '#000000',
      bgColor: '#f8fafc',
    };

    updateSection(sectionId, { fields: [...section.fields, newField] });
    setExpandedSections(new Set([...expandedSections, sectionId]));
  };

  const deleteField = (sectionId: string, fieldId: string) => {
    const section = template.sections.find(s => s.id === sectionId);
    if (!section) return;

    const gridConfig = getSectionGrid(section);
    const newCells = gridConfig.cells.filter(c => c.fieldId !== fieldId);

    updateSection(sectionId, {
      fields: section.fields.filter(f => f.id !== fieldId),
      gridConfig: { rows: gridConfig.rows, cols: gridConfig.cols, cells: newCells }
    });
    setSelectedField(null);
  };

  const deleteSection = (sectionId: string) => {
    updateTemplate({
      sections: template.sections.filter(s => s.id !== sectionId)
    });
    setSelectedSection(null);
  };

  const duplicateSection = (section: SectionConfig) => {
    const newSection: SectionConfig = {
      ...section,
      id: `section_${Date.now()}`,
      name: `${section.name} (copia)`,
      order: template.sections.length,
      fields: section.fields.map((f, i) => ({
        ...f,
        id: `field_${Date.now()}_${i}`,
        order: i
      })),
      gridConfig: section.gridConfig ? {
        ...section.gridConfig,
        cells: []
      } : undefined
    };
    updateTemplate({
      sections: [...template.sections, newSection]
    });
    toast.success('Sección duplicada');
  };

  const addSection = () => {
    const newSection: SectionConfig = {
      id: `section_${Date.now()}`,
      name: `${template.sections.length + 1}. Nueva Sección`,
      order: template.sections.length,
      visible: true,
      titleFontSize: 12,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'horizontal' as SectionLayout,
      columns: 2,
      labelWidth: 35,
      valueWidth: 65,
      tableWidth: 100,
      tableRows: 5,
      gridConfig: { rows: 2, cols: 2, cells: [] },
      fields: [],
    };
    updateTemplate({
      sections: [...template.sections, newSection]
    });
  };

  const toggleSectionExpand = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const renderGrid = (section: SectionConfig) => {
    const gridConfig = getSectionGrid(section);
    const gridRows = gridConfig.rows || 2;
    const gridCols = gridConfig.cols || 2;

    return (
      <div
        className="grid gap-2 border-2 border-dashed border-slate-200 rounded-lg p-3 bg-slate-50/50"
        style={{
          gridTemplateRows: `repeat(${gridRows}, minmax(70px, 1fr))`,
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`
        }}
      >
        {Array.from({ length: gridRows * gridCols }, (_, i) => {
          const row = Math.floor(i / gridCols) + 1;
          const col = (i % gridCols) + 1;
          const field = getFieldAtCell(section, row, col);
          const isDragOver = dragOverCell.current?.row === row && dragOverCell.current?.col === col;

          return (
            <div
              key={`${row}-${col}`}
              className={`
                min-h-[70px] border-2 rounded-lg p-2 flex items-center justify-center text-xs transition-all duration-200
                ${isDragOver ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-200 bg-white'}
                ${field ? 'border-blue-400 bg-gradient-to-br from-blue-50/50 to-white' : ''}
                hover:border-slate-300
              `}
              onDragOver={(e) => {
                e.preventDefault();
                dragOverCell.current = { row, col };
              }}
              onDragLeave={() => {
                dragOverCell.current = null;
              }}
              onDrop={(e) => {
                e.preventDefault();
                dragOverCell.current = null;
                if (draggedField) {
                  assignFieldToCell(section.id, draggedField, row, col);
                  toast.success('Campo asignado a la celda');
                }
              }}
            >
              {field ? (
                <div
                  className="w-full h-full cursor-pointer hover:shadow-md transition-all rounded-md overflow-hidden group flex flex-col relative"
                  onClick={() => {
                    setSelectedField(field.id);
                    setSelectedSection(section.id);
                    setActiveTab("layout");
                  }}
                >
                  <div className="flex h-full items-stretch">
                    <div
                      className="text-[10px] font-semibold px-2 py-1.5 truncate flex items-center justify-center bg-gradient-to-r from-slate-100 to-slate-50 border-r border-slate-200 select-none relative"
                      style={{
                        color: field.textColor,
                        flex: `0 0 ${
                          liveResizeWidth !== null && resizingField === field.id ? liveResizeWidth :
                          (field.labelWidth || section.labelWidth || 30)
                        }%`
                      }}
                    >
                      <span className="truncate">{field.label}</span>
                      <span className="text-[8px] text-slate-400 ml-1 whitespace-nowrap">
                        ({liveResizeWidth !== null && resizingField === field.id ? liveResizeWidth :
                          (field.labelWidth || section.labelWidth || 30)}%)
                      </span>
                    </div>
                    <div
                      className="w-4 bg-gradient-to-b from-slate-300 to-slate-400 hover:from-blue-400 hover:to-blue-500 cursor-col-resize flex items-center justify-center transition-colors select-none z-10"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setResizingField(field.id);
                        setSelectedSection(section.id);
                        resizeStartX.current = e.clientX;
                        resizeStartWidth.current = field.labelWidth || section.labelWidth || 30;
                      }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="w-0.5 h-2 bg-white/70 rounded" />
                        <div className="w-0.5 h-2 bg-white/70 rounded" />
                      </div>
                    </div>
                    <div
                      className="flex-1 text-[9px] rounded-r-sm px-2 py-1.5 truncate flex items-center justify-center text-slate-400 italic bg-slate-50 select-none min-w-0 relative"
                    >
                      <span className="truncate">{field.placeholder || 'valor'}</span>
                      <span className="text-[8px] ml-1 whitespace-nowrap">
                        ({liveResizeWidth !== null && resizingField === field.id ? (100 - liveResizeWidth) :
                          (field.valueWidth || section.valueWidth || 70)}%)
                      </span>
                    </div>
                  </div>
                  <button
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFieldFromCell(section.id, row, col);
                      toast.success('Campo removido de la celda');
                    }}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : (
                <div className="text-slate-400 text-xs flex flex-col items-center gap-1">
                  <LayoutGrid className="w-4 h-4 opacity-50" />
                  <span>Arrastrar campo</span>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>
    );
  };

  const renderFieldItem = (field: ReportField, section: SectionConfig) => {
    const isSelected = selectedField === field.id;
    const isDragging = draggedField === field.id;

    return (
      <div
        key={field.id}
        draggable
        onDragStart={(e) => {
          setDraggedField(field.id);
          e.dataTransfer.setData('text/plain', field.id);
        }}
        onDragEnd={() => setDraggedField(null)}
        className={`
          p-2.5 border-2 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-200
          ${isSelected
            ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
            : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}
          ${isDragging ? 'opacity-50 scale-95' : 'hover:scale-[1.01]'}
          ${!isSelected ? 'bg-white' : ''}
        `}
        onClick={() => {
          setSelectedField(field.id);
          setSelectedSection(section.id);
          setActiveTab("layout");
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripVertical className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="text-xs font-semibold truncate">{field.label}</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-[9px] h-4 px-1">
              {field.type}
            </Badge>
            {field.required && (
              <Badge className="text-[9px] h-4 px-1 bg-amber-100 text-amber-700">
                Req
              </Badge>
            )}
            <button
              className="w-6 h-6 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                deleteField(section.id, field.id);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex gap-0 items-stretch rounded overflow-hidden border border-slate-200">
          <div
            className="text-[10px] font-medium px-2 py-1.5 truncate bg-gradient-to-r from-slate-50 to-slate-100 select-none relative flex items-center"
            style={{
              color: field.textColor,
              flex: `0 0 ${
                liveResizeWidth !== null && resizingField === field.id ? liveResizeWidth :
                (field.labelWidth || section.labelWidth || 30)
              }%`
            }}
          >
            <span className="truncate">{field.label}</span>
            <span className="text-[8px] text-slate-400 ml-1 whitespace-nowrap flex-shrink-0">
              ({liveResizeWidth !== null && resizingField === field.id ? liveResizeWidth :
                (field.labelWidth || section.labelWidth || 35)}%)
            </span>
          </div>
          <div
            className="w-4 bg-slate-200 hover:bg-blue-400 cursor-col-resize flex items-center justify-center transition-colors select-none z-10"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setResizingField(field.id);
              resizeStartX.current = e.clientX;
              resizeStartWidth.current = field.labelWidth || section.labelWidth || 30;
            }}
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-0.5 h-1.5 bg-slate-500 rounded" />
              <div className="w-0.5 h-1.5 bg-slate-500 rounded" />
            </div>
          </div>
          <div
            className="flex-1 text-[9px] px-2 py-1.5 truncate text-slate-400 italic bg-slate-50 select-none min-w-0 relative flex items-center"
          >
            <span className="truncate">{field.placeholder || 'valor'}</span>
            <span className="text-[8px] ml-1 whitespace-nowrap flex-shrink-0">
              ({liveResizeWidth !== null && resizingField === field.id ? (100 - liveResizeWidth) :
                (field.valueWidth || section.valueWidth || 65)}%)
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (section: SectionConfig) => {
    const isSelected = selectedSection === section.id;
    const isExpanded = expandedSections.has(section.id);

    return (
      <Card
        key={section.id}
        className={`
          transition-all duration-200 overflow-hidden cursor-pointer
          ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md hover:ring-1 hover:ring-blue-300'}
        `}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedSection(section.id);
          setSelectedField(null);
          setActiveTab("layout");
        }}
      >
        <CardHeader className="py-3 px-4 bg-gradient-to-r from-slate-50 to-white border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSectionExpand(section.id);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </button>
              <Input
                value={section.name}
                onChange={(e) => updateSection(section.id, { name: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="h-8 font-semibold text-sm bg-transparent border-transparent hover:border-slate-300 focus:border-blue-500 w-64"
              />
              <div className="flex items-center gap-1">
                {section.visible ? (
                  <Badge variant="secondary" className="text-[9px] h-5">
                    <Eye className="w-3 h-3 mr-1" />
                    Visible
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] h-5 text-slate-500">
                    <EyeOff className="w-3 h-3 mr-1" />
                    Oculta
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Select
                value={String((section.gridConfig as GridLayout)?.cols || 2)}
                onValueChange={(value) => {
                  const current = (section.gridConfig as GridLayout) || { rows: 2, cols: 2, cells: [] };
                  updateSection(section.id, {
                    gridConfig: { ...current, cols: parseInt(value) }
                  });
                }}
              >
                <SelectTrigger className="h-8 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} cols</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String((section.gridConfig as GridLayout)?.rows || 2)}
                onValueChange={(value) => {
                  const current = (section.gridConfig as GridLayout) || { rows: 2, cols: 2, cells: [] };
                  updateSection(section.id, {
                    gridConfig: { ...current, rows: parseInt(value) }
                  });
                }}
              >
                <SelectTrigger className="h-8 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} rows</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Switch
                checked={section.visible}
                onCheckedChange={(v) => updateSection(section.id, { visible: v })}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-blue-500"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateSection(section);
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSection(section.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <div className="space-y-4">
            {/* Grilla de Campos */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-md">
                <LayoutGrid className="w-4 h-4 text-slate-600" />
                <h4 className="text-sm font-semibold text-slate-700">Grilla de Campos</h4>
              </div>
              <div className="px-4">
                {renderGrid(section)}
              </div>
            </div>

            {/* Campos Disponibles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-100 rounded-md">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-slate-600" />
                  <h4 className="text-sm font-semibold text-slate-700">Campos Disponibles</h4>
                  <Badge variant="secondary" className="text-xs">{section.fields.length}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => addField(section.id)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Agregar
                </Button>
              </div>
              <div className="px-4">
                {section.fields.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {section.fields.map(field => renderFieldItem(field, section))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                    <Type className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay campos en esta sección</p>
                    <p className="text-xs mt-1">Haz clic en "Agregar" para crear un campo</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  };

  const renderFieldProperties = (field: ReportField) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Palette className="w-4 h-4 text-blue-500" />
        <h4 className="font-semibold text-sm">Propiedades del Campo</h4>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="layout">Diseño</TabsTrigger>
          <TabsTrigger value="style">Estilo</TabsTrigger>
        </TabsList>

        <TabsContent value="layout" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Etiqueta</Label>
            <Input
              value={field.label}
              onChange={(e) => updateField(selectedSection!, selectedField!, { label: e.target.value })}
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Tipo de Campo</Label>
            <Select
              value={field.type}
              onValueChange={(v) => updateField(selectedSection!, selectedField!, { type: v as FieldType })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texto</SelectItem>
                <SelectItem value="date">Fecha</SelectItem>
                <SelectItem value="number">Número</SelectItem>
                <SelectItem value="select">Selección</SelectItem>
                <SelectItem value="textarea">Texto Largo</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Placeholder</Label>
            <Input
              value={field.placeholder || ''}
              onChange={(e) => updateField(selectedSection!, selectedField!, { placeholder: e.target.value })}
              className="h-9"
              placeholder="Texto de ayuda..."
            />
          </div>

          {field.type === 'select' && field.selectOptions && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Opciones</Label>
              <div className="space-y-1">
                {field.selectOptions.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={opt.label}
                      onChange={(e) => {
                        const newOptions = [...field.selectOptions!];
                        newOptions[idx] = { ...opt, label: e.target.value };
                        updateField(selectedSection!, selectedField!, { selectOptions: newOptions });
                      }}
                      className="h-8 text-xs"
                      placeholder="Etiqueta"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500"
                      onClick={() => {
                        const newOptions = field.selectOptions!.filter((_, i) => i !== idx);
                        updateField(selectedSection!, selectedField!, { selectOptions: newOptions });
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => {
                    const newOptions = [...(field.selectOptions || []), { value: `opt_${field.selectOptions?.length || 0}`, label: 'Nueva opción' }];
                    updateField(selectedSection!, selectedField!, { selectOptions: newOptions });
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Agregar opción
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border">
            <Switch
              checked={field.required}
              onCheckedChange={(v) => updateField(selectedSection!, selectedField!, { required: v })}
            />
            <Label className="text-sm font-medium cursor-pointer">Campo requerido</Label>
          </div>
        </TabsContent>

        <TabsContent value="style" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Tamaño de Fuente</Label>
            <Select
              value={String(field.fontSize)}
              onValueChange={(v) => updateField(selectedSection!, selectedField!, { fontSize: parseInt(v) })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontSizes.map(size => (
                  <SelectItem key={size} value={String(size)}>{size}px</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Familia de Fuente</Label>
            <Select
              value={field.fontFamily}
              onValueChange={(v) => updateField(selectedSection!, selectedField!, { fontFamily: v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontFamilies.map(font => (
                  <SelectItem key={font} value={font}>{font}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Peso de Fuente</Label>
            <Select
              value={field.fontWeight}
              onValueChange={(v) => updateField(selectedSection!, selectedField!, { fontWeight: v as any })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="bold">Negrita</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Estilo de Fuente</Label>
            <Select
              value={field.fontStyle}
              onValueChange={(v) => updateField(selectedSection!, selectedField!, { fontStyle: v as any })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="italic">Cursiva</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Color de Texto</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={field.textColor}
                onChange={(e) => updateField(selectedSection!, selectedField!, { textColor: e.target.value })}
                className="w-12 h-9 cursor-pointer"
              />
              <Input
                value={field.textColor}
                onChange={(e) => updateField(selectedSection!, selectedField!, { textColor: e.target.value })}
                className="h-9 flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Color de Fondo</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={field.bgColor}
                onChange={(e) => updateField(selectedSection!, selectedField!, { bgColor: e.target.value })}
                className="w-12 h-9 cursor-pointer"
              />
              <Input
                value={field.bgColor}
                onChange={(e) => updateField(selectedSection!, selectedField!, { bgColor: e.target.value })}
                className="h-9 flex-1"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Ancho de Etiqueta</Label>
              <Badge variant="secondary" className="text-xs font-mono">{field.labelWidth || 30}%</Badge>
            </div>
            <Slider
              value={[field.labelWidth || 30]}
              onValueChange={([v]) => {
                updateField(selectedSection!, selectedField!, {
                  labelWidth: v,
                  valueWidth: 100 - v
                });
              }}
              min={10}
              max={90}
              step={1}
              className="mt-2"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>10%</span>
              <span>50%</span>
              <span>90%</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderSectionProperties = (section: SectionConfig) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <LayoutGrid className="w-4 h-4 text-blue-500" />
        <h4 className="font-semibold text-sm">Propiedades de la Sección</h4>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="layout">Diseño</TabsTrigger>
          <TabsTrigger value="style">Estilo</TabsTrigger>
        </TabsList>

        <TabsContent value="layout" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Nombre de la Sección</Label>
            <Input
              value={section.name}
              onChange={(e) => updateSection(section.id, { name: e.target.value })}
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Columnas de la Grilla</Label>
            <Slider
              value={[(section.gridConfig as GridLayout)?.cols || 2]}
              onValueChange={([v]) => {
                const current = (section.gridConfig as GridLayout) || { rows: 2, cols: 2, cells: [] };
                updateSection(section.id, { gridConfig: { ...current, cols: v } });
              }}
              min={1}
              max={6}
              step={1}
              className="mt-2"
            />
            <div className="text-xs text-slate-500 text-right">{(section.gridConfig as GridLayout)?.cols || 2} columnas</div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Filas de la Grilla</Label>
            <Slider
              value={[(section.gridConfig as GridLayout)?.rows || 2]}
              onValueChange={([v]) => {
                const current = (section.gridConfig as GridLayout) || { rows: 2, cols: 2, cells: [] };
                updateSection(section.id, { gridConfig: { ...current, rows: v } });
              }}
              min={1}
              max={10}
              step={1}
              className="mt-2"
            />
            <div className="text-xs text-slate-500 text-right">{(section.gridConfig as GridLayout)?.rows || 2} filas</div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Ancho de Columnas</Label>
              <div className="flex gap-2">
                <Badge variant="secondary" className="text-xs font-mono">
                  Etiqueta: {section.labelWidth}%
                </Badge>
                <Badge variant="outline" className="text-xs font-mono">
                  Valor: {section.valueWidth}%
                </Badge>
              </div>
            </div>
            <Slider
              value={[section.labelWidth || 35]}
              onValueChange={([v]) => {
                updateSection(section.id, {
                  labelWidth: v,
                  valueWidth: 100 - v
                });
              }}
              min={10}
              max={90}
              step={1}
              className="mt-2"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>10%</span>
              <span>50%</span>
              <span>90%</span>
            </div>
            <p className="text-xs text-slate-500">
              Ajusta el ancho predeterminado para las columnas de etiqueta y valor en esta sección
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border">
            <Switch
              checked={section.visible}
              onCheckedChange={(v) => updateSection(section.id, { visible: v })}
            />
            <Label className="text-sm font-medium cursor-pointer">Sección visible</Label>
          </div>
        </TabsContent>

        <TabsContent value="style" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Tamaño de Fuente del Título</Label>
            <Slider
              value={[section.titleFontSize]}
              onValueChange={([v]) => updateSection(section.id, { titleFontSize: v })}
              min={8}
              max={24}
              step={1}
              className="mt-2"
            />
            <div className="text-xs text-slate-500 text-right">{section.titleFontSize}px</div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Familia de Fuente</Label>
            <Select
              value={section.titleFontFamily}
              onValueChange={(v) => updateSection(section.id, { titleFontFamily: v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontFamilies.map(font => (
                  <SelectItem key={font} value={font}>{font}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Peso de Fuente</Label>
            <Select
              value={section.titleFontWeight}
              onValueChange={(v) => updateSection(section.id, { titleFontWeight: v as any })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="bold">Negrita</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Alineación del Título</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={section.alignment === 'left' ? 'default' : 'outline'}
                size="sm"
                className="h-9"
                onClick={() => updateSection(section.id, { alignment: 'left' as any })}
              >
                <AlignLeft className="w-4 h-4" />
              </Button>
              <Button
                variant={section.alignment === 'center' ? 'default' : 'outline'}
                size="sm"
                className="h-9"
                onClick={() => updateSection(section.id, { alignment: 'center' as any })}
              >
                <AlignCenter className="w-4 h-4" />
              </Button>
              <Button
                variant={section.alignment === 'right' ? 'default' : 'outline'}
                size="sm"
                className="h-9"
                onClick={() => updateSection(section.id, { alignment: 'right' as any })}
              >
                <AlignRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Color del Título</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={section.titleColor}
                onChange={(e) => updateSection(section.id, { titleColor: e.target.value })}
                className="w-12 h-9 cursor-pointer"
              />
              <Input
                value={section.titleColor}
                onChange={(e) => updateSection(section.id, { titleColor: e.target.value })}
                className="h-9 flex-1"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className="space-y-6 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">Diseñador Visual de Plantillas</h1>
                <Badge variant="secondary" className="text-xs">
                  {template.name}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Arrastra y suelta campos en la grilla para diseñar tu formato
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={loading}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar
            </Button>
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <MonitorPlay className="h-4 w-4 mr-2" />
                  Vista Previa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[95vh] overflow-auto p-0">
                <DialogHeader className="px-6 py-4 border-b">
                  <DialogTitle>Vista Previa de la Plantilla</DialogTitle>
                </DialogHeader>
                <div className="p-6">
                  <TemplatePreview template={template} />
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={handleSave} disabled={saving || loading} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
        {/* Sections Area */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold">Secciones y Campos</h2>
            </div>
            <Button size="sm" onClick={addSection} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1" />
              Nueva Sección
            </Button>
          </div>

          {template.sections.length > 0 ? (
            <div className="space-y-4">
              {template.sections
                .sort((a, b) => a.order - b.order)
                .map(section => renderSection(section))
              }
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <LayoutGrid className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-600">No hay secciones</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">
                  Comienza creando una nueva sección para tu plantilla
                </p>
                <Button onClick={addSection} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primera Sección
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Properties Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  Propiedades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-280px)] pr-4">
                  {selectedField && selectedSection && (() => {
                    const section = template.sections.find(s => s.id === selectedSection);
                    const field = section?.fields.find(f => f.id === selectedField);
                    if (!field) return null;
                    return renderFieldProperties(field);
                  })()}

                  {selectedSection && !selectedField && (() => {
                    const section = template.sections.find(s => s.id === selectedSection);
                    if (!section) return null;
                    return renderSectionProperties(section);
                  })()}

                  {!selectedSection && !selectedField && (
                    <div className="text-center py-8 text-slate-400">
                      <Settings2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Selecciona una sección o campo para editar sus propiedades</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
