import { useState } from "react";
import { GripVertical, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ReportField, FieldType, fontFamilies, fontSizes } from "@/types/reportDesigner";

interface FieldEditorProps {
  field: ReportField;
  onUpdate: (field: ReportField) => void;
  onDelete: (fieldId: string) => void;
  isDragging?: boolean;
  dragHandleProps?: any;
  sectionColumns?: number;
}

export function FieldEditor({ field, onUpdate, onDelete, isDragging, dragHandleProps, sectionColumns = 1 }: FieldEditorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (key: keyof ReportField, value: any) => {
    onUpdate({ ...field, [key]: value });
  };

  return (
    <div
      className={`flex items-center gap-2 p-3 border rounded-lg bg-card transition-all ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 items-center">
        <div className="font-medium text-sm truncate">{field.label}</div>
        <div className="text-sm text-muted-foreground capitalize">{field.type}</div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Campo: {field.label}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Información Básica */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Etiqueta</Label>
                <Input
                  value={field.label}
                  onChange={(e) => handleChange('label', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Dato</Label>
                <Select
                  value={field.type}
                  onValueChange={(value: FieldType) => handleChange('type', value)}
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
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Columnas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Columnas de la Sección</Label>
                <Input
                  type="number"
                  value={sectionColumns}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Columna del Campo</Label>
                <Select
                  value={String(field.column || 1)}
                  onValueChange={(value) => handleChange('column', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: sectionColumns }, (_, i) => i + 1).map((col) => (
                      <SelectItem key={col} value={String(col)}>
                        Columna {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ancho del Campo */}
            <div className="space-y-3">
              <Label>Ancho del Campo: {field.columnWidth || 100}%</Label>
              <Slider
                value={[field.columnWidth || 100]}
                onValueChange={(value) => handleChange('columnWidth', value[0])}
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Primer elemento en columna */}
            <div className="flex items-center gap-2">
              <Switch
                checked={field.isFirstInColumn || false}
                onCheckedChange={(checked) => handleChange('isFirstInColumn', checked)}
              />
              <Label>Primer elemento en la columna (evita filas vacías)</Label>
            </div>

            {/* Placeholder y Longitud */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Placeholder</Label>
                <Input
                  value={field.placeholder || ''}
                  onChange={(e) => handleChange('placeholder', e.target.value)}
                  placeholder="Texto de ayuda..."
                />
              </div>
              <div className="space-y-2">
                <Label>Longitud Máxima</Label>
                <Input
                  type="number"
                  value={field.maxLength || ''}
                  onChange={(e) => handleChange('maxLength', parseInt(e.target.value) || undefined)}
                  placeholder="Sin límite"
                />
              </div>
            </div>

            {/* Opciones para Select */}
            {field.type === 'select' && (
              <div className="space-y-2">
                <Label>Opciones (una por línea)</Label>
                <Textarea
                  value={(field.options || []).join('\n')}
                  onChange={(e) => handleChange('options', e.target.value.split('\n').filter(Boolean))}
                  rows={4}
                />
              </div>
            )}

            {/* Tipografía */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Tipografía</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Fuente</Label>
                  <Select
                    value={field.fontFamily}
                    onValueChange={(value) => handleChange('fontFamily', value)}
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
                  <Label className="text-xs text-muted-foreground">Tamaño</Label>
                  <Select
                    value={String(field.fontSize)}
                    onValueChange={(value) => handleChange('fontSize', parseInt(value))}
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
                  <Label className="text-xs text-muted-foreground">Peso</Label>
                  <Select
                    value={field.fontWeight}
                    onValueChange={(value: 'normal' | 'bold') => handleChange('fontWeight', value)}
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
            </div>

            {/* Colores */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color de Texto</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={field.textColor}
                    onChange={(e) => handleChange('textColor', e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={field.textColor}
                    onChange={(e) => handleChange('textColor', e.target.value)}
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
                    onChange={(e) => handleChange('bgColor', e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={field.bgColor}
                    onChange={(e) => handleChange('bgColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Requerido */}
            <div className="flex items-center gap-2">
              <Switch
                checked={field.required}
                onCheckedChange={(checked) => handleChange('required', checked)}
              />
              <Label>Campo Requerido</Label>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(field.id)}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}