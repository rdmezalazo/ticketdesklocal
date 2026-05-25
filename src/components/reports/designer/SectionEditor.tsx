import { useState } from "react";
import { GripVertical, ChevronDown, ChevronUp, Plus, Settings, Eye, EyeOff, AlignLeft, AlignCenter, AlignRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FieldEditor } from "./FieldEditor";
import { SectionConfig, ReportField, SectionLayout, TextAlignment, fontFamilies, fontSizes } from "@/types/reportDesigner";

interface SectionEditorProps {
  section: SectionConfig;
  onUpdate: (section: SectionConfig) => void;
  onDelete?: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  dragHandleProps?: any;
}

export function SectionEditor({
  section,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  dragHandleProps,
}: SectionEditorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const handleChange = (key: keyof SectionConfig, value: any) => {
    onUpdate({ ...section, [key]: value });
  };

  const handleFieldUpdate = (updatedField: ReportField) => {
    const updatedFields = section.fields.map((f) =>
      f.id === updatedField.id ? updatedField : f
    );
    handleChange('fields', updatedFields);
  };

  const handleFieldDelete = (fieldId: string) => {
    const updatedFields = section.fields.filter((f) => f.id !== fieldId);
    handleChange('fields', updatedFields);
  };

  const handleAddField = () => {
    const newField: ReportField = {
      id: `field_${Date.now()}`,
      label: 'Nuevo Campo',
      type: 'text',
      required: false,
      order: section.fields.length,
      fontSize: 11,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textColor: '#000000',
      bgColor: '#f9fafb',
    };
    handleChange('fields', [...section.fields, newField]);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...section.fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newFields.length) return;
    
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    newFields.forEach((f, i) => (f.order = i));
    handleChange('fields', newFields);
  };

  return (
    <Card className={!section.visible ? 'opacity-60' : ''}>
      <CardHeader className="py-3">
        <div className="flex items-center gap-2">
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex-1">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                  <CardTitle className="text-base flex items-center gap-2">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                    {section.name}
                  </CardTitle>
                </Button>
              </CollapsibleTrigger>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleChange('visible', !section.visible)}
                  title={section.visible ? 'Ocultar sección' : 'Mostrar sección'}
                >
                  {section.visible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>

                <Dialog open={showSettings} onOpenChange={setShowSettings}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Configurar Sección</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Nombre de la Sección</Label>
                        <Input
                          value={section.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                        />
                      </div>

                      {/* Alineación */}
                      <div className="space-y-2">
                        <Label>Alineación de la Sección</Label>
                        <ToggleGroup
                          type="single"
                          value={section.alignment}
                          onValueChange={(value: TextAlignment) => value && handleChange('alignment', value)}
                          className="justify-start"
                        >
                          <ToggleGroupItem value="left" aria-label="Alinear a la izquierda">
                            <AlignLeft className="h-4 w-4" />
                          </ToggleGroupItem>
                          <ToggleGroupItem value="center" aria-label="Centrar">
                            <AlignCenter className="h-4 w-4" />
                          </ToggleGroupItem>
                          <ToggleGroupItem value="right" aria-label="Alinear a la derecha">
                            <AlignRight className="h-4 w-4" />
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>

                      {/* Layout de la sección */}
                      <div className="space-y-2">
                        <Label>Tipo de Layout</Label>
                        <Select
                          value={section.layout}
                          onValueChange={(value: SectionLayout) => handleChange('layout', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="horizontal">Horizontal (Etiqueta | Valor)</SelectItem>
                            <SelectItem value="vertical">Vertical (Etiqueta arriba, Valor abajo)</SelectItem>
                            <SelectItem value="table">Tabla de datos (Etiquetas son Encabezados)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Configuración de columnas y anchos */}
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                        <Label className="text-sm font-medium">Configuración de Tabla</Label>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Número de Columnas</Label>
                            <Select
                              value={String(section.columns)}
                              onValueChange={(value) => handleChange('columns', parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 columna</SelectItem>
                                <SelectItem value="2">2 columnas</SelectItem>
                                <SelectItem value="3">3 columnas</SelectItem>
                                <SelectItem value="4">4 columnas</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Ancho de Tabla: {section.tableWidth}%</Label>
                            <Slider
                              value={[section.tableWidth]}
                              onValueChange={([value]) => handleChange('tableWidth', value)}
                              min={50}
                              max={100}
                              step={5}
                            />
                          </div>
                        </div>

                        {section.layout === 'horizontal' && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Ancho Columna Etiquetas: {section.labelWidth}%</Label>
                              <Slider
                                value={[section.labelWidth]}
                                onValueChange={([value]) => handleChange('labelWidth', value)}
                                min={10}
                                max={90}
                                step={5}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Ancho Columna Valores: {section.valueWidth}%</Label>
                              <Slider
                                value={[section.valueWidth]}
                                onValueChange={([value]) => handleChange('valueWidth', value)}
                                min={10}
                                max={90}
                                step={5}
                              />
                            </div>
                          </div>
                        )}

                        {section.layout === 'table' && (
                          <div className="space-y-4 p-3 border rounded-lg bg-blue-50/50">
                            <Label className="text-sm font-medium text-blue-700">Configuración de Tabla de Datos</Label>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Número de Filas por Página: {section.tableRows || 5}</Label>
                              <Select
                                value={String(section.tableRows || 5)}
                                onValueChange={(value) => handleChange('tableRows', parseInt(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[3, 5, 10, 15, 20, 25, 30].map((num) => (
                                    <SelectItem key={num} value={String(num)}>
                                      {num} filas
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Las etiquetas de los campos serán los encabezados de las columnas de la tabla.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Tipografía del título */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Fuente Título</Label>
                          <Select
                            value={section.titleFontFamily}
                            onValueChange={(value) => handleChange('titleFontFamily', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {fontFamilies.map((font) => (
                                <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                                  {font}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Tamaño</Label>
                          <Select
                            value={String(section.titleFontSize)}
                            onValueChange={(value) => handleChange('titleFontSize', parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {fontSizes.map((size) => (
                                <SelectItem key={size} value={String(size)}>
                                  {size}px
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Peso</Label>
                          <Select
                            value={section.titleFontWeight}
                            onValueChange={(value: 'normal' | 'bold') => handleChange('titleFontWeight', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="bold">Negrita</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Color del Título</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={section.titleColor}
                            onChange={(e) => handleChange('titleColor', e.target.value)}
                            className="w-12 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            value={section.titleColor}
                            onChange={(e) => handleChange('titleColor', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onMoveUp}
                  disabled={isFirst}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onMoveDown}
                  disabled={isLast}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    className="text-destructive hover:text-destructive"
                    title="Eliminar sección"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <CollapsibleContent>
              <CardContent className="pt-4 px-0">
                {/* Info de configuración de sección */}
                <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <div className="flex flex-wrap gap-4">
                    <span>Layout: <strong>{section.layout === 'horizontal' ? 'Horizontal' : section.layout === 'vertical' ? 'Vertical' : 'Tabla de datos'}</strong></span>
                    {section.layout !== 'table' && <span>Columnas: <strong>{section.columns}</strong></span>}
                    {section.layout === 'horizontal' && (
                      <span>Anchos: <strong>{section.labelWidth}% / {section.valueWidth}%</strong></span>
                    )}
                    {section.layout === 'table' && (
                      <span>Filas: <strong>{section.tableRows || 5}</strong></span>
                    )}
                    <span>Ancho tabla: <strong>{section.tableWidth}%</strong></span>
                    <span>Alineación: <strong>{section.alignment === 'left' ? 'Izquierda' : section.alignment === 'center' ? 'Centro' : 'Derecha'}</strong></span>
                  </div>
                </div>

                <div className="space-y-2">
                  {section.fields
                    .sort((a, b) => a.order - b.order)
                    .map((field, index) => (
                      <div key={field.id} className="flex items-center gap-1">
                        <div className="flex flex-col">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => moveField(index, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => moveField(index, 'down')}
                            disabled={index === section.fields.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex-1">
                          <FieldEditor
                            field={field}
                            onUpdate={handleFieldUpdate}
                            onDelete={handleFieldDelete}
                            sectionColumns={section.columns}
                          />
                        </div>
                      </div>
                    ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddField}
                  className="mt-4 w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Campo
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardHeader>
    </Card>
  );
}
