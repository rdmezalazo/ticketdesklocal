import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/hooks/useSettings";
import { Skeleton } from "@/components/ui/skeleton";

export function ChatSettings() {
  const { loading, getSettingValue, updateAppSetting } = useSettings();

  const allowFileAttachments = getSettingValue('chat_allow_file_attachments', true);
  const allowImagePaste = getSettingValue('chat_allow_image_paste', true);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Archivos Adjuntos</CardTitle>
          <CardDescription>
            Configura qué tipos de archivos pueden adjuntarse en el chat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-files">Permitir archivos adjuntos</Label>
              <p className="text-sm text-muted-foreground">
                Los usuarios pueden adjuntar archivos de cualquier tipo al chat
              </p>
            </div>
            <Switch
              id="allow-files"
              checked={allowFileAttachments}
              onCheckedChange={(checked) => 
                updateAppSetting('chat_allow_file_attachments', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-images">Permitir pegar imágenes</Label>
              <p className="text-sm text-muted-foreground">
                Los usuarios pueden copiar y pegar imágenes directamente en el chat
              </p>
            </div>
            <Switch
              id="allow-images"
              checked={allowImagePaste}
              onCheckedChange={(checked) => 
                updateAppSetting('chat_allow_image_paste', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuración Avanzada</CardTitle>
          <CardDescription>
            Configuraciones adicionales para el chat de soporte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>• Si "Permitir archivos adjuntos" está deshabilitado, solo se permitirá adjuntar imágenes.</p>
            <p>• Si "Permitir pegar imágenes" está deshabilitado, no se podrán pegar imágenes del portapapeles.</p>
            <p>• Ambas configuraciones se aplican a todos los usuarios del sistema.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}