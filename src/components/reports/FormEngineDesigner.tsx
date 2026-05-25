import { useState, useCallback } from 'react';
import { ArrowLeft, Save, RotateCcw, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { view as muiView } from '@react-form-builder/components-material-ui';
import { FormViewer } from '@react-form-builder/core';
import type { FormSchema } from '@react-form-builder/core';
import { ReportTemplateConfig, SectionConfig, ReportField } from '@/types/reportDesigner';

interface FormEngineDesignerProps {
  onBack: () => void;
  onSave?: (template: ReportTemplateConfig) => void;
}

const defaultFormSchema: FormSchema = {
  form: {
    key: 'main-screen',
    type: 'Screen',
    children: [
      {
        key: 'section-1',
        type: 'MuiBox',
        props: {
          sx: { mb: 3, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#f5f5f5' }
        },
        children: [
          {
            key: 'section-1-title',
            type: 'MuiTypography',
            props: {
              variant: 'h6',
              children: { value: 'Información General' },
              sx: { mb: 2, fontWeight: 'bold' }
            }
          },
          {
            key: 'field-1',
            type: 'MuiTextField',
            props: {
              label: { value: 'Nombre' },
              fullWidth: true,
              sx: { mt: 1, mb: 2 }
            },
            schema: {
              validations: [{ key: 'required' }]
            }
          },
          {
            key: 'field-2',
            type: 'MuiTextField',
            props: {
              label: { value: 'Apellido' },
              fullWidth: true,
              sx: { mt: 1, mb: 2 }
            },
            schema: {
              validations: []
            }
          },
          {
            key: 'field-3',
            type: 'MuiTextField',
            props: {
              label: { value: 'Email' },
              fullWidth: true,
              type: 'email',
              sx: { mt: 1, mb: 2 }
            },
            schema: {
              validations: [{ key: 'required' }, { key: 'email' }]
            }
          }
        ]
      },
      {
        key: 'section-2',
        type: 'MuiBox',
        props: {
          sx: { mb: 3, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#f5f5f5' }
        },
        children: [
          {
            key: 'section-2-title',
            type: 'MuiTypography',
            props: {
              variant: 'h6',
              children: { value: 'Información Adicional' },
              sx: { mb: 2, fontWeight: 'bold' }
            }
          },
          {
            key: 'field-4',
            type: 'MuiSelect',
            props: {
              label: { value: 'Tipo de Documento' },
              fullWidth: true,
              sx: { mt: 1, mb: 2 },
              options: [
                { value: 'dni', label: 'DNI' },
                { value: 'passport', label: 'Pasaporte' },
                { value: 'license', label: 'Licencia' }
              ]
            },
            schema: {
              validations: [{ key: 'required' }]
            }
          },
          {
            key: 'field-5',
            type: 'MuiTextField',
            props: {
              label: { value: 'Número de Documento' },
              fullWidth: true,
              sx: { mt: 1, mb: 2 }
            },
            schema: {
              validations: []
            }
          }
        ]
      },
      {
        key: 'submit-btn',
        type: 'MuiButton',
        props: {
          variant: 'contained',
          color: 'primary',
          children: { value: 'Enviar' },
          fullWidth: true,
          sx: { mt: 2 }
        },
        events: {
          onClick: [
            { name: 'validate', type: 'common' },
            { name: 'onSubmit', type: 'custom' }
          ]
        }
      }
    ]
  }
};

export function FormEngineDesigner({ onBack, onSave }: FormEngineDesignerProps) {
  const [formSchema, setFormSchema] = useState<FormSchema>(defaultFormSchema);
  const [jsonEditorValue, setJsonEditorValue] = useState<string>(JSON.stringify(defaultFormSchema, null, 2));
  const [activeTab, setActiveTab] = useState<'design' | 'json'>('design');

  const handleFormChange = useCallback((newSchema: FormSchema) => {
    setFormSchema(newSchema);
    setJsonEditorValue(JSON.stringify(newSchema, null, 2));
  }, []);

  const handleJsonChange = (value: string) => {
    setJsonEditorValue(value);
    try {
      const parsed = JSON.parse(value);
      setFormSchema(parsed);
    } catch (e) {
      // Invalid JSON, don't update schema
    }
  };

  const handleSave = () => {
    const template: ReportTemplateConfig = convertFormEngineToTemplate(formSchema);
    
    if (onSave) {
      onSave(template);
    }
    
    toast.success('Formato guardado exitosamente');
  };

  const handleReset = () => {
    setFormSchema(defaultFormSchema);
    setJsonEditorValue(JSON.stringify(defaultFormSchema, null, 2));
    toast.info('Formulario restaurado a valores por defecto');
  };

  const convertFormEngineToTemplate = (schema: FormSchema): ReportTemplateConfig => {
    const extractSections = (children: any[]): SectionConfig[] => {
      return children
        .filter(child => child.type === 'MuiBox' && child.props?.sx?.mb)
        .map((section, index): SectionConfig => {
          const fields: ReportField[] = [];
          
          const extractFields = (items: any[]) => {
            items.forEach((item) => {
              if (item.type === 'MuiTextField' || item.type === 'MuiSelect') {
                fields.push({
                  id: item.key || `field_${index}_${fields.length}`,
                  label: item.props?.label?.value || item.props?.children?.value || `Campo ${fields.length + 1}`,
                  type: item.type === 'MuiSelect' ? 'select' : 'text',
                  placeholder: item.props?.placeholder?.value || '',
                  required: item.schema?.validations?.some((v: any) => v.key === 'required') || false,
                  order: fields.length,
                  fontSize: 11,
                  fontFamily: 'Arial',
                  fontWeight: 'normal',
                  fontStyle: 'normal',
                  textColor: '#000000',
                  bgColor: '#ffffff',
                  labelWidth: 35,
                  valueWidth: 65,
                });
              }
              if (item.children && Array.isArray(item.children)) {
                extractFields(item.children);
              }
            });
          };
          
          extractFields(section.children || []);
          
          return {
            id: section.key || `section_${index}`,
            name: section.children?.find((c: any) => c.type === 'MuiTypography')?.props?.children?.value || `Sección ${index + 1}`,
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
        });
    };

    const sections = schema.form?.children ? extractSections(schema.form.children) : [];

    return {
      id: `formengine_${Date.now()}`,
      name: 'Nuevo Formato FormEngine',
      header: {
        logoUrl: '/lovable-uploads/0ad48902-f38c-4c48-8a2b-8ab374774068.png',
        logoWidth: 80,
        logoHeight: 60,
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
                <h1 className="text-xl font-bold">Diseñador de Formatos con FormEngine</h1>
                <Badge variant="secondary" className="text-xs">
                  Nuevo Formato
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Edita el schema JSON o visualiza el formulario
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reiniciar
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              Guardar Formato
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="design" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Vista Previa
              </TabsTrigger>
              <TabsTrigger value="json" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Editor JSON
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="design" className="mt-0">
            <Card className="bg-white rounded-lg border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">Vista Previa del Formulario</CardTitle>
                <p className="text-sm text-slate-500">
                  Visualiza cómo se verá el formulario. Los cambios en el JSON se reflejan aquí.
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="min-h-[500px]">
                  <FormViewer
                    view={muiView}
                    getForm={() => JSON.stringify(formSchema)}
                    actions={{
                      onSubmit: (e) => {
                        console.log('Form submitted:', e.data);
                        toast.success('Formulario válido: ' + JSON.stringify(e.data));
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="json" className="mt-0">
            <Card className="bg-white rounded-lg border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">Editor de Schema JSON</CardTitle>
                <p className="text-sm text-slate-500">
                  Edita directamente el schema del formulario. Los cambios se reflejan en la vista previa.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <Textarea
                  value={jsonEditorValue}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  className="h-[600px] font-mono text-xs"
                  placeholder="Paste your FormEngine schema here..."
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
