import React, { useState, useCallback, useRef, useEffect, ErrorInfo } from 'react';
import { ArrowLeft, Save, RotateCcw, Eye, Upload, Image as ImageIcon, X, Plus, Trash2, GripVertical, Settings2, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useDropzone } from 'react-dropzone';
import Tesseract from 'tesseract.js';
import { toast } from 'sonner';
import { ReportTemplateConfig, SectionConfig, ReportField, fontFamilies, fontSizes, FieldType, SectionLayout, TextAlignment } from '@/types/reportDesigner';
import { TemplatePreview } from './designer/TemplatePreview';

interface ImageToFormDesignerProps {
  onBack: () => void;
  onSave?: (template: ReportTemplateConfig) => void;
}

interface DetectedField {
  id: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select' | 'textarea' | 'checkbox';
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
}

interface GridCell {
  row: number;
  col: number;
  field?: DetectedField;
  isEmpty: boolean;
}

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-bold text-red-800 mb-2">Error en el formato</h2>
          <p className="text-sm text-red-600 mb-4">{this.state.error?.message}</p>
          <Button onClick={() => this.setState({ hasError: false, error: null })}>
            Intentar de nuevo
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ImageToFormDesigner({ onBack, onSave }: ImageToFormDesignerProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [template, setTemplate] = useState<ReportTemplateConfig | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'image' | 'editor'>('image');
  const [gridConfig, setGridConfig] = useState({ rows: 10, cols: 12 });
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Debug logging
  useEffect(() => {
    console.log('ImageToFormDesigner state:', {
      template: template ? 'exists' : 'null',
      activeTab,
      uploadedImage: uploadedImage ? 'exists' : 'null',
      showPreview,
      detectedFields: detectedFields.length
    });
  }, [template, activeTab, uploadedImage, showPreview, detectedFields]);

  // Ensure activeTab is 'image' when there's no template
  useEffect(() => {
    if (!template && activeTab === 'editor') {
      setActiveTab('image');
    }
  }, [template]);

  // Function to convert JSON form structure to ReportTemplateConfig
  const convertJsonToTemplate = (jsonData: any): ReportTemplateConfig => {
    const sections: SectionConfig[] = (jsonData.sections || []).map((section: any, index: number) => {
      const fields: ReportField[] = (section.fields || []).map((field: any, fieldIndex: number) => {
        let type: FieldType = 'text';
        switch (field.type) {
          case 'date':
            type = 'date';
            break;
          case 'checkbox':
            type = 'checkbox';
            break;
          case 'textarea':
            type = 'textarea';
            break;
          case 'text':
          default:
            type = 'text';
            break;
        }

        return {
          id: field.id || `field_${index}_${fieldIndex}`,
          label: field.label || `Campo ${fieldIndex + 1}`,
          type,
          placeholder: '',
          required: false,
          order: fieldIndex,
          fontSize: 11,
          fontFamily: 'Arial',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textColor: '#000000',
          bgColor: '#ffffff',
          labelWidth: 30,
          valueWidth: 70,
        };
      });

      return {
        id: section.id || `section_${index}`,
        name: section.title || `Sección ${index + 1}`,
        order: index,
        visible: true,
        titleFontSize: 12,
        titleFontFamily: 'Arial',
        titleFontWeight: 'bold',
        titleColor: '#000000',
        alignment: 'left' as TextAlignment,
        layout: 'horizontal' as SectionLayout,
        columns: section.columns || Math.max(2, fields.length),
        labelWidth: 30,
        valueWidth: 70,
        tableWidth: 100,
        tableRows: Math.max(3, fields.length),
        fields,
      };
    });

    return {
      id: `json_import_${Date.now()}`,
      name: jsonData.title || 'Formato Importado desde JSON',
      header: {
        logoUrl: jsonData.logoUrl || '',
        logoWidth: 100,
        logoHeight: 80,
        title: jsonData.title || 'FORMATO IMPORTADO',
        titleWidth: 60,
        titleFontSize: 14,
        titleFontFamily: 'Arial',
        titleFontWeight: 'bold',
        code: jsonData.code || 'L-TI-FOR-IMP',
        version: jsonData.version || '1.0',
        versionDate: jsonData.date || new Date().toLocaleDateString('es-ES'),
        metaFontSize: 11,
        metaFontFamily: 'Arial',
        alignment: 'center' as TextAlignment,
      },
      sections,
      photoPanel: {
        visible: false,
        title: 'Panel Fotográfico',
        photos: [],
        columns: 2,
        photoHeight: 180,
        alignment: 'center' as TextAlignment,
      },
      signature: {
        signatureImage: '',
        signatureWidth: 150,
        signatureHeight: 60,
        signatureName: '',
        signaturePosition: '',
        fontSize: 12,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        alignment: 'center' as TextAlignment,
      },
    };
  };

  // Handle JSON file upload
  const handleJsonUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        console.log('JSON data loaded:', jsonData);

        const template = convertJsonToTemplate(jsonData);
        console.log('Converted template:', template);

        setTemplate(template);
        toast.success(`Formato importado: ${jsonData.title || 'Sin título'}`);
        setActiveTab('editor');
      } catch (error) {
        console.error('Error parsing JSON:', error);
        toast.error('Error al leer el archivo JSON');
      }
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Check if it's a JSON file
    if (file.name.endsWith('.json')) {
      handleJsonUpload(file);
      return;
    }

    // Validate file type for images
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor sube un archivo de imagen válido (PNG, JPG, etc.) o un archivo JSON');
      return;
    }

    // Validate file size (max 5MB for OCR)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.warning(`La imagen es muy grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Se generará una plantilla básica.`);
      setIsProcessing(false);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        setUploadedImage(result);
        const img = new Image();
        img.onload = () => {
          setImageDimensions({ width: img.width, height: img.height });
        };
        img.src = result;
        const basicTemplate: ReportTemplateConfig = generateBasicTemplate();
        setTemplate(basicTemplate);
        setTimeout(() => {
          setActiveTab('editor');
        }, 100);
      };
      reader.onerror = () => {
        console.error('FileReader error');
        toast.error('Error al leer el archivo');
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);

      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
      };
      img.src = result;

      // Process image with OCR
      await processImageWithOCR(result);
    };

    reader.onerror = () => {
      console.error('FileReader error');
      toast.error('Error al leer el archivo');
      setIsProcessing(false);
    };

    reader.readAsDataURL(file);
  }, [handleJsonUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/json': ['.json']
    },
    maxFiles: 1,
    multiple: false
  });

  const processImageWithOCR = async (imageData: string) => {
    try {
      toast.info('Procesando imagen con OCR...');

      console.log('Starting Tesseract OCR...');
      console.log('Image data length:', imageData.length);
      console.log('Image data prefix:', imageData.substring(0, 50));

      // Create worker explicitly with Spanish language
      console.log('Creating Tesseract worker...');
      const worker = await Tesseract.createWorker('spa');
      console.log('Worker created successfully');

      console.log('Recognizing text...');
      const result = await worker.recognize(imageData);
      console.log('Recognition complete');

      console.log('Terminating worker...');
      await worker.terminate();
      console.log('Worker terminated');

      console.log('OCR Result:', result);
      console.log('OCR confidence:', result.data.confidence);
      const { text, lines } = result.data;
      console.log('OCR text:', text);
      console.log('OCR lines:', lines);
      console.log('Number of lines:', lines?.length || 0);

      // Detect fields from OCR results
      const fields = detectFieldsFromOCR(lines || []);
      setDetectedFields(fields);

      // Generate template from detected fields
      const generatedTemplate = generateTemplateFromFields(fields);
      console.log('Generated template:', generatedTemplate);
      setTemplate(generatedTemplate);

      toast.success(`Imagen procesada: ${fields.length} campos detectados`);
      // Wait for template state to update before switching tabs
      setTimeout(() => {
        setActiveTab('editor');
      }, 100);
    } catch (error) {
      console.error('OCR Error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

      // Log more info about the error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.name : 'Unknown';
      console.error(`Error name: ${errorName}, message: ${errorMessage}`);

      toast.error(`Error al procesar la imagen: ${errorMessage}. Generando plantilla básica...`);

      // Generate basic template even if OCR fails
      const basicTemplate: ReportTemplateConfig = generateBasicTemplate();
      console.log('Basic template:', basicTemplate);
      setTemplate(basicTemplate);
      // Wait for template state to update before switching tabs
      setTimeout(() => {
        setActiveTab('editor');
      }, 100);
    } finally {
      setIsProcessing(false);
    }
  };

  const detectFieldsFromOCR = (lines: any[]): DetectedField[] => {
    const fields: DetectedField[] = [];
    let fieldIndex = 0;

    console.log('=== INICIO DETECCIÓN DE CAMPOS ===');
    console.log('Total lines received:', lines?.length || 0);

    lines.forEach((line, index) => {
      const text = line.text?.trim();
      const bbox = line.bbox;

      console.log(`\n--- Línea ${index} ---`);
      console.log('Texto:', text);
      console.log('BBox:', bbox);

      if (!text || text.length < 1) {
        console.log('⚠️ Skip: texto vacío o muy corto');
        return;
      }

      // DETECTAR CUALQUIER LÍNEA DE TEXTO COMO CAMPO POTENCIAL
      // Esto es muy permisivo - detecta todo lo que tenga entre 2 y 80 caracteres
      const shouldDetect = text.length >= 2 && text.length <= 80;

      console.log('Longitud del texto:', text.length, '- ¿Detectar?', shouldDetect);

      if (shouldDetect) {
        // Limpiar el texto
        let cleanLabel = text.replace(/[:.\)]$/, '').trim();
        cleanLabel = cleanLabel.replace(/\s+/g, ' ');

        console.log('✓ Label detectado:', cleanLabel);

        // Determinar tipo de campo
        let type: DetectedField['type'] = 'text';
        const lowerLabel = cleanLabel.toLowerCase();

        if (lowerLabel.includes('fecha') || lowerLabel.includes('date') || lowerLabel.includes('día') || lowerLabel.includes('dia')) {
          type = 'date';
        } else if (lowerLabel.includes('nro') || lowerLabel.includes('número') || lowerLabel.includes('numero') ||
          lowerLabel.includes('cantidad') || lowerLabel.includes('monto') || lowerLabel.includes('precio') ||
          lowerLabel.includes('teléfono') || lowerLabel.includes('telefono') || lowerLabel.includes('celular')) {
          type = 'number';
        } else if (lowerLabel.includes('tipo') || lowerLabel.includes('opción') || lowerLabel.includes('opcion') ||
          lowerLabel.includes('género') || lowerLabel.includes('genero') || lowerLabel.includes('estado') ||
          lowerLabel.includes('sexo') || lowerLabel.includes('categoría') || lowerLabel.includes('area')) {
          type = 'select';
        } else if (lowerLabel.includes('observación') || lowerLabel.includes('observacion') ||
          lowerLabel.includes('comentario') || lowerLabel.includes('descripción') || lowerLabel.includes('descripcion') ||
          lowerLabel.includes('nota') || lowerLabel.includes('detalle') || lowerLabel.includes('dirección') || lowerLabel.includes('direccion')) {
          type = 'textarea';
        } else if (lowerLabel.includes('email') || lowerLabel.includes('correo') || lowerLabel.includes('e-mail')) {
          type = 'text';
        } else if (lowerLabel.includes('checkbox') || lowerLabel.includes('check') || lowerLabel.includes('marca') || lowerLabel.includes('seleccione')) {
          type = 'checkbox';
        }

        fields.push({
          id: `field_${fieldIndex++}`,
          label: cleanLabel,
          type,
          x: bbox?.x0 || (index * 50),
          y: bbox?.y0 || (index * 30),
          width: (bbox?.x1 || 200) - (bbox?.x0 || 0),
          height: (bbox?.y1 || 30) - (bbox?.y0 || 0),
          required: false,
        });
      } else {
        console.log('✗ No es label (longitud:', text.length, '):', text);
      }
    });

    console.log('\n=== FIN DETECCIÓN DE CAMPOS ===');
    console.log('Total campos detectados:', fields.length);
    console.log('Campos:', fields.map(f => `${f.label} (${f.type})`).join(', '));

    return fields;
  };

  const generateTemplateFromFields = (fields: DetectedField[]): ReportTemplateConfig => {
    // Group fields by vertical position to create sections
    const sectionsMap = new Map<number, DetectedField[]>();

    fields.forEach(field => {
      const sectionKey = Math.floor(field.y / 100); // Group by every 100px
      if (!sectionsMap.has(sectionKey)) {
        sectionsMap.set(sectionKey, []);
      }
      sectionsMap.get(sectionKey)!.push(field);
    });

    const sections: SectionConfig[] = Array.from(sectionsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([sectionIndex, sectionFields], index) => ({
        id: `section_${index}`,
        name: `Sección ${index + 1}`,
        order: index,
        visible: true,
        titleFontSize: 12,
        titleFontFamily: 'Arial',
        titleFontWeight: 'bold',
        titleColor: '#000000',
        alignment: 'left',
        layout: 'horizontal',
        columns: Math.min(4, sectionFields.length),
        labelWidth: 30,
        valueWidth: 70,
        tableWidth: 100,
        tableRows: Math.max(3, sectionFields.length),
        fields: sectionFields.map((field, fieldIndex): ReportField => ({
          id: field.id,
          label: field.label,
          type: field.type,
          placeholder: '',
          required: field.required,
          order: fieldIndex,
          fontSize: 11,
          fontFamily: 'Arial',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textColor: '#000000',
          bgColor: '#ffffff',
          labelWidth: 30,
          valueWidth: 70,
        })),
      }));

    return {
      id: `image_import_${Date.now()}`,
      name: 'Formato Importado desde Imagen',
      header: {
        logoUrl: uploadedImage || '',
        logoWidth: 100,
        logoHeight: 80,
        title: 'FORMATO IMPORTADO',
        titleWidth: 60,
        titleFontSize: 14,
        titleFontFamily: 'Arial',
        titleFontWeight: 'bold',
        code: 'L-TI-FOR-IMP',
        version: '1.0',
        versionDate: new Date().toLocaleDateString('es-ES'),
        metaFontSize: 11,
        metaFontFamily: 'Arial',
        alignment: 'center',
      },
      sections,
      photoPanel: {
        visible: false,
        title: 'Panel Fotográfico',
        photos: [],
        columns: 2,
        photoHeight: 180,
        alignment: 'center',
      },
      signature: {
        signatureImage: '',
        signatureWidth: 150,
        signatureHeight: 60,
        signatureName: '',
        signaturePosition: '',
        fontSize: 12,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        alignment: 'center',
      },
    };
  };

  const generateBasicTemplate = (): ReportTemplateConfig => ({
    id: `basic_${Date.now()}`,
    name: 'Formato Básico',
    header: {
      logoUrl: uploadedImage || '',
      logoWidth: 100,
      logoHeight: 80,
      title: 'NUEVO FORMATO',
      titleWidth: 60,
      titleFontSize: 14,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      code: 'L-TI-FOR-NEW',
      version: '1.0',
      versionDate: new Date().toLocaleDateString('es-ES'),
      metaFontSize: 11,
      metaFontFamily: 'Arial',
      alignment: 'center',
    },
    sections: [
      {
        id: 'section_1',
        name: 'Sección 1',
        order: 0,
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
      }
    ],
    photoPanel: {
      visible: false,
      title: 'Panel Fotográfico',
      photos: [],
      columns: 2,
      photoHeight: 180,
      alignment: 'center',
    },
    signature: {
      signatureImage: '',
      signatureWidth: 150,
      signatureHeight: 60,
      signatureName: '',
      signaturePosition: '',
      fontSize: 12,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      alignment: 'center',
    },
  });

  const handleSave = () => {
    if (!template) {
      toast.error('No hay un formato para guardar');
      return;
    }

    if (onSave) {
      onSave(template);
    }

    toast.success('Formato guardado exitosamente');
  };

  const updateSection = (sectionId: string, updates: Partial<SectionConfig>) => {
    if (!template) return;
    setTemplate({
      ...template,
      sections: template.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s)
    });
  };

  const updateField = (sectionId: string, fieldId: string, updates: Partial<ReportField>) => {
    if (!template) return;
    setTemplate({
      ...template,
      sections: template.sections.map(s =>
        s.id === sectionId
          ? { ...s, fields: s.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f) }
          : s
      )
    });
  };

  const addSection = () => {
    if (!template) return;
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
    setTemplate({
      ...template,
      sections: [...template.sections, newSection]
    });
  };

  const addField = (sectionId: string) => {
    if (!template) return;
    const section = template.sections.find(s => s.id === sectionId);
    if (!section) return;

    const newField: ReportField = {
      id: `field_${Date.now()}`,
      label: `Nuevo Campo`,
      type: 'text',
      required: false,
      order: section.fields.length,
      fontSize: 11,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textColor: '#000000',
      bgColor: '#ffffff',
      labelWidth: section.labelWidth,
      valueWidth: section.valueWidth,
    };

    setTemplate({
      ...template,
      sections: template.sections.map(s =>
        s.id === sectionId
          ? { ...s, fields: [...s.fields, newField] }
          : s
      )
    });
  };

  const deleteSection = (sectionId: string) => {
    if (!template) return;
    setTemplate({
      ...template,
      sections: template.sections.filter(s => s.id !== sectionId)
    });
  };

  const deleteField = (sectionId: string, fieldId: string) => {
    if (!template) return;
    setTemplate({
      ...template,
      sections: template.sections.map(s =>
        s.id === sectionId
          ? { ...s, fields: s.fields.filter(f => f.id !== fieldId) }
          : s
      )
    });
    setSelectedField(null);
  };

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
                <h1 className="text-xl font-bold">Importador de Formatos desde Imagen</h1>
                {template && (
                  <Badge variant="secondary" className="text-xs">
                    {template.name}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sube la imagen de un formulario y genera el formato automáticamente
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {template && (
              <Button variant="outline" onClick={() => {
                setTemplate(null);
                setUploadedImage(null);
                setDetectedFields([]);
                setActiveTab('image');
              }}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Nueva Importación
              </Button>
            )}
            {template && (
              <Button variant="outline" onClick={() => setShowPreview(true)}>
                <Eye className="h-4 w-4 mr-2" />
                Vista Previa
              </Button>
            )}
            <Button onClick={handleSave} disabled={!template} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              {template ? 'Guardar Formato' : 'Guardar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-auto p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Vista Previa del Formato</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            {template && <TemplatePreview template={template} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="image" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {uploadedImage ? 'Imagen Cargada' : 'Subir Imagen'}
            </TabsTrigger>
            <TabsTrigger value="editor" disabled={!template} className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Editor de Formato
            </TabsTrigger>
          </TabsList>

          <TabsContent value="image" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Area */}
              <Card className="bg-white rounded-lg border shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base">1. Subir Imagen o JSON del Formulario</CardTitle>
                  <p className="text-sm text-slate-500">
                    Arrastra la imagen/JSON o haz clic para buscarla en tu equipo
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <div
                    {...getRootProps()}
                    className={`
                      border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all
                      ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
                      ${uploadedImage ? 'bg-green-50 border-green-400' : ''}
                    `}
                  >
                    <input {...getInputProps()} />
                    {isProcessing ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-slate-600">Procesando imagen con OCR...</p>
                      </div>
                    ) : uploadedImage ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-700">Imagen cargada exitosamente</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {imageDimensions.width} x {imageDimensions.height} px
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedImage(null);
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Eliminar imagen
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                          <Upload className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra tu imagen o archivo JSON o haz clic para buscar'}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            PNG, JPG, GIF, WebP, JSON (máx. 5MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {uploadedImage && (
                    <div className="mt-6 space-y-4">
                      <h4 className="text-sm font-semibold mb-2">Vista previa de la imagen:</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <img
                          src={uploadedImage}
                          alt="Uploaded form"
                          className="w-full h-auto max-h-[400px] object-contain"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            const basicTemplate: ReportTemplateConfig = generateBasicTemplate();
                            setTemplate(basicTemplate);
                            setActiveTab('editor');
                          }}
                        >
                          <Settings2 className="w-4 h-4 mr-2" />
                          Generar plantilla básica (sin OCR)
                        </Button>
                      </div>
                    </div>
                  )}

                  {!uploadedImage && (
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <FileJson className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">¿Tienes un archivo JSON de formulario?</p>
                          <p className="text-xs text-blue-700">
                            Puedes cargar directamente el archivo JSON exportado desde el diseñador
                          </p>
                        </div>
                      </div>
                      <div className="text-center">
                        <label>
                          <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleJsonUpload(file);
                              }
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full cursor-pointer"
                            onClick={(e) => {
                              const input = e.currentTarget.querySelector('input');
                              input?.click();
                            }}
                            asChild
                          >
                            <span>
                              <FileJson className="w-4 h-4 mr-2" />
                              Cargar archivo JSON
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Processing Info */}
              <Card className="bg-white rounded-lg border shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base">2. Procesamiento Automático</CardTitle>
                  <p className="text-sm text-slate-500">
                    El sistema detectará automáticamente los campos del formulario
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-bold text-sm">1</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Reconocimiento OCR</p>
                        <p className="text-xs text-slate-500">
                          Extrae el texto de la imagen usando inteligencia artificial
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-bold text-sm">2</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Detección de Campos</p>
                        <p className="text-xs text-slate-500">
                          Identifica etiquetas y determina el tipo de campo automáticamente
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-bold text-sm">3</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Generación de Estructura</p>
                        <p className="text-xs text-slate-500">
                          Crea secciones y organiza los campos según su posición
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-bold text-sm">4</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Ajuste Manual</p>
                        <p className="text-xs text-slate-500">
                          Edita y personaliza el formato generado en el editor
                        </p>
                      </div>
                    </div>
                  </div>

                  {detectedFields.length > 0 && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-800 mb-2">
                        Campos detectados: {detectedFields.length}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {detectedFields.slice(0, 10).map(field => (
                          <Badge key={field.id} variant="outline" className="text-xs">
                            {field.label}
                          </Badge>
                        ))}
                        {detectedFields.length > 10 && (
                          <Badge variant="secondary" className="text-xs">
                            +{detectedFields.length - 10} más
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="editor" className="mt-0">
            <ErrorBoundary>
              {template && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Sections List */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Secciones y Campos</h3>
                      <Button size="sm" onClick={addSection}>
                        <Plus className="w-4 h-4 mr-1" />
                        Nueva Sección
                      </Button>
                    </div>

                    {template.sections.map((section, sectionIndex) => (
                      <Card key={section.id} className="overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-gradient-to-r from-slate-50 to-white border-b">
                          <div className="flex items-center justify-between">
                            <Input
                              value={section.name}
                              onChange={(e) => updateSection(section.id, { name: e.target.value })}
                              className="h-8 font-semibold text-sm bg-transparent border-transparent hover:border-slate-300 w-64"
                            />
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {section.fields.length} campos
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500"
                                onClick={() => deleteSection(section.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            {section.fields.map(field => (
                              <div
                                key={field.id}
                                className={`
                                p-3 border rounded-lg cursor-pointer transition-all
                                ${selectedField === field.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}
                              `}
                                onClick={() => setSelectedField(field.id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <GripVertical className="w-4 h-4 text-slate-400" />
                                    <div>
                                      <p className="text-sm font-medium">{field.label}</p>
                                      <p className="text-xs text-slate-500">
                                        {field.type} {field.required && '• Requerido'}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteField(section.id, field.id);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-dashed"
                              onClick={() => addField(section.id)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Agregar Campo
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Properties Panel */}
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base">Propiedades</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[calc(100vh-300px)] pr-4">
                          {selectedField ? (
                            (() => {
                              const section = template.sections.find(s => s.fields.some(f => f.id === selectedField));
                              const field = section?.fields.find(f => f.id === selectedField);
                              if (!field || !section) return null;

                              return (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 pb-2 border-b">
                                    <Settings2 className="w-4 h-4 text-blue-500" />
                                    <h4 className="font-semibold text-sm">Campo: {field.label}</h4>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Etiqueta</Label>
                                    <Input
                                      value={field.label}
                                      onChange={(e) => updateField(section.id, field.id, { label: e.target.value })}
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Tipo</Label>
                                    <Select
                                      value={field.type}
                                      onValueChange={(v) => updateField(section.id, field.id, { type: v as any })}
                                    >
                                      <SelectTrigger>
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
                                    <Label>Placeholder</Label>
                                    <Input
                                      value={field.placeholder || ''}
                                      onChange={(e) => updateField(section.id, field.id, { placeholder: e.target.value })}
                                    />
                                  </div>

                                  <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border">
                                    <Switch
                                      checked={field.required}
                                      onCheckedChange={(v) => updateField(section.id, field.id, { required: v })}
                                    />
                                    <Label className="cursor-pointer">Campo requerido</Label>
                                  </div>

                                  <div className="my-4 border-t" />

                                  <div className="space-y-2">
                                    <Label>Tamaño de Fuente (px)</Label>
                                    <Slider
                                      value={[field.fontSize]}
                                      onValueChange={([v]) => updateField(section.id, field.id, { fontSize: v })}
                                      min={8}
                                      max={24}
                                      step={1}
                                    />
                                    <div className="text-xs text-slate-500 text-right">{field.fontSize}px</div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Familia de Fuente</Label>
                                    <Select
                                      value={field.fontFamily}
                                      onValueChange={(v) => updateField(section.id, field.id, { fontFamily: v })}
                                    >
                                      <SelectTrigger>
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
                                    <Label>Color de Texto</Label>
                                    <div className="flex gap-2">
                                      <Input
                                        type="color"
                                        value={field.textColor}
                                        onChange={(e) => updateField(section.id, field.id, { textColor: e.target.value })}
                                        className="w-12 h-9"
                                      />
                                      <Input
                                        value={field.textColor}
                                        onChange={(e) => updateField(section.id, field.id, { textColor: e.target.value })}
                                        className="flex-1"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Color de Fondo</Label>
                                    <div className="flex gap-2">
                                      <Input
                                        type="color"
                                        value={field.bgColor}
                                        onChange={(e) => updateField(section.id, field.id, { bgColor: e.target.value })}
                                        className="w-12 h-9"
                                      />
                                      <Input
                                        value={field.bgColor}
                                        onChange={(e) => updateField(section.id, field.id, { bgColor: e.target.value })}
                                        className="flex-1"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="text-center py-8 text-slate-400">
                              <Settings2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                              <p className="text-sm">Selecciona un campo para editar sus propiedades</p>
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
