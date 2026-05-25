import { useRef } from "react";
import { FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Equipo } from "@/hooks/useInventario";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import logoHoriz from "@/assets/logo_horiz.jpg";

interface EquipoListReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipos: Equipo[];
  inventarioYear: number;
  inventarioFecha: string;
}

export function EquipoListReport({
  open,
  onOpenChange,
  equipos,
  inventarioYear,
  inventarioFecha,
}: EquipoListReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;

    try {
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
      const imgY = 5;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`Lista_Equipos_Computo_${inventarioYear}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !reportRef.current) return;

    const styles = `
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; }
        th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
        th { background-color: #f0f0f0; font-weight: bold; }
        .header-table { border: 1px solid #2e7d7d; margin-bottom: 20px; }
        .header-table td { border: none; vertical-align: middle; padding: 8px; }
        .header-logo { width: 120px; }
        .header-title { text-align: center; font-size: 16px; font-weight: bold; }
        .header-info { text-align: right; font-size: 10px; }
        .sede-header { background-color: #e8f5f5; font-weight: bold; padding: 8px; border: 1px solid #2e7d7d; }
        .operativo-si { color: #2e7d7d; font-weight: bold; }
        .operativo-no { color: red; font-weight: bold; }
        @media print {
          @page { size: landscape; margin: 10mm; }
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lista de Equipos de Cómputo ${inventarioYear}</title>
          ${styles}
        </head>
        <body>
          ${reportRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Group equipos by sede
  const equiposBySede = equipos.reduce((acc, equipo) => {
    if (!acc[equipo.sede]) {
      acc[equipo.sede] = [];
    }
    acc[equipo.sede].push(equipo);
    return acc;
  }, {} as Record<string, Equipo[]>);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Formato Lista de Equipos de Cómputo - {inventarioYear}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button size="sm" onClick={handleDownloadPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-white rounded-lg border">
          <div
            ref={reportRef}
            className="p-6 bg-white text-black min-w-[1200px]"
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            {/* Header Table - Exact structure from image */}
            <table className="w-full mb-6" style={{ borderCollapse: "collapse", border: "2px solid #2e7d7d" }}>
              <tbody>
                <tr>
                  <td style={{ width: "150px", padding: "12px", borderRight: "1px solid #2e7d7d", verticalAlign: "middle" }}>
                    <img 
                      src={logoHoriz} 
                      alt="Logo" 
                      style={{ width: "130px", height: "auto" }}
                    />
                  </td>
                  <td style={{ textAlign: "center", verticalAlign: "middle", padding: "12px" }}>
                    <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, color: "#333" }}>
                      LISTA DE EQUIPOS DE CÓMPUTO Y OTROS
                    </h1>
                  </td>
                  <td style={{ width: "180px", padding: "12px", borderLeft: "1px solid #2e7d7d", verticalAlign: "middle", textAlign: "left" }}>
                    <div style={{ fontSize: "11px", lineHeight: "1.6" }}>
                      <p style={{ margin: "2px 0" }}><strong>Código:</strong> L-TI-FOR-002</p>
                      <p style={{ margin: "2px 0" }}><strong>Versión:</strong> 1.1</p>
                      <p style={{ margin: "2px 0" }}><strong>Fecha:</strong> 10/10/2024</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Content by Sede */}
            {Object.entries(equiposBySede).map(([sede, sedeEquipos]) => (
              <div key={sede} className="mb-6">
                <div 
                  style={{ 
                    backgroundColor: "#e8f5f5", 
                    padding: "8px 12px", 
                    borderBottom: "2px solid #2e7d7d",
                    marginBottom: "0"
                  }}
                >
                  <span style={{ fontWeight: "bold", fontSize: "12px", color: "#2e7d7d" }}>
                    SEDE: {sede.toUpperCase()} ({sedeEquipos.length} equipos)
                  </span>
                </div>
                <table className="w-full" style={{ borderCollapse: "collapse", fontSize: "10px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8f9fa" }}>
                      <th style={{ border: "1px solid #ccc", padding: "6px", textAlign: "center", width: "30px" }}>N°</th>
                      <th style={{ border: "1px solid #ccc", padding: "6px", textAlign: "left" }}>Código</th>
                      <th style={{ border: "1px solid #ccc", padding: "6px", textAlign: "left" }}>Tipo</th>
                      <th style={{ border: "1px solid #ccc", padding: "6px", textAlign: "left" }}>Nombre del Equipo</th>
                      <th style={{ border: "1px solid #ccc", padding: "6px", textAlign: "left" }}>Marca</th>
                      <th style={{ border: "1px solid #ccc", padding: "6px", textAlign: "left" }}>Modelo</th>
                      <th style={{ border: "1px solid #ccc", padding: "6px", textAlign: "left" }}>Nro. Serie</th>
                      <th style={{ border: "1px solid #ccc", padding: "6px", textAlign: "center" }}>Fecha Alta</th>
                      <th style={{ border: "1px solid #ccc", padding: "6px", textAlign: "center" }}>Fecha Baja</th>
                      <th style={{ border: "1px solid #ccc", padding: "6px", textAlign: "center" }}>Operativo</th>
                      <th style={{ border: "1px solid #ccc", padding: "6px", textAlign: "left" }}>Red/Línea</th>
                      <th style={{ border: "1px solid #ccc", padding: "6px", textAlign: "left" }}>Tarjeta SIM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sedeEquipos.map((equipo, index) => (
                      <tr key={equipo.id} style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9f9f9" }}>
                        <td style={{ border: "1px solid #ccc", padding: "4px 6px", textAlign: "center" }}>{index + 1}</td>
                        <td style={{ border: "1px solid #ccc", padding: "4px 6px", fontFamily: "monospace", fontSize: "9px", color: "#2e7d7d" }}>
                          {equipo.codigo}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: "4px 6px" }}>{equipo.tipo || "-"}</td>
                        <td style={{ border: "1px solid #ccc", padding: "4px 6px" }}>{equipo.nombre}</td>
                        <td style={{ border: "1px solid #ccc", padding: "4px 6px" }}>{equipo.marca || "-"}</td>
                        <td style={{ border: "1px solid #ccc", padding: "4px 6px" }}>{equipo.modelo || "-"}</td>
                        <td style={{ border: "1px solid #ccc", padding: "4px 6px" }}>{equipo.nro_serie || "-"}</td>
                        <td style={{ border: "1px solid #ccc", padding: "4px 6px", textAlign: "center" }}>{formatDate(equipo.fecha_alta)}</td>
                        <td style={{ border: "1px solid #ccc", padding: "4px 6px", textAlign: "center" }}>{formatDate(equipo.fecha_baja)}</td>
                        <td style={{ 
                          border: "1px solid #ccc", 
                          padding: "4px 6px", 
                          textAlign: "center", 
                          fontWeight: "bold",
                          color: equipo.operativo ? "#2e7d7d" : "#dc2626"
                        }}>
                          {equipo.operativo ? "SI" : "NO"}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: "4px 6px" }}>{equipo.red_linea || "-"}</td>
                        <td style={{ border: "1px solid #ccc", padding: "4px 6px" }}>{equipo.tarjeta_sim || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Summary */}
            <div className="mt-6 pt-4" style={{ borderTop: "1px solid #ccc" }}>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ border: "1px solid #ccc", padding: "12px", flex: 1, textAlign: "center" }}>
                  <p style={{ fontWeight: "bold", fontSize: "11px", margin: "0 0 4px 0" }}>Total de Equipos</p>
                  <p style={{ fontSize: "20px", fontWeight: "bold", color: "#2563eb", margin: 0 }}>{equipos.length}</p>
                </div>
                <div style={{ border: "1px solid #ccc", padding: "12px", flex: 1, textAlign: "center" }}>
                  <p style={{ fontWeight: "bold", fontSize: "11px", margin: "0 0 4px 0" }}>Equipos Operativos</p>
                  <p style={{ fontSize: "20px", fontWeight: "bold", color: "#16a34a", margin: 0 }}>
                    {equipos.filter(e => e.operativo).length}
                  </p>
                </div>
                <div style={{ border: "1px solid #ccc", padding: "12px", flex: 1, textAlign: "center" }}>
                  <p style={{ fontWeight: "bold", fontSize: "11px", margin: "0 0 4px 0" }}>Equipos No Operativos</p>
                  <p style={{ fontSize: "20px", fontWeight: "bold", color: "#dc2626", margin: 0 }}>
                    {equipos.filter(e => !e.operativo).length}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4" style={{ borderTop: "1px solid #ccc" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "32px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ borderTop: "1px solid #666", paddingTop: "8px", marginTop: "40px" }}>
                    <p style={{ fontWeight: "bold", fontSize: "10px", margin: "0 0 2px 0" }}>Elaborado por</p>
                    <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Área de TI</p>
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ borderTop: "1px solid #666", paddingTop: "8px", marginTop: "40px" }}>
                    <p style={{ fontWeight: "bold", fontSize: "10px", margin: "0 0 2px 0" }}>Revisado por</p>
                    <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Jefatura de TI</p>
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ borderTop: "1px solid #666", paddingTop: "8px", marginTop: "40px" }}>
                    <p style={{ fontWeight: "bold", fontSize: "10px", margin: "0 0 2px 0" }}>Aprobado por</p>
                    <p style={{ fontSize: "9px", color: "#666", margin: 0 }}>Gerencia General</p>
                  </div>
                </div>
              </div>
              <p style={{ textAlign: "center", fontSize: "9px", color: "#999", marginTop: "16px" }}>
                Documento generado el {format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
