import { useRef } from "react";
import { Upload, Image, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { HeaderConfig, TextAlignment, fontFamilies, fontSizes } from "@/types/reportDesigner";

interface HeaderEditorProps {
  header: HeaderConfig;
  onUpdate: (header: HeaderConfig) => void;
}

export function HeaderEditor({ header, onUpdate }: HeaderEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: keyof HeaderConfig, value: any) => {
    onUpdate({ ...header, [key]: value });
  };

  const handleLogoUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    handleChange('logoUrl', url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Configuración del Encabezado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alineación */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Alineación del Encabezado</Label>
          <ToggleGroup
            type="single"
            value={header.alignment}
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

        {/* Logo */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Logo</Label>
          <div className="flex gap-4 items-start">
            <div
              className="w-24 h-20 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {header.logoUrl ? (
                <img
                  src={header.logoUrl}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                  style={{ width: header.logoWidth, height: header.logoHeight }}
                />
              ) : (
                <Image className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
            />
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Ancho: {header.logoWidth}px</Label>
                <Slider
                  value={[header.logoWidth]}
                  onValueChange={([value]) => handleChange('logoWidth', value)}
                  min={40}
                  max={200}
                  step={5}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Alto: {header.logoHeight}px</Label>
                <Slider
                  value={[header.logoHeight]}
                  onValueChange={([value]) => handleChange('logoHeight', value)}
                  min={30}
                  max={150}
                  step={5}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Título */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Título del Reporte</Label>
          <Textarea
            value={header.title}
            onChange={(e) => handleChange('title', e.target.value)}
            rows={2}
          />
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Ancho Título: {header.titleWidth}%</Label>
              <Slider
                value={[header.titleWidth]}
                onValueChange={([value]) => handleChange('titleWidth', value)}
                min={30}
                max={80}
                step={5}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Fuente</Label>
              <Select
                value={header.titleFontFamily}
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
              <Label className="text-xs text-muted-foreground">Tamaño</Label>
              <Select
                value={String(header.titleFontSize)}
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
              <Label className="text-xs text-muted-foreground">Peso</Label>
              <Select
                value={header.titleFontWeight}
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
        </div>

        {/* Metadatos */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Metadatos del Documento</Label>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Código</Label>
              <Input
                value={header.code}
                onChange={(e) => handleChange('code', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Versión</Label>
              <Input
                value={header.version}
                onChange={(e) => handleChange('version', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Fecha</Label>
              <Input
                value={header.versionDate}
                onChange={(e) => handleChange('versionDate', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Fuente Metadatos</Label>
              <Select
                value={header.metaFontFamily}
                onValueChange={(value) => handleChange('metaFontFamily', value)}
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
              <Label className="text-xs text-muted-foreground">Tamaño Metadatos</Label>
              <Select
                value={String(header.metaFontSize)}
                onValueChange={(value) => handleChange('metaFontSize', parseInt(value))}
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
