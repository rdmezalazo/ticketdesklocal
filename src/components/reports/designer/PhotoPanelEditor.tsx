import { useState } from "react";
import { GripVertical, Plus, Trash2, ChevronDown, ChevronUp, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PhotoConfig, ReportTemplateConfig, TextAlignment } from "@/types/reportDesigner";

interface PhotoPanelEditorProps {
  photoPanel: ReportTemplateConfig['photoPanel'];
  onUpdate: (photoPanel: ReportTemplateConfig['photoPanel']) => void;
}

export function PhotoPanelEditor({ photoPanel, onUpdate }: PhotoPanelEditorProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleChange = (key: keyof typeof photoPanel, value: any) => {
    onUpdate({ ...photoPanel, [key]: value });
  };

  const handlePhotoUpdate = (updatedPhoto: PhotoConfig) => {
    const updatedPhotos = photoPanel.photos.map((p) =>
      p.id === updatedPhoto.id ? updatedPhoto : p
    );
    handleChange('photos', updatedPhotos);
  };

  const handlePhotoDelete = (photoId: string) => {
    const updatedPhotos = photoPanel.photos.filter((p) => p.id !== photoId);
    updatedPhotos.forEach((p, i) => (p.order = i));
    handleChange('photos', updatedPhotos);
  };

  const handleAddPhoto = () => {
    const newPhoto: PhotoConfig = {
      id: `photo_${Date.now()}`,
      label: `Foto ${photoPanel.photos.length + 1}`,
      description: `Descripción de la foto ${photoPanel.photos.length + 1}`,
      order: photoPanel.photos.length,
    };
    handleChange('photos', [...photoPanel.photos, newPhoto]);
  };

  const movePhoto = (index: number, direction: 'up' | 'down') => {
    const newPhotos = [...photoPanel.photos];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newPhotos.length) return;
    
    [newPhotos[index], newPhotos[newIndex]] = [newPhotos[newIndex], newPhotos[index]];
    newPhotos.forEach((p, i) => (p.order = i));
    handleChange('photos', newPhotos);
  };

  return (
    <Card className={!photoPanel.visible ? 'opacity-60' : ''}>
      <CardHeader className="py-3">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                <CardTitle className="text-base flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                  Panel Fotográfico
                </CardTitle>
              </Button>
            </CollapsibleTrigger>

            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Visible</Label>
              <Switch
                checked={photoPanel.visible}
                onCheckedChange={(checked) => handleChange('visible', checked)}
              />
            </div>
          </div>

          <CollapsibleContent>
            <CardContent className="pt-4 px-0 space-y-6">
              {/* Configuración General */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título de la Sección</Label>
                  <Input
                    value={photoPanel.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                  />
                </div>

                {/* Alineación */}
                <div className="space-y-2">
                  <Label>Alineación del Panel</Label>
                  <ToggleGroup
                    type="single"
                    value={photoPanel.alignment}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Columnas</Label>
                    <Select
                      value={String(photoPanel.columns)}
                      onValueChange={(value) => handleChange('columns', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 columna</SelectItem>
                        <SelectItem value="2">2 columnas</SelectItem>
                        <SelectItem value="3">3 columnas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Alto de Fotos: {photoPanel.photoHeight}px</Label>
                    <Slider
                      value={[photoPanel.photoHeight]}
                      onValueChange={([value]) => handleChange('photoHeight', value)}
                      min={100}
                      max={400}
                      step={10}
                    />
                  </div>
                </div>
              </div>

              {/* Lista de Fotos */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Configuración de Fotos</Label>
                {photoPanel.photos
                  .sort((a, b) => a.order - b.order)
                  .map((photo, index) => (
                    <div
                      key={photo.id}
                      className="flex items-center gap-2 p-3 border rounded-lg bg-card"
                    >
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => movePhoto(index, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => movePhoto(index, 'down')}
                          disabled={index === photoPanel.photos.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>

                      <GripVertical className="h-5 w-5 text-muted-foreground" />

                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Etiqueta</Label>
                          <Input
                            value={photo.label}
                            onChange={(e) =>
                              handlePhotoUpdate({ ...photo, label: e.target.value })
                            }
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Pie de Foto</Label>
                          <Input
                            value={photo.description}
                            onChange={(e) =>
                              handlePhotoUpdate({ ...photo, description: e.target.value })
                            }
                            className="h-8"
                          />
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePhotoDelete(photo.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddPhoto}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Espacio de Foto
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
}
