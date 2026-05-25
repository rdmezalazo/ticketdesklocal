import { useRef } from "react";
import { Upload, Image, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Toggle } from "@/components/ui/toggle";
import { SignatureConfig, TextAlignment, fontFamilies, fontSizes } from "@/types/reportDesigner";

interface SignatureEditorProps {
  signature: SignatureConfig;
  onUpdate: (signature: SignatureConfig) => void;
}

export function SignatureEditor({ signature, onUpdate }: SignatureEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: keyof SignatureConfig, value: any) => {
    onUpdate({ ...signature, [key]: value });
  };

  const handleSignatureUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    handleChange('signatureImage', url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Configuración de Firma</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alineación */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Alineación de la Firma</Label>
          <ToggleGroup
            type="single"
            value={signature.alignment}
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

        {/* Imagen de Firma */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Imagen de Firma</Label>
          <div className="flex gap-4 items-start">
            <div
              className="border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden"
              style={{ 
                width: signature.signatureWidth + 48,
                height: signature.signatureHeight + 24 
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {signature.signatureImage ? (
                <img
                  src={signature.signatureImage}
                  alt="Firma"
                  className="object-contain"
                  style={{
                    maxWidth: signature.signatureWidth,
                    maxHeight: signature.signatureHeight,
                  }}
                />
              ) : (
                <div className="text-center">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                  <span className="text-xs text-muted-foreground">Subir firma</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleSignatureUpload(file);
              }}
            />
            {signature.signatureImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleChange('signatureImage', '')}
              >
                Eliminar
              </Button>
            )}
          </div>
          
          {/* Tamaño de la firma */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Ancho: {signature.signatureWidth}px</Label>
              <Slider
                value={[signature.signatureWidth]}
                onValueChange={([value]) => handleChange('signatureWidth', value)}
                min={80}
                max={300}
                step={10}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Alto: {signature.signatureHeight}px</Label>
              <Slider
                value={[signature.signatureHeight]}
                onValueChange={([value]) => handleChange('signatureHeight', value)}
                min={30}
                max={150}
                step={5}
              />
            </div>
          </div>
        </div>

        {/* Información de Firma */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nombre del Firmante</Label>
            <Input
              value={signature.signatureName}
              onChange={(e) => handleChange('signatureName', e.target.value)}
              placeholder="Ej: Ronald Meza Lazo"
            />
          </div>
          <div className="space-y-2">
            <Label>Cargo / Posición</Label>
            <Input
              value={signature.signaturePosition}
              onChange={(e) => handleChange('signaturePosition', e.target.value)}
              placeholder="Ej: Supervisor de TI"
            />
          </div>
        </div>

        {/* Tipografía del pie de firma */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Estilo del Pie de Firma</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Fuente</Label>
              <Select
                value={signature.fontFamily}
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
                value={String(signature.fontSize)}
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
          </div>

          {/* Estilos de texto */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Estilos</Label>
            <div className="flex gap-2">
              <Toggle
                pressed={signature.fontWeight === 'bold'}
                onPressedChange={(pressed) => handleChange('fontWeight', pressed ? 'bold' : 'normal')}
                aria-label="Negrita"
              >
                <Bold className="h-4 w-4" />
              </Toggle>
              <Toggle
                pressed={signature.fontStyle === 'italic'}
                onPressedChange={(pressed) => handleChange('fontStyle', pressed ? 'italic' : 'normal')}
                aria-label="Cursiva"
              >
                <Italic className="h-4 w-4" />
              </Toggle>
              <Toggle
                pressed={signature.textDecoration === 'underline'}
                onPressedChange={(pressed) => handleChange('textDecoration', pressed ? 'underline' : 'none')}
                aria-label="Subrayado"
              >
                <Underline className="h-4 w-4" />
              </Toggle>
            </div>
          </div>
        </div>

        {/* Vista previa del estilo */}
        <div className="p-4 border rounded-lg bg-muted/30">
          <Label className="text-xs text-muted-foreground mb-2 block">Vista previa del pie de firma</Label>
          <p
            style={{
              fontFamily: signature.fontFamily,
              fontSize: signature.fontSize,
              fontWeight: signature.fontWeight,
              fontStyle: signature.fontStyle,
              textDecoration: signature.textDecoration,
              textAlign: signature.alignment,
            }}
          >
            {signature.signatureName} - {signature.signaturePosition}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
