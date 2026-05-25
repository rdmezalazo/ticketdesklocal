import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { useAssignmentItems, EquipmentAssignment } from "@/hooks/useEquipmentAssignments";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import logoImg from "@/assets/logo_horiz.jpg";
import { TemplateConfig, defaultConfig, STORAGE_KEY } from "@/components/reports/EquipmentAssignmentReportDesigner";

interface EquipmentAssignmentReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: EquipmentAssignment;
}

export function EquipmentAssignmentReport({ open, onOpenChange, assignment }: EquipmentAssignmentReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const { items } = useAssignmentItems(assignment.id);
  const [config, setConfig] = useState<TemplateConfig>(defaultConfig);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Check if it's the new format
        if (parsed.assignmentColumns?.reason !== undefined) {
          setConfig({ ...defaultConfig, ...parsed });
        }
      } catch {
        // Use default config
      }
    }
  }, [open]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
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
    const imgY = 0;

    pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save(`Asignacion_Equipos_${assignment.worker_name.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  const handlePrint = () => {
    const printContent = reportRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asignación de Equipos - ${assignment.worker_name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 11px; }
            @media print {
              @page { size: landscape; margin: 10mm; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  // Fill empty rows to match the format
  const tableRows = [...items];
  while (tableRows.length < config.minRows) {
    tableRows.push(null as any);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Formato de Asignación y Devolución de Equipos</DialogTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-auto">
          <div
            ref={reportRef}
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
                    <div>Fecha : {formatDate(assignment.assignment_date)}</div>
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
                      {assignment.worker_name}
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
                        {assignment.worker_position || ""}
                      </td>
                    </>
                  )}
                  {config.generalInfo.showWorkerDni && (
                    <>
                      <td style={{ border: "1px solid #000", padding: "5px", fontWeight: "bold", width: "100px" }}>
                        DNI/CE N°:
                      </td>
                      <td style={{ border: "1px solid #000", padding: "5px" }}>
                        {assignment.worker_dni || ""}
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
                        {assignment.assigner_name}
                      </td>
                    </>
                  )}
                  {config.generalInfo.showAssignerPosition && (
                    <>
                      <td style={{ border: "1px solid #000", padding: "5px", fontWeight: "bold" }}>
                        Puesto de trabajo:
                      </td>
                      <td style={{ border: "1px solid #000", padding: "5px" }}>
                        {assignment.assigner_position || ""}
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
                  <td colSpan={12} style={{ border: "1px solid #000", padding: "5px", fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
                    2. ASIGNACIÓN Y DEVOLUCIÓN DE EQUIPOS
                  </td>
                </tr>
                <tr>
                  <td colSpan={7} style={{ border: "1px solid #000", padding: "5px", fontWeight: "bold", textAlign: "center", backgroundColor: "#e8e8e8" }}>
                    ASIGNACIÓN DE EQUIPOS
                  </td>
                  <td colSpan={5} style={{ border: "1px solid #000", padding: "5px", fontWeight: "bold", textAlign: "center", backgroundColor: "#e8e8e8" }}>
                    DEVOLUCIÓN DE EQUIPOS
                  </td>
                </tr>
                <tr style={{ fontSize: "10px", fontWeight: "bold", textAlign: "center" }}>
                  {/* Asignación columns */}
                  {config.assignmentColumns.reason.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.assignmentColumns.reason.width }}>Motivo de Asignación</td>}
                  {config.assignmentColumns.code.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.assignmentColumns.code.width }}>Código</td>}
                  {config.assignmentColumns.equipmentName.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.assignmentColumns.equipmentName.width }}>Nombre del equipo asignado</td>}
                  {config.assignmentColumns.condition.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.assignmentColumns.condition.width }}>Estado (Nuevo/Usado)</td>}
                  {config.assignmentColumns.deliveryDate.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.assignmentColumns.deliveryDate.width }}>Fecha de Entrega</td>}
                  {config.assignmentColumns.receiverSignature.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.assignmentColumns.receiverSignature.width }}>Firma del que recibe</td>}
                  {config.assignmentColumns.fingerprint.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.assignmentColumns.fingerprint.width }}>Huella</td>}
                  {/* Devolución columns - Huella antes de Observaciones */}
                  {config.returnColumns.returnReason.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.returnColumns.returnReason.width }}>Motivo de Devolución</td>}
                  {config.returnColumns.returnDate.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.returnColumns.returnDate.width }}>Fecha de Devolución</td>}
                  {config.returnColumns.delivererSignature.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.returnColumns.delivererSignature.width }}>Firma del que entrega</td>}
                  {config.returnColumns.returnFingerprint.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.returnColumns.returnFingerprint.width }}>Huella</td>}
                  {config.observationsColumn.show && <td style={{ border: "1px solid #000", padding: "4px", width: config.observationsColumn.width }}>Observaciones</td>}
                </tr>
                {tableRows.map((item, index) => (
                  <tr key={index} style={{ height: "35px" }}>
                    {config.assignmentColumns.reason.show && (
                      <td style={{ border: "1px solid #000", padding: "4px", fontSize: "10px" }}>
                        {item?.assignment_reason || ""}
                      </td>
                    )}
                    {config.assignmentColumns.code.show && (
                      <td style={{ border: "1px solid #000", padding: "4px", fontSize: "9px", fontFamily: "monospace" }}>
                        {item?.equipo_codigo || ""}
                      </td>
                    )}
                    {config.assignmentColumns.equipmentName.show && (
                      <td style={{ border: "1px solid #000", padding: "4px", fontSize: "10px" }}>
                        {item ? (
                          <div>
                            <div>{item.equipo_nombre}</div>
                            {(item.equipo_marca || item.equipo_modelo || item.equipo_serie) && (
                              <div style={{ fontSize: "8px", color: "#666" }}>
                                {[item.equipo_marca, item.equipo_modelo, item.equipo_serie].filter(Boolean).join(" • ")}
                              </div>
                            )}
                          </div>
                        ) : ""}
                      </td>
                    )}
                    {config.assignmentColumns.condition.show && (
                      <td style={{ border: "1px solid #000", padding: "4px", fontSize: "10px", textAlign: "center" }}>
                        {item?.equipment_condition || ""}
                      </td>
                    )}
                    {config.assignmentColumns.deliveryDate.show && (
                      <td style={{ border: "1px solid #000", padding: "4px", fontSize: "10px", textAlign: "center" }}>
                        {item?.delivery_date ? formatDate(item.delivery_date) : ""}
                      </td>
                    )}
                    {config.assignmentColumns.receiverSignature.show && (
                      <td style={{ border: "1px solid #000", padding: "4px" }}></td>
                    )}
                    {config.assignmentColumns.fingerprint.show && (
                      <td style={{ border: "1px solid #000", padding: "4px" }}></td>
                    )}
                    {/* Devolución columns - Huella antes de Observaciones */}
                    {config.returnColumns.returnReason.show && (
                      <td style={{ border: "1px solid #000", padding: "4px", fontSize: "10px" }}>
                        {item?.return_reason || ""}
                      </td>
                    )}
                    {config.returnColumns.returnDate.show && (
                      <td style={{ border: "1px solid #000", padding: "4px", fontSize: "10px", textAlign: "center" }}>
                        {item?.return_date ? formatDate(item.return_date) : ""}
                      </td>
                    )}
                    {config.returnColumns.delivererSignature.show && (
                      <td style={{ border: "1px solid #000", padding: "4px" }}></td>
                    )}
                    {config.returnColumns.returnFingerprint.show && (
                      <td style={{ border: "1px solid #000", padding: "4px" }}></td>
                    )}
                    {config.observationsColumn.show && (
                      <td style={{ border: "1px solid #000", padding: "4px" }}></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer - Legal Text */}
            <div style={{ marginTop: "15px", padding: "10px", border: "1px solid #000", fontSize: "10px" }}>
              <p style={{ fontWeight: "bold", marginBottom: "5px" }}>Por lo tanto:</p>
              <p style={{ textAlign: "justify", lineHeight: "1.4" }}>
                {config.legalText}
              </p>
            </div>

            {/* Observations */}
            {assignment.observations && (
              <div style={{ marginTop: "10px", padding: "10px", border: "1px solid #000" }}>
                <p style={{ fontWeight: "bold", marginBottom: "5px" }}>Observaciones adicionales:</p>
                <p>{assignment.observations}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
