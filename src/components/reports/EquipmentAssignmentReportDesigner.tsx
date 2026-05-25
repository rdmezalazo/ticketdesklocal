import { useState, useEffect } from "react";
import { ArrowLeft, Save, RotateCcw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import logoImg from "@/assets/logo_horiz.jpg";

interface EquipmentAssignmentReportDesignerProps {
  onBack: () => void;
}

interface ColumnConfig {
  show: boolean;
  width: string;
}

export interface TemplateConfig {
  header: {
    showLogo: boolean;
    title: string;
    code: string;
    version: string;
  };
  generalInfo: {
    showWorkerName: boolean;
    showWorkerPosition: boolean;
    showWorkerDni: boolean;
    showAssignerName: boolean;
    showAssignerPosition: boolean;
  };
  assignmentColumns: {
    reason: ColumnConfig;
    code: ColumnConfig;
    equipmentName: ColumnConfig;
    condition: ColumnConfig;
    deliveryDate: ColumnConfig;
    receiverSignature: ColumnConfig;
    fingerprint: ColumnConfig;
  };
  returnColumns: {
    returnReason: ColumnConfig;
    returnDate: ColumnConfig;
    delivererSignature: ColumnConfig;
    returnFingerprint: ColumnConfig;
  };
  observationsColumn: ColumnConfig;
  legalText: string;
  minRows: number;
}

export const defaultConfig: TemplateConfig = {
  header: {
    showLogo: true,
    title: "ASIGNACIÓN Y DEVOLUCIÓN DE EQUIPOS",
    code: "L-TI-FOR-001",
    version: "1.3",
  },
  generalInfo: {
    showWorkerName: true,
    showWorkerPosition: true,
    showWorkerDni: true,
    showAssignerName: true,
    showAssignerPosition: true,
  },
  assignmentColumns: {
    reason: { show: true, width: "90px" },
    code: { show: true, width: "70px" },
    equipmentName: { show: true, width: "150px" },
    condition: { show: true, width: "60px" },
    deliveryDate: { show: true, width: "70px" },
    receiverSignature: { show: true, width: "60px" },
    fingerprint: { show: true, width: "50px" },
  },
  returnColumns: {
    returnReason: { show: true, width: "80px" },
    returnDate: { show: true, width: "70px" },
    delivererSignature: { show: true, width: "60px" },
    returnFingerprint: { show: true, width: "50px" },
  },
  observationsColumn: { show: true, width: "80px" },
  legalText: "Soy consciente que los bienes y equipos recibidos en el presente documento son de propiedad de LIVIGUI PERÚ S.A.C. y será de mi entera responsabilidad su cuidado. En caso de deterioro, robos o pérdidas que pudiera ocurrir por un mal cuidado de los bienes y equipos que me fueron entregados, acepto el descuento correspondiente de mis haberes u otros.",
  minRows: 10,
};

export const STORAGE_KEY = "equipment_assignment_report_template";

export function EquipmentAssignmentReportDesigner({ onBack }: EquipmentAssignmentReportDesignerProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<TemplateConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old format to new format if needed
      if (parsed.assignmentColumns?.showReason !== undefined) {
        return migrateOldConfig(parsed);
      }
      return { ...defaultConfig, ...parsed };
    }
    return defaultConfig;
  });
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [config]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    toast({ title: "Configuración guardada exitosamente" });
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    localStorage.removeItem(STORAGE_KEY);
    toast({ title: "Configuración restablecida a valores por defecto" });
  };

  const updateHeader = (field: keyof typeof config.header, value: any) => {
    setConfig(prev => ({ ...prev, header: { ...prev.header, [field]: value } }));
  };

  const updateGeneralInfo = (field: keyof typeof config.generalInfo, value: boolean) => {
    setConfig(prev => ({ ...prev, generalInfo: { ...prev.generalInfo, [field]: value } }));
  };

  const updateAssignmentColumn = (field: keyof typeof config.assignmentColumns, key: keyof ColumnConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      assignmentColumns: {
        ...prev.assignmentColumns,
        [field]: { ...prev.assignmentColumns[field], [key]: value }
      }
    }));
  };

  const updateReturnColumn = (field: keyof typeof config.returnColumns, key: keyof ColumnConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      returnColumns: {
        ...prev.returnColumns,
        [field]: { ...prev.returnColumns[field], [key]: value }
      }
    }));
  };

  const updateObservationsColumn = (key: keyof ColumnConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      observationsColumn: { ...prev.observationsColumn, [key]: value }
    }));
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
            <h1 className="text-2xl font-bold">Diseñador: Asignación y Devolución de Equipos</h1>
            <p className="text-muted-foreground">Personaliza el formato del documento</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restablecer
          </Button>
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Vista Previa
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>

      {/* Configuration Tabs */}
      <Tabs defaultValue="header" className="space-y-4">
        <TabsList>
          <TabsTrigger value="header">Encabezado</TabsTrigger>
          <TabsTrigger value="general">Información General</TabsTrigger>
          <TabsTrigger value="assignment">Columnas de Asignación</TabsTrigger>
          <TabsTrigger value="return">Columnas de Devolución</TabsTrigger>
          <TabsTrigger value="footer">Pie de Página</TabsTrigger>
        </TabsList>

        <TabsContent value="header">
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Encabezado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Mostrar Logo</Label>
                <Switch
                  checked={config.header.showLogo}
                  onCheckedChange={(v) => updateHeader("showLogo", v)}
                />
              </div>
              <div className="space-y-2">
                <Label>Título del Documento</Label>
                <Input
                  value={config.header.title}
                  onChange={(e) => updateHeader("title", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    value={config.header.code}
                    onChange={(e) => updateHeader("code", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Versión</Label>
                  <Input
                    value={config.header.version}
                    onChange={(e) => updateHeader("version", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Campos de Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "showWorkerName" as const, label: "Nombre del Trabajador" },
                { key: "showWorkerPosition" as const, label: "Puesto del Trabajador" },
                { key: "showWorkerDni" as const, label: "DNI/CE N°" },
                { key: "showAssignerName" as const, label: "Nombre del que Asigna" },
                { key: "showAssignerPosition" as const, label: "Puesto del que Asigna" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <Switch
                    checked={config.generalInfo[key]}
                    onCheckedChange={(v) => updateGeneralInfo(key, v)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignment">
          <Card>
            <CardHeader>
              <CardTitle>Columnas de Asignación de Equipos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "reason" as const, label: "Motivo de Asignación" },
                { key: "code" as const, label: "Código" },
                { key: "equipmentName" as const, label: "Nombre del Equipo" },
                { key: "condition" as const, label: "Estado (Nuevo/Usado)" },
                { key: "deliveryDate" as const, label: "Fecha de Entrega" },
                { key: "receiverSignature" as const, label: "Firma del que Recibe" },
                { key: "fingerprint" as const, label: "Huella" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <Switch
                      checked={config.assignmentColumns[key].show}
                      onCheckedChange={(v) => updateAssignmentColumn(key, "show", v)}
                    />
                    <Label className="flex-1">{label}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-muted-foreground text-sm">Ancho:</Label>
                    <Input
                      className="w-20"
                      value={config.assignmentColumns[key].width}
                      onChange={(e) => updateAssignmentColumn(key, "width", e.target.value)}
                      placeholder="ej: 80px"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="return">
          <Card>
            <CardHeader>
              <CardTitle>Columnas de Devolución de Equipos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "returnReason" as const, label: "Motivo de Devolución" },
                { key: "returnDate" as const, label: "Fecha de Devolución" },
                { key: "delivererSignature" as const, label: "Firma del que Entrega" },
                { key: "returnFingerprint" as const, label: "Huella (Devolución)" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <Switch
                      checked={config.returnColumns[key].show}
                      onCheckedChange={(v) => updateReturnColumn(key, "show", v)}
                    />
                    <Label className="flex-1">{label}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-muted-foreground text-sm">Ancho:</Label>
                    <Input
                      className="w-20"
                      value={config.returnColumns[key].width}
                      onChange={(e) => updateReturnColumn(key, "width", e.target.value)}
                      placeholder="ej: 80px"
                    />
                  </div>
                </div>
              ))}
              
              {/* Observaciones column */}
              <div className="pt-4 border-t">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <Switch
                      checked={config.observationsColumn.show}
                      onCheckedChange={(v) => updateObservationsColumn("show", v)}
                    />
                    <Label className="flex-1">Observaciones</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-muted-foreground text-sm">Ancho:</Label>
                    <Input
                      className="w-20"
                      value={config.observationsColumn.width}
                      onChange={(e) => updateObservationsColumn("width", e.target.value)}
                      placeholder="ej: 80px"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer">
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Pie de Página</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Texto Legal</Label>
                <Textarea
                  value={config.legalText}
                  onChange={(e) => setConfig(prev => ({ ...prev, legalText: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Número mínimo de filas en tabla</Label>
                <Input
                  type="number"
                  min={5}
                  max={20}
                  value={config.minRows}
                  onChange={(e) => setConfig(prev => ({ ...prev, minRows: parseInt(e.target.value) || 10 }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa del Formato</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto">
            <PreviewDocument config={config} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Migrate old config format to new format
function migrateOldConfig(oldConfig: any): TemplateConfig {
  return {
    ...defaultConfig,
    header: oldConfig.header || defaultConfig.header,
    generalInfo: oldConfig.generalInfo || defaultConfig.generalInfo,
    assignmentColumns: {
      reason: { show: oldConfig.assignmentColumns?.showReason ?? true, width: "90px" },
      code: { show: oldConfig.assignmentColumns?.showCode ?? true, width: "70px" },
      equipmentName: { show: oldConfig.assignmentColumns?.showEquipmentName ?? true, width: "150px" },
      condition: { show: oldConfig.assignmentColumns?.showCondition ?? true, width: "60px" },
      deliveryDate: { show: oldConfig.assignmentColumns?.showDeliveryDate ?? true, width: "70px" },
      receiverSignature: { show: oldConfig.assignmentColumns?.showReceiverSignature ?? true, width: "60px" },
      fingerprint: { show: oldConfig.assignmentColumns?.showFingerprint ?? true, width: "50px" },
    },
    returnColumns: {
      returnReason: { show: oldConfig.returnColumns?.showReturnReason ?? true, width: "80px" },
      returnDate: { show: oldConfig.returnColumns?.showReturnDate ?? true, width: "70px" },
      delivererSignature: { show: oldConfig.returnColumns?.showDelivererSignature ?? true, width: "60px" },
      returnFingerprint: { show: oldConfig.returnColumns?.showReturnFingerprint ?? true, width: "50px" },
    },
    observationsColumn: { show: oldConfig.showObservations ?? true, width: "80px" },
    legalText: oldConfig.legalText || defaultConfig.legalText,
    minRows: oldConfig.minRows || defaultConfig.minRows,
  };
}

function PreviewDocument({ config }: { config: TemplateConfig }) {
  const rows = Array.from({ length: config.minRows }, (_, i) => i);

  // Count visible columns for colspan calculations
  const assignmentColCount = Object.values(config.assignmentColumns).filter(c => c.show).length;
  const returnColCount = Object.values(config.returnColumns).filter(c => c.show).length;

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "20px",
        minWidth: "1100px",
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        color: "#000",
      }}
    >
      {/* Header */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
        <tbody>
          <tr>
            {config.header.showLogo && (
              <td style={{ width: "120px", border: "1px solid #000", padding: "5px", verticalAlign: "middle" }}>
                <img src={logoImg} alt="Logo" style={{ width: "100px", height: "auto" }} />
              </td>
            )}
            <td style={{ border: "1px solid #000", padding: "10px", textAlign: "center", fontWeight: "bold", fontSize: "16px" }}>
              {config.header.title}
            </td>
            <td style={{ width: "150px", border: "1px solid #000", padding: "5px", fontSize: "10px" }}>
              <div>Código : {config.header.code}</div>
              <div>Versión: {config.header.version}</div>
              <div>Fecha : DD/MM/YYYY</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 1. INFORMACIÓN GENERAL */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
        <tbody>
          <tr>
            <td colSpan={4} style={{ border: "1px solid #000", padding: "5px", fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
              1. INFORMACIÓN GENERAL
            </td>
          </tr>
          {config.generalInfo.showWorkerName && (
            <tr>
              <td style={{ border: "1px solid #000", padding: "5px", fontWeight: "bold", width: "200px" }}>
                Nombre y Apellido del Trabajador:
              </td>
              <td colSpan={3} style={{ border: "1px solid #000", padding: "5px" }}>
                [Nombre del Trabajador]
              </td>
            </tr>
          )}
          <tr>
            {config.generalInfo.showWorkerPosition && (
              <>
                <td style={{ border: "1px solid #000", padding: "5px", fontWeight: "bold" }}>
                  Puesto del Trabajador:
                </td>
                <td style={{ border: "1px solid #000", padding: "5px" }}>
                  [Puesto]
                </td>
              </>
            )}
            {config.generalInfo.showWorkerDni && (
              <>
                <td style={{ border: "1px solid #000", padding: "5px", fontWeight: "bold", width: "100px" }}>
                  DNI/CE N°:
                </td>
                <td style={{ border: "1px solid #000", padding: "5px" }}>
                  [DNI]
                </td>
              </>
            )}
          </tr>
          <tr>
            {config.generalInfo.showAssignerName && (
              <>
                <td style={{ border: "1px solid #000", padding: "5px", fontWeight: "bold" }}>
                  Nombre del que Asigna:
                </td>
                <td style={{ border: "1px solid #000", padding: "5px" }}>
                  Ronald Meza
                </td>
              </>
            )}
            {config.generalInfo.showAssignerPosition && (
              <>
                <td style={{ border: "1px solid #000", padding: "5px", fontWeight: "bold" }}>
                  Puesto de trabajo:
                </td>
                <td style={{ border: "1px solid #000", padding: "5px" }}>
                  Responsable de TI
                </td>
              </>
            )}
          </tr>
        </tbody>
      </table>

      {/* 2. ASIGNACIÓN Y DEVOLUCIÓN DE EQUIPOS */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
        <tbody>
          <tr>
            <td colSpan={assignmentColCount + returnColCount + (config.observationsColumn.show ? 1 : 0)} style={{ border: "1px solid #000", padding: "5px", fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
              2. ASIGNACIÓN Y DEVOLUCIÓN DE EQUIPOS
            </td>
          </tr>
          <tr>
            <td colSpan={assignmentColCount} style={{ border: "1px solid #000", padding: "5px", fontWeight: "bold", textAlign: "center", backgroundColor: "#e8e8e8" }}>
              ASIGNACIÓN DE EQUIPOS
            </td>
            <td colSpan={returnColCount + (config.observationsColumn.show ? 1 : 0)} style={{ border: "1px solid #000", padding: "5px", fontWeight: "bold", textAlign: "center", backgroundColor: "#e8e8e8" }}>
              DEVOLUCIÓN DE EQUIPOS
            </td>
          </tr>
          <tr style={{ fontSize: "10px", fontWeight: "bold", textAlign: "center" }}>
            {config.assignmentColumns.reason.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.assignmentColumns.reason.width }}>Motivo de Asignación</td>}
            {config.assignmentColumns.code.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.assignmentColumns.code.width }}>Código</td>}
            {config.assignmentColumns.equipmentName.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.assignmentColumns.equipmentName.width }}>Nombre del equipo</td>}
            {config.assignmentColumns.condition.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.assignmentColumns.condition.width }}>Estado</td>}
            {config.assignmentColumns.deliveryDate.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.assignmentColumns.deliveryDate.width }}>Fecha Entrega</td>}
            {config.assignmentColumns.receiverSignature.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.assignmentColumns.receiverSignature.width }}>Firma recibe</td>}
            {config.assignmentColumns.fingerprint.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.assignmentColumns.fingerprint.width }}>Huella</td>}
            {config.returnColumns.returnReason.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.returnColumns.returnReason.width }}>Motivo Devolución</td>}
            {config.returnColumns.returnDate.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.returnColumns.returnDate.width }}>Fecha Devolución</td>}
            {config.returnColumns.delivererSignature.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.returnColumns.delivererSignature.width }}>Firma entrega</td>}
            {config.returnColumns.returnFingerprint.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.returnColumns.returnFingerprint.width }}>Huella</td>}
            {config.observationsColumn.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.observationsColumn.width }}>Observaciones</td>}
          </tr>
          {rows.map((i) => (
            <tr key={i} style={{ height: "30px" }}>
              {config.assignmentColumns.reason.show && <td style={{ border: "1px solid #000", padding: "4px" }}></td>}
              {config.assignmentColumns.code.show && <td style={{ border: "1px solid #000", padding: "4px" }}></td>}
              {config.assignmentColumns.equipmentName.show && <td style={{ border: "1px solid #000", padding: "4px" }}></td>}
              {config.assignmentColumns.condition.show && <td style={{ border: "1px solid #000", padding: "4px" }}></td>}
              {config.assignmentColumns.deliveryDate.show && <td style={{ border: "1px solid #000", padding: "4px" }}></td>}
              {config.assignmentColumns.receiverSignature.show && <td style={{ border: "1px solid #000", padding: "4px" }}></td>}
              {config.assignmentColumns.fingerprint.show && <td style={{ border: "1px solid #000", padding: "4px" }}></td>}
              {config.returnColumns.returnReason.show && <td style={{ border: "1px solid #000", padding: "4px" }}></td>}
              {config.returnColumns.returnDate.show && <td style={{ border: "1px solid #000", padding: "4px" }}></td>}
              {config.returnColumns.delivererSignature.show && <td style={{ border: "1px solid #000", padding: "4px" }}></td>}
              {config.returnColumns.returnFingerprint.show && <td style={{ border: "1px solid #000", padding: "4px" }}></td>}
              {config.observationsColumn.show && <td style={{ border: "1px solid #000", padding: "4px" }}></td>}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer - Legal Text */}
      <div style={{ marginTop: "15px", padding: "10px", border: "1px solid #000", fontSize: "10px" }}>
        <p style={{ fontWeight: "bold", marginBottom: "5px" }}>Por lo tanto:</p>
        <p style={{ textAlign: "justify", lineHeight: "1.4" }}>{config.legalText}</p>
      </div>
    </div>
  );
}
