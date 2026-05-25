import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Eye, Save, RotateCcw, Plus, Trash2, Settings2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ReportTemplateConfig, SectionConfig, ReportField, FieldType,
  fontFamilies, fontSizes
} from "@/types/reportDesigner";
import { TemplatePreview } from "./designer/TemplatePreview";
import { useReportTemplate } from "@/hooks/useReportTemplate";
import { GridStack, GridStackWidget } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

interface VisualDesignerGridStackProps {
  onBack: () => void;
  defaultTemplate: ReportTemplateConfig;
  storageKey: string;
}

interface SectionWidget extends GridStackWidget {
  sectionId: string;
}

export function VisualDesignerGridStack({ onBack, defaultTemplate, storageKey }: VisualDesignerGridStackProps) {
  const { template, loading, saving, saveTemplate, updateTemplate, resetTemplate } = useReportTemplate(storageKey, defaultTemplate);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"layout" | "style">("layout");
  
  const gridRef = useRef<GridStack | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const widgetsRef = useRef<SectionWidget[]>([]);

  // Initialize grid on mount
  useEffect(() => {
    if (gridContainerRef.current && !gridRef.current) {
      GridStack.init({
        column: 12,
        cellHeight: 100,
        margin: 10,
        float: true,
        animate: true,
        resizable: {
          handles: 'e,se,s,sw,w'
        },
        draggable: {
          handle: '.section-header'
        }
      });
      gridRef.current = GridStack.init();
      
      // Setup event listeners
      gridRef.current.on('added', (e, items) => {
        console.log('Widgets added:', items);
      });
      
      gridRef.current.on('removed', (e, items) => {
        console.log('Widgets removed:', items);
      });
      
      gridRef.current.on('change', (e, items) => {
        console.log('Widgets changed:', items);
      });
    }

    return () => {
      if (gridRef.current) {
        gridRef.current.off('added');
        gridRef.current.off('removed');
        gridRef.current.off('change');
        gridRef.current.destroy(false);
        gridRef.current = null;
      }
    };
  }, []);

  // Update grid when sections change
  useEffect(() => {
    if (!gridRef.current || !gridContainerRef.current) return;

    const grid = gridRef.current;
    
    // Build widgets data
    const newWidgets: SectionWidget[] = template.sections
      .sort((a, b) => a.order - b.order)
      .map((section, index) => ({
        x: 0,
        y: index,
        w: 12,
        h: Math.max(4, 2 + Math.ceil(section.fields.length / 3)),
        sectionId: section.id,
        content: ''
      }));

    // Check if widgets changed
    const widgetsChanged = JSON.stringify(widgetsRef.current) !== JSON.stringify(newWidgets);
    
    if (widgetsChanged) {
      widgetsRef.current = newWidgets;
      grid.removeAll(false);
      grid.load(newWidgets);
      
      // Add content after widgets are rendered
      setTimeout(() => {
        addWidgetContent();
      }, 100);
    }
  }, [template.sections]);

  // Add content to widgets
  const addWidgetContent = () => {
    if (!gridContainerRef.current) return;

    const widgetElements = gridContainerRef.current.querySelectorAll('.grid-stack-item');
    
    widgetElements.forEach((widgetEl, index) => {
      const section = template.sections.sort((a, b) => a.order - b.order)[index];
      if (!section) return;

      const widgetElHtml = widgetEl as HTMLElement;
      const existingContent = widgetElHtml.querySelector('.section-content-wrapper');
      
      if (existingContent) return; // Already has content

      const content = document.createElement('div');
      content.className = 'section-content-wrapper h-full flex flex-col bg-white rounded-lg shadow-sm overflow-hidden';
      content.innerHTML = `
        <div class="section-header h-10 bg-gradient-to-r from-slate-100 to-slate-50 border-b flex items-center justify-between px-3 cursor-move select-none">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
            <span class="font-semibold text-sm truncate">${section.name}</span>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <button class="toggle-expand w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 text-slate-500 transition-colors" title="Expandir/Contraer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <button class="delete-section w-7 h-7 flex items-center justify-center rounded hover:bg-red-100 text-red-500 transition-colors" title="Eliminar sección">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="section-body flex-1 overflow-auto p-3">
          <div class="fields-grid grid grid-cols-2 md:grid-cols-3 gap-2">
            ${section.fields.map(field => `
              <div class="field-card p-2 border border-slate-200 rounded-md bg-slate-50 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all group" data-field-id="${field.id}">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-semibold text-slate-700 truncate">${field.label}</span>
                  <span class="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">${field.type}</span>
                </div>
                <div class="text-[9px] text-slate-400 italic truncate">${field.placeholder || 'valor'}</div>
              </div>
            `).join('')}
            <button class="add-field-btn w-full h-16 border-2 border-dashed border-slate-300 rounded-md hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-1">
              <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              <span class="text-xs text-slate-500">Agregar Campo</span>
            </button>
          </div>
        </div>
      `;

      const gridItemContent = widgetElHtml.querySelector('.grid-stack-item-content');
      if (gridItemContent) {
        gridItemContent.appendChild(content);
      }
    });

    // Setup event listeners
    setupWidgetEventListeners();
  };

  const setupWidgetEventListeners = () => {
    if (!gridContainerRef.current) return;

    // Toggle expand
    gridContainerRef.current.querySelectorAll('.toggle-expand').forEach(btn => {
      btn.removeEventListener('click', handleToggleExpand);
      btn.addEventListener('click', handleToggleExpand);
    });

    // Delete section
    gridContainerRef.current.querySelectorAll('.delete-section').forEach(btn => {
      btn.removeEventListener('click', handleDeleteSection);
      btn.addEventListener('click', handleDeleteSection);
    });

    // Field click
    gridContainerRef.current.querySelectorAll('.field-card').forEach(card => {
      card.removeEventListener('click', handleFieldClick);
      card.addEventListener('click', handleFieldClick);
    });

    // Add field button
    gridContainerRef.current.querySelectorAll('.add-field-btn').forEach(btn => {
      btn.removeEventListener('click', handleAddField);
      btn.addEventListener('click', handleAddField);
    });
  };

  const handleToggleExpand = (e: Event) => {
    e.stopPropagation();
    const btn = e.target as HTMLElement;
    const sectionBody = btn.closest('.section-content-wrapper')?.querySelector('.section-body');
    if (sectionBody) {
      sectionBody.classList.toggle('hidden');
    }
  };

  const handleDeleteSection = (e: Event) => {
    e.stopPropagation();
    const btn = e.target as HTMLElement;
    const widgetEl = btn.closest('.grid-stack-item') as HTMLElement;
    const sectionId = widgetEl?.dataset?.gsId;
    
    if (sectionId) {
      deleteSection(sectionId);
    } else {
      // Find section by index
      const widgetElements = gridContainerRef.current?.querySelectorAll('.grid-stack-item') || [];
      const index = Array.from(widgetElements).indexOf(widgetEl);
      if (index >= 0) {
        const section = template.sections.sort((a, b) => a.order - b.order)[index];
        if (section) {
          deleteSection(section.id);
        }
      }
    }
  };

  const handleFieldClick = (e: Event) => {
    const card = e.target as HTMLElement;
    const fieldId = card.dataset.fieldId;
    const widgetEl = card.closest('.grid-stack-item') as HTMLElement;
    const widgetElements = gridContainerRef.current?.querySelectorAll('.grid-stack-item') || [];
    const index = Array.from(widgetElements).indexOf(widgetEl);
    const section = template.sections.sort((a, b) => a.order - b.order)[index];
    
    if (fieldId && section) {
      setSelectedField(fieldId);
      setSelectedSection(section.id);
      setActiveTab("layout");
    }
  };

  const handleAddField = (e: Event) => {
    e.stopPropagation();
    const btn = e.target as HTMLElement;
    const widgetEl = btn.closest('.grid-stack-item') as HTMLElement;
    const widgetElements = gridContainerRef.current?.querySelectorAll('.grid-stack-item') || [];
    const index = Array.from(widgetElements).indexOf(widgetEl);
    const section = template.sections.sort((a, b) => a.order - b.order)[index];
    
    if (section) {
      addField(section.id);
    }
  };

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

  const addField = (sectionId: string) => {
    const section = template.sections.find(s => s.id === sectionId);
    if (!section) return;

    const newField: ReportField = {
      id: `field_${Date.now()}`,
      label: `Campo ${section.fields.length + 1}`,
      type: 'text',
      required: false,
      order: section.fields.length,
      fontSize: 11,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textColor: '#000000',
      bgColor: '#f8fafc',
    };

    updateSection(sectionId, { fields: [...section.fields, newField] });
    toast.success('Campo agregado');
  };

  const deleteField = (sectionId: string, fieldId: string) => {
    const section = template.sections.find(s => s.id === sectionId);
    if (!section) return;

    updateSection(sectionId, {
      fields: section.fields.filter(f => f.id !== fieldId)
    });
    setSelectedField(null);
    toast.success('Campo eliminado');
  };

  const deleteSection = (sectionId: string) => {
    updateTemplate({
      sections: template.sections.filter(s => s.id !== sectionId)
    });
    setSelectedSection(null);
    toast.success('Sección eliminada');
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
      layout: 'horizontal',
      columns: 2,
      labelWidth: 35,
      valueWidth: 65,
      tableWidth: 100,
      tableRows: 5,
      fields: [],
    };
    updateTemplate({
      sections: [...template.sections, newSection]
    });
    toast.success('Sección agregada');
  };

  const handleSave = async () => {
    await saveTemplate(template);
    toast.success('Plantilla guardada exitosamente');
  };

  const handleReset = () => {
    resetTemplate();
    toast.info('Plantilla restaurada a valores por defecto');
  };

  const renderFieldProperties = (field: ReportField) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Settings2 className="w-4 h-4 text-blue-500" />
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
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderSectionProperties = (section: SectionConfig) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Settings2 className="w-4 h-4 text-blue-500" />
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
                <h1 className="text-xl font-bold">Diseñador Visual con GridStack</h1>
                <Badge variant="secondary" className="text-xs">
                  {template.name}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Arrastra desde el header para mover. Redimensiona desde los bordes.
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
                  <Eye className="h-4 w-4 mr-2" />
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
        {/* GridStack Area */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold">Secciones</h2>
            </div>
            <Button size="sm" onClick={addSection} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1" />
              Nueva Sección
            </Button>
          </div>

          <div
            ref={gridContainerRef}
            className="grid-stack bg-white rounded-lg border shadow-sm min-h-[400px] p-2"
          />

          {template.sections.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Settings2 className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-600">No hay secciones</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">
                  Comienza creando una nueva sección
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
                      <p className="text-sm">Selecciona una sección o campo para editar</p>
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
