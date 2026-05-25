import { ReportTemplateConfig, TextAlignment, ReportField } from "@/types/reportDesigner";
import React, { useMemo } from "react";

interface TemplatePreviewProps {
  template: ReportTemplateConfig;
}

const getTextAlign = (alignment: TextAlignment): React.CSSProperties['textAlign'] => {
  return alignment;
};

const getFlexJustify = (alignment: TextAlignment): string => {
  switch (alignment) {
    case 'left': return 'flex-start';
    case 'center': return 'center';
    case 'right': return 'flex-end';
    default: return 'center';
  }
};

export function TemplatePreview({ template }: TemplatePreviewProps) {
  // Force re-render when template changes by using useMemo with template as dependency
  const sections = useMemo(() => template.sections, [template]);
  const { header, photoPanel, signature } = template;

  // Agrupar fotos según columnas
  const photosPerRow = photoPanel.columns;
  const photoRows: typeof photoPanel.photos[] = [];
  for (let i = 0; i < photoPanel.photos.length; i += photosPerRow) {
    photoRows.push(photoPanel.photos.slice(i, i + photosPerRow));
  }

  // Handle image loading errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Error loading image:', e);
    e.currentTarget.style.display = 'none';
  };

  return (
    <div className="bg-white text-black p-8 min-h-full" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: getFlexJustify(header.alignment) }}>
        <table className="border-collapse border border-black mb-4" style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td
                rowSpan={3}
                className="border border-black p-2 align-middle"
                style={{
                  width: `${100 - header.titleWidth - 15}%`,
                  textAlign: header.alignment,
                }}
              >
                {header.logoUrl && (
                  <img
                    src={header.logoUrl}
                    alt="Logo"
                    style={{
                      width: header.logoWidth,
                      height: header.logoHeight,
                      objectFit: 'contain',
                      display: header.alignment === 'center' ? 'block' : 'inline-block',
                      margin: header.alignment === 'center' ? '0 auto' : undefined,
                    }}
                    onError={handleImageError}
                  />
                )}
              </td>
              <td
                rowSpan={3}
                className="border border-black p-2 align-middle"
                style={{
                  fontFamily: header.titleFontFamily,
                  fontSize: header.titleFontSize,
                  fontWeight: header.titleFontWeight,
                  width: `${header.titleWidth}%`,
                  textAlign: getTextAlign(header.alignment),
                }}
              >
                {header.title.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < header.title.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </td>
              <td
                className="border border-black p-1"
                style={{
                  fontFamily: header.metaFontFamily,
                  fontSize: header.metaFontSize,
                }}
              >
                <span className="font-semibold">Código:</span> {header.code}
              </td>
            </tr>
            <tr>
              <td
                className="border border-black p-1"
                style={{
                  fontFamily: header.metaFontFamily,
                  fontSize: header.metaFontSize,
                }}
              >
                <span className="font-semibold">Versión:</span> {header.version}
              </td>
            </tr>
            <tr>
              <td
                className="border border-black p-1"
                style={{
                  fontFamily: header.metaFontFamily,
                  fontSize: header.metaFontSize,
                }}
              >
                <span className="font-semibold">Fecha:</span> {header.versionDate}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Secciones */}
      {sections
        .filter((s) => s.visible)
        .sort((a, b) => a.order - b.order)
        .map((section) => (
          <div key={section.id} className="mb-4">
            <h2
              className="mb-2"
              style={{
                fontFamily: section.titleFontFamily,
                fontSize: section.titleFontSize,
                fontWeight: section.titleFontWeight,
                color: section.titleColor,
                textAlign: getTextAlign(section.alignment),
              }}
            >
              {section.name}
            </h2>

            {/* Contenedor con alineación */}
            <div style={{ display: 'flex', justifyContent: getFlexJustify(section.alignment) }}>
              <table
                className="border-collapse border border-black"
                style={{ width: `${section.tableWidth}%` }}
              >
                <tbody>
                  {section.layout === 'table' ? (
                    // Layout tabla: etiquetas como encabezados, múltiples filas de datos
                    <>
                      <tr>
                        {section.fields
                          .sort((a, b) => a.order - b.order)
                          .map((field) => (
                            <th
                              key={field.id}
                              className="border border-black p-2"
                              style={{
                                fontFamily: field.fontFamily,
                                fontSize: field.fontSize,
                                fontWeight: 'bold',
                                backgroundColor: field.bgColor,
                                color: field.textColor,
                              }}
                            >
                              {field.label}
                            </th>
                          ))}
                      </tr>
                      {Array.from({ length: section.tableRows || 5 }).map((_, rowIndex) => (
                        <tr key={`data-row-${rowIndex}`}>
                          {section.fields
                            .sort((a, b) => a.order - b.order)
                            .map((field) => (
                              <td
                                key={`${field.id}-${rowIndex}`}
                                className="border border-black p-2"
                                style={{
                                  fontFamily: field.fontFamily,
                                  fontSize: field.fontSize,
                                  fontWeight: field.fontWeight,
                                  fontStyle: field.fontStyle,
                                  color: field.textColor,
                                  minHeight: '24px',
                                }}
                              >
                                &nbsp;
                              </td>
                            ))}
                        </tr>
                      ))}
                    </>
                  ) : section.layout === 'vertical' ? (
                    // Layout vertical: etiqueta en una fila, valor en la siguiente
                    section.fields
                      .sort((a, b) => a.order - b.order)
                      .map((field) => (
                        <React.Fragment key={field.id}>
                          <tr>
                            <td
                              className="border border-black p-2"
                              style={{
                                fontFamily: field.fontFamily,
                                fontSize: field.fontSize,
                                fontWeight: 'bold',
                                backgroundColor: field.bgColor,
                                color: field.textColor,
                              }}
                            >
                              {field.label}
                            </td>
                          </tr>
                          <tr>
                            <td
                              className="border border-black p-2 min-h-[40px]"
                              style={{
                                fontFamily: field.fontFamily,
                                fontSize: field.fontSize,
                                fontWeight: field.fontWeight,
                                fontStyle: field.fontStyle,
                                color: field.textColor,
                              }}
                            >
                              <span className="text-gray-400 italic">
                                {field.placeholder || '(contenido)'}
                              </span>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))
                  ) : (section.gridConfig && section.gridConfig.cells && section.gridConfig.cells.length > 0) ? (
                    // Layout de grid visual: usa la configuración de grid
                    (() => {
                      const gridConfig = section.gridConfig;
                      const rows = gridConfig?.rows || 2;
                      const cols = gridConfig?.cols || 2;

                      return (
                        <table className="w-full border-collapse">
                          <tbody>
                            {Array.from({ length: rows }, (_, rowIdx) => (
                              <tr key={`grid-row-${rowIdx}`}>
                                {Array.from({ length: cols }, (_, colIdx) => {
                                  const cell = gridConfig?.cells.find(c => c.row === rowIdx + 1 && c.col === colIdx + 1);
                                  const field = section.fields.find(f => f.id === cell?.fieldId);

                                  if (field) {
                                    const fieldLabelWidth = field.labelWidth ?? section.labelWidth;
                                    const fieldValueWidth = field.valueWidth ?? section.valueWidth;

                                    return (
                                      <React.Fragment key={field.id}>
                                        <td
                                          className="border border-black p-2"
                                          style={{
                                            fontFamily: field.fontFamily,
                                            fontSize: field.fontSize,
                                            fontWeight: 'bold',
                                            backgroundColor: field.bgColor,
                                            color: field.textColor,
                                            width: `${fieldLabelWidth}%`,
                                          }}
                                        >
                                          {field.label}
                                        </td>
                                        <td
                                          className="border border-black p-2"
                                          style={{
                                            fontFamily: field.fontFamily,
                                            fontSize: field.fontSize,
                                            fontWeight: field.fontWeight,
                                            fontStyle: field.fontStyle,
                                            color: field.textColor,
                                            width: `${fieldValueWidth}%`,
                                          }}
                                        >
                                          <span className="text-gray-400 italic">
                                            {field.placeholder || '(valor)'}
                                          </span>
                                        </td>
                                      </React.Fragment>
                                    );
                                  }

                                  return <td key={`empty-${rowIdx}-${colIdx}`} className="border border-black p-2" />;
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()
                  ) : (
                    // Otros layouts (checkboxGroup, etc)
                    section.fields
                      .sort((a, b) => a.order - b.order)
                      .map((field) => {
                        const fieldLabelWidth = field.labelWidth ?? section.labelWidth;
                        const fieldValueWidth = field.valueWidth ?? section.valueWidth;

                        return (
                          <tr key={field.id}>
                            <td
                              className="border border-black p-2"
                              style={{
                                fontFamily: field.fontFamily,
                                fontSize: field.fontSize,
                                fontWeight: 'bold',
                                backgroundColor: field.bgColor,
                                color: field.textColor,
                                width: `${fieldLabelWidth}%`,
                              }}
                            >
                              {field.label}
                            </td>
                            <td
                              className="border border-black p-2"
                              style={{
                                fontFamily: field.fontFamily,
                                fontSize: field.fontSize,
                                fontWeight: field.fontWeight,
                                fontStyle: field.fontStyle,
                                color: field.textColor,
                                width: `${fieldValueWidth}%`,
                              }}
                            >
                              <span className="text-gray-400 italic">
                                {field.placeholder || '(valor)'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      {/* Panel Fotográfico */}
      {photoPanel.visible && (
        <div className="mb-4">
          <h2
            className="font-bold text-sm mb-2"
            style={{ textAlign: getTextAlign(photoPanel.alignment) }}
          >
            {photoPanel.title}
          </h2>
          <div style={{ display: 'flex', justifyContent: getFlexJustify(photoPanel.alignment) }}>
            <table className="w-full border-collapse border border-black text-sm">
              <thead>
                <tr>
                  <th
                    colSpan={photoPanel.columns}
                    className="border border-black p-2 bg-gray-50 font-semibold"
                    style={{ textAlign: getTextAlign(photoPanel.alignment) }}
                  >
                    Fotografías
                  </th>
                </tr>
              </thead>
              <tbody>
                {photoRows.map((row, rowIndex) => (
                  <React.Fragment key={`row-${rowIndex}`}>
                    {/* Headers */}
                    <tr>
                      {row.map((photo) => (
                        <td
                          key={`header-${photo.id}`}
                          className="border border-black p-2 text-center font-semibold bg-gray-50"
                          style={{ width: `${100 / photoPanel.columns}%` }}
                        >
                          {photo.label}
                        </td>
                      ))}
                      {row.length < photosPerRow &&
                        Array(photosPerRow - row.length)
                          .fill(null)
                          .map((_, i) => (
                            <td
                              key={`empty-header-${i}`}
                              className="border border-black p-2 text-center font-semibold bg-gray-50"
                            />
                          ))}
                    </tr>
                    {/* Images */}
                    <tr>
                      {row.map((photo) => (
                        <td
                          key={`img-${photo.id}`}
                          className="border border-black p-2 text-center align-middle bg-gray-100"
                          style={{ height: photoPanel.photoHeight }}
                        >
                          <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                            [Espacio para foto]
                          </div>
                        </td>
                      ))}
                      {row.length < photosPerRow &&
                        Array(photosPerRow - row.length)
                          .fill(null)
                          .map((_, i) => (
                            <td
                              key={`empty-img-${i}`}
                              className="border border-black p-2 text-center align-middle"
                              style={{ height: photoPanel.photoHeight }}
                            />
                          ))}
                    </tr>
                    {/* Descriptions */}
                    <tr>
                      {row.map((photo) => (
                        <td
                          key={`desc-${photo.id}`}
                          className="border border-black p-2 text-center text-sm"
                        >
                          {photo.description}
                        </td>
                      ))}
                      {row.length < photosPerRow &&
                        Array(photosPerRow - row.length)
                          .fill(null)
                          .map((_, i) => (
                            <td
                              key={`empty-desc-${i}`}
                              className="border border-black p-2 text-center text-sm"
                            />
                          ))}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Firma */}
      <div
        className="mt-16 flex flex-col"
        style={{ alignItems: getFlexJustify(signature.alignment) as any }}
      >
        <div
          className="border-b-2 border-black flex items-end justify-center pb-1"
          style={{
            width: signature.signatureWidth + 48,
            height: signature.signatureImage ? 'auto' : '64px',
          }}
        >
          {signature.signatureImage && (
            <img
              src={signature.signatureImage}
              alt="Firma"
              className="object-contain"
              style={{
                maxWidth: signature.signatureWidth,
                maxHeight: signature.signatureHeight,
              }}
            />
          )}
        </div>
        <p
          className="mt-2"
          style={{
            fontFamily: signature.fontFamily,
            fontSize: signature.fontSize,
            fontWeight: signature.fontWeight,
            fontStyle: signature.fontStyle,
            textDecoration: signature.textDecoration,
            textAlign: getTextAlign(signature.alignment),
            width: signature.signatureWidth + 48,
          }}
        >
          {signature.signatureName}
          <br />
          {signature.signaturePosition}
        </p>
      </div>
    </div>
  );
}
