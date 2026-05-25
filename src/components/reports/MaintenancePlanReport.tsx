import { useState, useRef, forwardRef } from "react";
import { ArrowLeft, Eye, Printer, Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import logoHoriz from "@/assets/logo_horiz.jpg";

interface MaintenancePlanConfig {
  code: string;
  version: string;
  date: string;
  elaboradoPor: string;
  puestoTrabajo: string;
  fechaActualizacion: string;
  year: number;
}

const defaultConfig: MaintenancePlanConfig = {
  code: "L-TI-PRG-001",
  version: "1.2",
  date: new Date().toLocaleDateString('es-PE'),
  elaboradoPor: "",
  puestoTrabajo: "",
  fechaActualizacion: new Date().toLocaleDateString('es-PE'),
  year: new Date().getFullYear(),
};

interface MaintenancePlanReportProps {
  onBack: () => void;
}

// Preview Component
const MaintenancePlanPreview = forwardRef<HTMLDivElement, { config: MaintenancePlanConfig }>(
  ({ config }, ref) => {
    return (
      <div ref={ref} className="bg-white p-4 min-w-[800px]">
        {/* Header */}
        <div className="border-2 border-black mb-0">
          <div className="flex">
            <div className="w-36 border-r-2 border-black p-2 flex items-center justify-center">
              <img src={logoHoriz} alt="Logo" className="h-14 object-contain" />
            </div>
            <div className="flex-1 flex items-center justify-center border-r-2 border-black">
              <h1 className="text-lg font-bold text-center px-4 text-black">
                PROGRAMA ANUAL DE MANTENIMIENTO DE EQUIPOS DE CÓMPUTO Y OTROS
              </h1>
            </div>
            <div className="w-44 text-xs text-black">
              <div className="border-b border-black p-1">
                <span className="font-semibold">Código:</span> {config.code}
              </div>
              <div className="border-b border-black p-1">
                <span className="font-semibold">Versión:</span> {config.version}
              </div>
              <div className="p-1">
                <span className="font-semibold">Fecha:</span> {config.date}
              </div>
            </div>
          </div>
        </div>

        {/* Elaborado por section */}
        <div className="border-x-2 border-b-2 border-black">
          <div className="flex text-sm text-black">
            <div className="flex items-center border-r-2 border-black px-3 py-2">
              <span className="font-semibold">Elaborado por:</span>
              <span className="ml-2">{config.elaboradoPor || "—"}</span>
            </div>
            <div className="flex items-center border-r-2 border-black px-3 py-2">
              <span className="font-semibold italic">Puesto de trabajo</span>
              <span className="ml-2">{config.puestoTrabajo || "—"}</span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center px-3 py-2">
              <span className="font-semibold">Fecha Actualización:</span>
              <span className="ml-2">{config.fechaActualizacion}</span>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <p className="font-semibold mb-2">📋 Nota:</p>
          <p>
            Para gestionar los equipos del plan de mantenimiento (programados y ejecutados), 
            utilice la sección <strong>"Plan de Mantenimiento"</strong> del menú lateral.
          </p>
        </div>
      </div>
    );
  }
);

MaintenancePlanPreview.displayName = "MaintenancePlanPreview";

export function MaintenancePlanReport({ onBack }: MaintenancePlanReportProps) {
  const [config, setConfig] = useState<MaintenancePlanConfig>(() => {
    try {
      const saved = localStorage.getItem("maintenance_plan_report_config");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading config:', e);
    }
    return defaultConfig;
  });
  
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const saveConfig = (newConfig: MaintenancePlanConfig) => {
    setConfig(newConfig);
    localStorage.setItem("maintenance_plan_report_config", JSON.stringify(newConfig));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    try {
      toast.loading("Generando PDF...", { id: "pdf-generation" });
      
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 5;
      
      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`Plan_Mantenimiento_Caratula_${config.year}.pdf`);
      
      toast.success("PDF descargado correctamente", { id: "pdf-generation" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF", { id: "pdf-generation" });
    }
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    localStorage.removeItem("maintenance_plan_report_config");
    toast.info("Configuración restaurada");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Formato - Plan de Mantenimiento</h1>
            <p className="text-sm text-muted-foreground">
              Configura la cabecera y datos del elaborador del documento
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            Restaurar
          </Button>
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Vista Previa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto p-0">
              <div className="p-4">
                <div className="flex justify-end gap-2 mb-4">
                  <Button variant="outline" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                  <Button onClick={handleDownloadPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar PDF
                  </Button>
                </div>
                <MaintenancePlanPreview config={config} ref={printRef} />
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={() => {
            localStorage.setItem("maintenance_plan_report_config", JSON.stringify(config));
            toast.success("Configuración guardada");
          }}>
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>

      {/* Configuration Forms */}
      <div className="grid gap-6 md:grid-cols-2 print:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información del Documento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Código</Label>
                <Input
                  value={config.code}
                  onChange={(e) => saveConfig({ ...config, code: e.target.value })}
                />
              </div>
              <div>
                <Label>Versión</Label>
                <Input
                  value={config.version}
                  onChange={(e) => saveConfig({ ...config, version: e.target.value })}
                />
              </div>
              <div>
                <Label>Fecha</Label>
                <Input
                  value={config.date}
                  onChange={(e) => saveConfig({ ...config, date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Año del Plan</Label>
              <Input
                type="number"
                value={config.year}
                onChange={(e) => saveConfig({ ...config, year: parseInt(e.target.value) || new Date().getFullYear() })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Datos del Elaborador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Elaborado por</Label>
              <Input
                value={config.elaboradoPor}
                onChange={(e) => saveConfig({ ...config, elaboradoPor: e.target.value })}
                placeholder="Nombre del elaborador"
              />
            </div>
            <div>
              <Label>Puesto de trabajo</Label>
              <Input
                value={config.puestoTrabajo}
                onChange={(e) => saveConfig({ ...config, puestoTrabajo: e.target.value })}
                placeholder="Ej: Supervisor T.I."
              />
            </div>
            <div>
              <Label>Fecha de Actualización</Label>
              <Input
                value={config.fechaActualizacion}
                onChange={(e) => saveConfig({ ...config, fechaActualizacion: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Eye className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Gestión de Equipos del Plan</h3>
              <p className="text-sm text-muted-foreground">
                Para agregar equipos al plan de mantenimiento, programar actividades (P) y 
                marcar ejecuciones (E), utiliza la sección <strong>"Plan de Mantenimiento"</strong> 
                en el menú lateral del sistema.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Preview (hidden on screen) */}
      <div className="hidden print:block">
        <MaintenancePlanPreview config={config} ref={printRef} />
      </div>
    </div>
  );
}
