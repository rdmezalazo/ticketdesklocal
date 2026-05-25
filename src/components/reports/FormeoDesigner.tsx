import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Save, RotateCcw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { FormeoEditor } from 'formeo';
import 'formeo/dist/formeo.min.css';
import { ReportTemplateConfig, SectionConfig, ReportField } from '@/types/reportDesigner';

interface FormeoDesignerProps {
  onBack: () => void;
  onSave?: (template: ReportTemplateConfig) => void;
}

export function FormeoDesigner({ onBack, onSave }: FormeoDesignerProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const formeoRef = useRef<FormeoEditor | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (editorRef.current && !formeoRef.current) {
      // Initialize Formeo Editor
      formeoRef.current = new FormeoEditor({
        editorContainer: editorRef.current,
        formData: {},
        events: {
          onSave: (data) => {
            setFormData(data);
            toast.success('Formulario guardado');
            console.log('Form data:', data);
          },
          onEdit: (data) => {
            console.log('Form edited:', data);
          },
        },
      });
    }

    return () => {
      if (formeoRef.current) {
        formeoRef.current.destroy();
        formeoRef.current = null;
      }
    };
  }, []);

  const handleSave = () => {
    if (formeoRef.current) {
      const data = formeoRef.current.formData;
      setFormData(data);
      
      // Convert formeo data to our template format
      const template: ReportTemplateConfig = convertFormeoToTemplate(data);
      
      if (onSave) {
        onSave(template);
      }
      
      toast.success('Formato guardado exitosamente');
    }
  };

  const convertFormeoToTemplate = (formeoData: any): ReportTemplateConfig => {
    const template: ReportTemplateConfig = {
      id: `formeo_${Date.now()}`,
      name: formeoData.title || 'Nuevo Formato Formeo',
      header: {
        logoUrl: '/lovable-uploads/0ad48902-f38c-4c48-8a2b-8ab374774068.png',
        logoWidth: 80,
        logoHeight: 60,
        title: formeoData.title || 'NUEVO FORMATO',
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
      sections: formeoData.sections?.map((section: any, index: number): SectionConfig => {
        // Extract fields from section children (could be nested in rows/columns)
        const extractFields = (children: any[]): ReportField[] => {
          return children.flatMap((child: any, fieldIndex: number): ReportField[] => {
            // If it's a row/column container, extract its children
            if (child.children && Array.isArray(child.children)) {
              return extractFields(child.children);
            }
            
            // It's a field
            return {
              id: child.id || `field_${index}_${fieldIndex}`,
              label: child.label || child.legend || child.name || `Campo ${fieldIndex + 1}`,
              type: mapFormeoTypeToFieldType(child.type),
              placeholder: child.placeholder || child.config?.placeholder || '',
              required: child.required || false,
              order: fieldIndex,
              fontSize: 11,
              fontFamily: 'Arial',
              fontWeight: 'normal',
              fontStyle: 'normal',
              textColor: '#000000',
              bgColor: '#ffffff',
              labelWidth: 35,
              valueWidth: 65,
            };
          });
        };

        const fields = section.children ? extractFields(section.children) : [];

        return {
          id: section.id || `section_${index}`,
          name: section.label || section.legend || `Sección ${index + 1}`,
          order: index,
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
          fields,
        };
      }) || [],
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

    return template;
  };

  const mapFormeoTypeToFieldType = (formeoType: string): 'text' | 'date' | 'number' | 'select' | 'textarea' | 'checkbox' => {
    const typeMap: Record<string, 'text' | 'date' | 'number' | 'select' | 'textarea' | 'checkbox'> = {
      text: 'text',
      textarea: 'textarea',
      number: 'number',
      date: 'date',
      select: 'select',
      checkbox: 'checkbox',
      checkboxes: 'checkbox',
      radio: 'select',
      paragraph: 'textarea',
    };
    return typeMap[formeoType] || 'text';
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
                <h1 className="text-xl font-bold">Diseñador de Formatos con Formeo</h1>
                <Badge variant="secondary" className="text-xs">
                  Nuevo Formato
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Crea un nuevo formato utilizando el editor visual de Formeo
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => formeoRef.current?.reset()}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={!formData}>
                  <Eye className="h-4 w-4 mr-2" />
                  Vista Previa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[95vh] overflow-auto p-0">
                <DialogHeader className="px-6 py-4 border-b">
                  <DialogTitle>Vista Previa del Formato</DialogTitle>
                </DialogHeader>
                <div className="p-6">
                  {formData && (
                    <div className="space-y-4">
                      <div className="text-sm">
                        <h3 className="font-bold text-lg mb-4">Datos del Formulario (JSON)</h3>
                        <pre className="bg-slate-100 p-4 rounded-lg overflow-auto max-h-[600px] text-xs">
                          {JSON.stringify(formData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              Guardar Formato
            </Button>
          </div>
        </div>
      </div>

      {/* Formeo Editor Container */}
      <div className="p-6">
        <Card className="bg-white rounded-lg border shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Editor de Formulario</CardTitle>
            <p className="text-sm text-slate-500">
              Arrastra y suelta campos desde el panel derecho. Configura propiedades, validaciones y estilos.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div
              ref={editorRef}
              className="min-h-[600px]"
              style={{ height: 'calc(100vh - 250px)' }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
