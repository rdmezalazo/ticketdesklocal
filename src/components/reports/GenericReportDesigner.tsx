import { useState, useEffect } from "react";
import { ArrowLeft, Eye, Save, RotateCcw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { HeaderEditor } from "./designer/HeaderEditor";
import { SectionEditor } from "./designer/SectionEditor";
import { PhotoPanelEditor } from "./designer/PhotoPanelEditor";
import { SignatureEditor } from "./designer/SignatureEditor";
import { TemplatePreview } from "./designer/TemplatePreview";
import { ReportTemplateConfig, SectionConfig } from "@/types/reportDesigner";

interface GenericReportDesignerProps {
  onBack: () => void;
  defaultTemplate: ReportTemplateConfig;
  storageKey: string;
}

const loadTemplateFromStorage = (storageKey: string, defaultTemplate: ReportTemplateConfig): ReportTemplateConfig => {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge con defaultTemplate para asegurar que nuevos campos existan
      return {
        ...defaultTemplate,
        ...parsed,
        header: { ...defaultTemplate.header, ...parsed.header },
        photoPanel: { ...defaultTemplate.photoPanel, ...parsed.photoPanel },
        signature: { ...defaultTemplate.signature, ...parsed.signature },
        sections: parsed.sections || defaultTemplate.sections,
      };
    }
  } catch (e) {
    console.error('Error loading template from storage:', e);
  }
  return defaultTemplate;
};

export function GenericReportDesigner({ onBack, defaultTemplate, storageKey }: GenericReportDesignerProps) {
  const [template, setTemplate] = useState<ReportTemplateConfig>(() => 
    loadTemplateFromStorage(storageKey, defaultTemplate)
  );
  const [showPreview, setShowPreview] = useState(false);

  // Re-sincronizar cuando cambia el storageKey
  useEffect(() => {
    setTemplate(loadTemplateFromStorage(storageKey, defaultTemplate));
  }, [storageKey, defaultTemplate]);

  // Auto-guardar cuando cambia el template (con debounce implícito)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(template));
      } catch (e) {
        console.error('Error auto-saving template:', e);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [template, storageKey]);

  const handleHeaderUpdate = (header: ReportTemplateConfig['header']) => {
    setTemplate((prev) => ({ ...prev, header }));
  };

  const handleSectionUpdate = (updatedSection: SectionConfig) => {
    setTemplate((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === updatedSection.id ? updatedSection : s
      ),
    }));
  };

  const handleSectionDelete = (sectionId: string) => {
    setTemplate((prev) => ({
      ...prev,
      sections: prev.sections
        .filter((s) => s.id !== sectionId)
        .map((s, index) => ({ ...s, order: index })),
    }));
    toast.success('Sección eliminada');
  };

  const handleSectionMove = (index: number, direction: 'up' | 'down') => {
    const newSections = [...template.sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newSections.length) return;

    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    newSections.forEach((s, i) => (s.order = i));
    setTemplate((prev) => ({ ...prev, sections: newSections }));
  };

  const handleAddSection = () => {
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
    setTemplate((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
  };

  const handlePhotoPanelUpdate = (photoPanel: ReportTemplateConfig['photoPanel']) => {
    setTemplate((prev) => ({ ...prev, photoPanel }));
  };

  const handleSignatureUpdate = (signature: ReportTemplateConfig['signature']) => {
    setTemplate((prev) => ({ ...prev, signature }));
  };

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify(template));
    toast.success('Plantilla guardada correctamente');
  };

  const handleReset = () => {
    setTemplate(defaultTemplate);
    localStorage.removeItem(storageKey);
    toast.info('Plantilla restaurada a valores por defecto');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Diseñador de Plantilla</h1>
            <p className="text-sm text-muted-foreground">
              {template.name}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
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
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-auto p-0">
              <TemplatePreview template={template} />
            </DialogContent>
          </Dialog>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Guardar Plantilla
          </Button>
        </div>
      </div>

      {/* Editor Tabs */}
      <Tabs defaultValue="header" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="header">Encabezado</TabsTrigger>
          <TabsTrigger value="sections">Secciones</TabsTrigger>
          <TabsTrigger value="photos">Panel Fotográfico</TabsTrigger>
          <TabsTrigger value="signature">Firma</TabsTrigger>
        </TabsList>

        <TabsContent value="header" className="mt-4">
          <HeaderEditor header={template.header} onUpdate={handleHeaderUpdate} />
        </TabsContent>

        <TabsContent value="sections" className="mt-4 space-y-4">
          {template.sections
            .sort((a, b) => a.order - b.order)
            .map((section, index) => (
              <SectionEditor
                key={section.id}
                section={section}
                onUpdate={handleSectionUpdate}
                onDelete={() => handleSectionDelete(section.id)}
                onMoveUp={() => handleSectionMove(index, 'up')}
                onMoveDown={() => handleSectionMove(index, 'down')}
                isFirst={index === 0}
                isLast={index === template.sections.length - 1}
              />
            ))}
          <Button variant="outline" onClick={handleAddSection} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Sección
          </Button>
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          <PhotoPanelEditor
            photoPanel={template.photoPanel}
            onUpdate={handlePhotoPanelUpdate}
          />
        </TabsContent>

        <TabsContent value="signature" className="mt-4">
          <SignatureEditor
            signature={template.signature}
            onUpdate={handleSignatureUpdate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
