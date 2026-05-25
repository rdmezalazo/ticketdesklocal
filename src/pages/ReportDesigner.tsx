import { useState } from "react";
import { FileText, Settings2, Monitor, Wrench, Calendar, Laptop, ClipboardList, PlusCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GenericReportDesigner } from "@/components/reports/GenericReportDesigner";
import { VisualDesignerGridStack } from "@/components/reports/VisualDesignerGridStack";
import { ImageToFormDesigner } from "@/components/reports/ImageToFormDesigner";
import { MaintenancePlanReport } from "@/components/reports/MaintenancePlanReport";
import { EquipmentAssignmentReportDesigner } from "@/components/reports/EquipmentAssignmentReportDesigner";
import { defaultMaintenanceTemplate, defaultEquipmentListTemplate, defaultServiceOrderTemplate, defaultMaintenanceRequestTemplate, defaultMaintenanceRequestFormTemplate } from "@/types/reportDesigner";

type ReportType = "maintenance" | "equipment-list" | "service-order" | "maintenance-plan" | "equipment-assignment" | "maintenance-request" | "maintenance-request-form" | "image-import" | null;

const reportTemplates = [
  {
    id: "image-import",
    title: "Importar desde Imagen",
    description: "Sube la imagen de un formulario y genera el formato automáticamente con IA",
    icon: PlusCircle,
    isNew: true,
  },
  {
    id: "maintenance-request-form",
    title: "Solicitud de Mantenimiento (HTML)",
    description: "Plantilla basada en el formato HTML para solicitar mantenimiento de equipos",
    icon: ClipboardList,
    isNew: true,
  },
  {
    id: "maintenance-request",
    title: "Solicitud de Mantenimiento",
    description: "Plantilla para solicitar mantenimiento de equipos y dispositivos",
    icon: ClipboardList,
  },
  {
    id: "maintenance",
    title: "Informe de Mantenimiento de Equipos y Otros",
    description: "Plantilla para documentar el mantenimiento preventivo y correctivo de equipos",
    icon: Settings2,
  },
  {
    id: "equipment-list",
    title: "Lista de Equipos de Cómputo y Otros",
    description: "Plantilla para el inventario y registro de equipos de cómputo, telefonía y otros dispositivos",
    icon: Monitor,
  },
  {
    id: "service-order",
    title: "Orden de Servicio de Mantenimiento de Equipos",
    description: "Plantilla para órdenes de servicio con tipo y modalidad de mantenimiento",
    icon: Wrench,
  },
  {
    id: "maintenance-plan",
    title: "Plan de Mantenimiento de Equipos de Cómputo y Otros",
    description: "Programa anual de mantenimiento con calendario mensual para equipos de TI",
    icon: Calendar,
  },
  {
    id: "equipment-assignment",
    title: "Asignación y Devolución de Equipos",
    description: "Plantilla para documentar la asignación y devolución de equipos a trabajadores",
    icon: Laptop,
  },
];

export default function ReportDesigner() {
  const [selectedReport, setSelectedReport] = useState<ReportType>(null);

  if (selectedReport === "image-import") {
    return (
      <ImageToFormDesigner
        onBack={() => setSelectedReport(null)}
      />
    );
  }

  if (selectedReport === "maintenance-request-form") {
    return (
      <GenericReportDesigner
        onBack={() => setSelectedReport(null)}
        defaultTemplate={defaultMaintenanceRequestFormTemplate}
        storageKey="maintenance_request_form_template"
      />
    );
  }

  if (selectedReport === "maintenance-request") {
    return (
      <VisualDesignerGridStack
        onBack={() => setSelectedReport(null)}
        defaultTemplate={defaultMaintenanceRequestTemplate}
        storageKey="maintenance_request_template"
      />
    );
  }

  if (selectedReport === "maintenance") {
    return (
      <GenericReportDesigner
        onBack={() => setSelectedReport(null)}
        defaultTemplate={defaultMaintenanceTemplate}
        storageKey="maintenance_report_template"
      />
    );
  }

  if (selectedReport === "equipment-list") {
    return (
      <GenericReportDesigner
        onBack={() => setSelectedReport(null)}
        defaultTemplate={defaultEquipmentListTemplate}
        storageKey="equipment_list_report_template"
      />
    );
  }

  if (selectedReport === "service-order") {
    return (
      <GenericReportDesigner
        onBack={() => setSelectedReport(null)}
        defaultTemplate={defaultServiceOrderTemplate}
        storageKey="service_order_report_template"
      />
    );
  }

  if (selectedReport === "maintenance-plan") {
    return (
      <MaintenancePlanReport onBack={() => setSelectedReport(null)} />
    );
  }

  if (selectedReport === "equipment-assignment") {
    return (
      <EquipmentAssignmentReportDesigner onBack={() => setSelectedReport(null)} />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Configuración de Formatos de TI
          </h1>
          <p className="text-muted-foreground mt-1">
            Selecciona una plantilla para crear y personalizar formatos
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportTemplates.map((template) => (
          <Card
            key={template.id}
            className={`hover:shadow-lg transition-shadow cursor-pointer group relative ${template.isNew ? 'border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-white' : ''
              }`}
            onClick={() => setSelectedReport(template.id as ReportType)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg group-hover:bg-primary/20 transition-colors ${template.isNew ? 'bg-blue-500' : 'bg-primary/10'
                    }`}>
                    <template.icon className={`h-6 w-6 ${template.isNew ? 'text-white' : 'text-primary'
                      }`} />
                  </div>
                  <CardTitle className="text-lg">{template.title}</CardTitle>
                </div>
                {template.isNew && (
                  <Badge className="bg-blue-500 hover:bg-blue-600">
                    Nuevo
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{template.description}</CardDescription>
              <div className="flex gap-2 mt-4">
                <Button
                  variant={template.isNew ? "default" : "secondary"}
                  size="sm"
                  className="flex-1"
                >
                  {template.isNew ? (
                    <>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Crear Formato
                    </>
                  ) : (
                    "Personalizar"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
