import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PhotoItem {
  id: string;
  file: File | null;
  url: string;
  description: string;
}

interface MaintenanceReportData {
  fechaInforme: Date | undefined;
  nombreUsuario: string;
  areaUsuario: string;
  codigoEquipo: string;
  nombreEquipo: string;
  nroOrdenMantenimiento: string;
  tipoMantenimiento: string;
  tituloInforme: string;
  reporteFalla: string;
  evaluacionAnalisis: string;
  causaRaiz: string;
  conclusionesRecomendaciones: string;
  fotos: PhotoItem[];
  nombreFirmante: string;
  cargoFirmante: string;
  codigoDocumento: string;
  version: string;
  fechaDocumento: string;
}

interface MaintenanceReportPreviewProps {
  data: MaintenanceReportData;
}

export function MaintenanceReportPreview({ data }: MaintenanceReportPreviewProps) {
  const fotosConContenido = data.fotos.filter(f => f.url);
  
  // Agrupar fotos en pares para la cuadrícula 2x2
  const fotosPairs: PhotoItem[][] = [];
  for (let i = 0; i < fotosConContenido.length; i += 2) {
    fotosPairs.push(fotosConContenido.slice(i, i + 2));
  }

  return (
    <div className="bg-white text-black p-8 min-h-full" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Encabezado */}
      <table className="w-full border-collapse border border-black mb-4">
        <tbody>
          <tr>
            <td rowSpan={3} className="border border-black p-2 w-24 text-center align-middle">
              <img 
                src="/lovable-uploads/0ad48902-f38c-4c48-8a2b-8ab374774068.png" 
                alt="Logo" 
                className="h-16 w-auto mx-auto"
              />
            </td>
            <td rowSpan={3} className="border border-black p-2 text-center align-middle font-bold text-lg">
              INFORME DE MANTENIMIENTO DE EQUIPOS<br />Y OTROS
            </td>
            <td className="border border-black p-1 text-sm">
              <span className="font-semibold">Código:</span> {data.codigoDocumento}
            </td>
          </tr>
          <tr>
            <td className="border border-black p-1 text-sm">
              <span className="font-semibold">Versión:</span> {data.version}
            </td>
          </tr>
          <tr>
            <td className="border border-black p-1 text-sm">
              <span className="font-semibold">Fecha:</span> {data.fechaDocumento}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 1. Datos Generales */}
      <div className="mb-4">
        <h2 className="font-bold text-sm mb-2">1. Datos Generales</h2>
        <table className="w-full border-collapse border border-black text-sm">
          <tbody>
            <tr>
              <td className="border border-black p-2 font-semibold bg-gray-50 w-48">Fecha del Informe</td>
              <td className="border border-black p-2">
                {data.fechaInforme ? format(data.fechaInforme, "dd/MM/yyyy", { locale: es }) : ""}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-semibold bg-gray-50">Nombre del Usuario</td>
              <td className="border border-black p-2">{data.nombreUsuario}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-semibold bg-gray-50">Área del Usuario</td>
              <td className="border border-black p-2">{data.areaUsuario}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-semibold bg-gray-50">Código del equipo</td>
              <td className="border border-black p-2">{data.codigoEquipo}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-semibold bg-gray-50">Nombre del equipo</td>
              <td className="border border-black p-2">{data.nombreEquipo}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-semibold bg-gray-50">Nro. Orden de Mantenimiento</td>
              <td className="border border-black p-2">{data.nroOrdenMantenimiento}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-semibold bg-gray-50">Tipo de Mantenimiento</td>
              <td className="border border-black p-2">{data.tipoMantenimiento}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. Historial del Servicio */}
      <div className="mb-4">
        <h2 className="font-bold text-sm mb-2">2. Historial del Servicio</h2>
        <table className="w-full border-collapse border border-black text-sm">
          <tbody>
            <tr>
              <td colSpan={2} className="border border-black p-2 font-semibold bg-gray-50">
                JJ. Título del Informe
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-black p-2 min-h-[40px]">
                {data.tituloInforme}
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-black p-2 font-semibold bg-gray-50">
                KK. Reporte de la Falla
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-black p-2 min-h-[40px]">
                {data.reporteFalla}
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-black p-2 font-semibold bg-gray-50">
                LL. Evaluación y Análisis
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-black p-2 min-h-[40px]">
                {data.evaluacionAnalisis}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-semibold bg-gray-50 w-48">
                MM. Causa Raíz de la Falla
              </td>
              <td className="border border-black p-2"></td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-black p-2 min-h-[40px]">
                {data.causaRaiz}
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-black p-2 font-semibold bg-gray-50">
                NN. Conclusiones / Recomendaciones
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="border border-black p-2 min-h-[40px]">
                {data.conclusionesRecomendaciones}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3. Panel Fotográfico */}
      <div className="mb-4">
        <h2 className="font-bold text-sm mb-2">3. Panel Fotográfico (Fotos, descripción)</h2>
        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr>
              <th colSpan={2} className="border border-black p-2 bg-gray-50 text-center font-semibold">
                Fotografías
              </th>
            </tr>
          </thead>
          <tbody>
            {fotosPairs.length === 0 ? (
              <tr>
                <td colSpan={2} className="border border-black p-8 text-center text-gray-400">
                  No hay fotografías agregadas
                </td>
              </tr>
            ) : (
              fotosPairs.map((pair, pairIndex) => (
                <>
                  {/* Encabezado de Foto */}
                  <tr key={`header-${pairIndex}`}>
                    {pair.map((foto, idx) => (
                      <td key={`header-${foto.id}`} className="border border-black p-2 text-center font-semibold bg-gray-50 w-1/2">
                        Foto {pairIndex * 2 + idx + 1}
                      </td>
                    ))}
                    {pair.length === 1 && (
                      <td className="border border-black p-2 text-center font-semibold bg-gray-50 w-1/2">
                        Foto {pairIndex * 2 + 2}
                      </td>
                    )}
                  </tr>
                  {/* Imagen */}
                  <tr key={`image-${pairIndex}`}>
                    {pair.map((foto) => (
                      <td key={`img-${foto.id}`} className="border border-black p-2 text-center align-middle h-48">
                        {foto.url ? (
                          <img 
                            src={foto.url} 
                            alt={`Foto ${foto.id}`}
                            className="max-h-44 w-auto mx-auto object-contain"
                          />
                        ) : null}
                      </td>
                    ))}
                    {pair.length === 1 && (
                      <td className="border border-black p-2 text-center align-middle h-48"></td>
                    )}
                  </tr>
                  {/* Descripción */}
                  <tr key={`desc-${pairIndex}`}>
                    {pair.map((foto) => (
                      <td key={`desc-${foto.id}`} className="border border-black p-2 text-center text-sm">
                        {foto.description || "(Descripción)"}
                      </td>
                    ))}
                    {pair.length === 1 && (
                      <td className="border border-black p-2 text-center text-sm">(Descripción)</td>
                    )}
                  </tr>
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Firma */}
      <div className="mt-16 flex flex-col items-center">
        <div className="border-b-2 border-black w-64 h-16 flex items-end justify-center pb-1">
          {/* Espacio para firma */}
        </div>
        <p className="text-center mt-2 font-semibold text-sm">
          {data.nombreFirmante} {data.cargoFirmante}
        </p>
      </div>
    </div>
  );
}
