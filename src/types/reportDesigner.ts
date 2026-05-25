// Types for the Report Designer

export type FieldType = 'text' | 'date' | 'number' | 'select' | 'textarea' | 'checkbox';
export type SectionLayout = 'horizontal' | 'vertical' | 'table' | 'horizontal-2col' | 'checkboxGroup';
// horizontal = label | value
// vertical = label arriba, value abajo
// table = etiquetas como encabezados de tabla
// horizontal-2col = dos columnas de etiqueta | valor en una misma fila
// checkboxGroup = grupo de checkboxes/opciones con etiquetas

export type TextAlignment = 'left' | 'center' | 'right';

export interface SelectOption {
  value: string;
  label: string;
}

export interface ReportField {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  selectOptions?: SelectOption[]; // Para campos tipo select con opciones editables
  options?: string[]; // For select type (legacy)
  maxLength?: number;
  required: boolean;
  order: number;
  column?: number; // Columna en la que se mostrará el campo (para layouts horizontales)
  columnWidth?: number; // Ancho del campo dentro de la columna (porcentaje)
  colspan?: number; // Número de columnas que ocupa el campo (para layouts horizontales) - legacy
  labelWidth?: number; // Ancho de la etiqueta (porcentaje respecto al colspan)
  valueWidth?: number; // Ancho del valor (porcentaje respecto al colspan)
  labelColspan?: number; // Columnas que ocupa la etiqueta
  valueColspan?: number; // Columnas que ocupa el valor
  isFirstInColumn?: boolean; // Si es true, inicia una nueva fila en esa columna
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textColor: string;
  bgColor: string;
}

export interface PhotoConfig {
  id: string;
  label: string;
  description: string;
  order: number;
}

export interface SignatureConfig {
  signatureImage: string;
  signatureWidth: number;
  signatureHeight: number;
  signatureName: string;
  signaturePosition: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  alignment: TextAlignment;
}

export interface HeaderConfig {
  logoUrl: string;
  logoWidth: number;
  logoHeight: number;
  title: string;
  titleWidth: number; // percentage
  titleFontSize: number;
  titleFontFamily: string;
  titleFontWeight: 'normal' | 'bold';
  code: string;
  version: string;
  versionDate: string;
  metaFontSize: number;
  metaFontFamily: string;
  alignment: TextAlignment;
}

export interface SectionConfig {
  id: string;
  name: string;
  order: number;
  visible: boolean;
  titleFontSize: number;
  titleFontFamily: string;
  titleFontWeight: 'normal' | 'bold';
  titleColor: string;
  alignment: TextAlignment;
  // Configuración de layout y columnas a nivel de sección
  layout: SectionLayout;
  columns: number; // número de columnas para la tabla
  labelWidth: number; // porcentaje para columnas de etiquetas
  valueWidth: number; // porcentaje para columnas de valores
  tableWidth: number; // porcentaje del ancho de la tabla respecto al contenedor
  tableRows: number; // número de filas para el layout de tabla de datos (solo para layout 'table')
  fields: ReportField[];
  // Configuración de grid visual
  gridConfig?: {
    rows: number;
    cols: number;
    cells: Array<{
      row: number;
      col: number;
      fieldId?: string;
    }>;
  };
}

export interface ReportTemplateConfig {
  id: string;
  name: string;
  header: HeaderConfig;
  sections: SectionConfig[];
  photoPanel: {
    visible: boolean;
    title: string;
    photos: PhotoConfig[];
    columns: number;
    photoHeight: number;
    alignment: TextAlignment;
  };
  signature: SignatureConfig;
}

export const defaultMaintenanceTemplate: ReportTemplateConfig = {
  id: 'maintenance',
  name: 'Informe de Mantenimiento de Equipos y Otros',
  header: {
    logoUrl: '/lovable-uploads/0ad48902-f38c-4c48-8a2b-8ab374774068.png',
    logoWidth: 80,
    logoHeight: 60,
    title: 'INFORME DE MANTENIMIENTO DE EQUIPOS\nY OTROS',
    titleWidth: 60,
    titleFontSize: 14,
    titleFontFamily: 'Arial',
    titleFontWeight: 'bold',
    code: 'L-TI-FOR-005',
    version: '1.0',
    versionDate: '20/04/2023',
    metaFontSize: 11,
    metaFontFamily: 'Arial',
    alignment: 'center',
  },
  sections: [
    {
      id: 'general',
      name: '1. Datos Generales',
      order: 0,
      visible: true,
      titleFontSize: 12,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'horizontal',
      columns: 2,
      labelWidth: 35,
      valueWidth: 65,
      tableWidth: 100,
      tableRows: 5,
      fields: [
        { id: 'fechaInforme', label: 'Fecha del Informe', type: 'date', required: true, order: 0, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#f9fafb' },
        { id: 'nombreUsuario', label: 'Nombre del Usuario', type: 'text', placeholder: 'Ej: Maciel Apaza', required: true, order: 1, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#f9fafb' },
        { id: 'areaUsuario', label: 'Área del Usuario', type: 'text', placeholder: 'Ej: SSOMA', required: true, order: 2, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#f9fafb' },
        { id: 'codigoEquipo', label: 'Código del Equipo', type: 'text', placeholder: 'Ej: LA-LAP-015', required: true, order: 3, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#f9fafb' },
        { id: 'nombreEquipo', label: 'Nombre del Equipo', type: 'text', placeholder: 'Ej: Laptop', required: true, order: 4, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#f9fafb' },
        { id: 'nroOrdenMantenimiento', label: 'Nro. Orden de Mantenimiento', type: 'text', placeholder: 'Ej: 035', required: false, order: 5, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#f9fafb' },
        { id: 'tipoMantenimiento', label: 'Tipo de Mantenimiento', type: 'select', options: ['Preventivo – Interno', 'Preventivo – Externo', 'Correctivo – Interno', 'Correctivo – Externo'], required: true, order: 6, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#f9fafb' },
      ],
    },
    {
      id: 'historial',
      name: '2. Historial del Servicio',
      order: 1,
      visible: true,
      titleFontSize: 12,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'vertical',
      columns: 1,
      labelWidth: 100,
      valueWidth: 100,
      tableWidth: 100,
      tableRows: 5,
      fields: [
        { id: 'tituloInforme', label: 'JJ. Título del Informe', type: 'textarea', placeholder: 'Ej: Mantenimiento Preventivo Programado...', required: true, order: 0, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#f9fafb' },
        { id: 'reporteFalla', label: 'KK. Reporte de la Falla', type: 'textarea', placeholder: 'Ej: Mantenimiento Preventivo Programado', required: false, order: 1, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#f9fafb' },
        { id: 'evaluacionAnalisis', label: 'LL. Evaluación y Análisis', type: 'textarea', placeholder: 'Ej: No Aplica', required: false, order: 2, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#f9fafb' },
        { id: 'causaRaiz', label: 'MM. Causa Raíz de la Falla', type: 'textarea', placeholder: 'Ej: No Aplica', required: false, order: 3, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#f9fafb' },
        { id: 'conclusionesRecomendaciones', label: 'NN. Conclusiones / Recomendaciones', type: 'textarea', placeholder: 'Ej: Renovar la pasta térmica periódicamente...', required: false, order: 4, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#f9fafb' },
      ],
    },
  ],
  photoPanel: {
    visible: true,
    title: '3. Panel Fotográfico (Fotos, descripción)',
    photos: [
      { id: '1', label: 'Foto 1', description: 'Descripción de la foto 1', order: 0 },
      { id: '2', label: 'Foto 2', description: 'Descripción de la foto 2', order: 1 },
      { id: '3', label: 'Foto 3', description: 'Descripción de la foto 3', order: 2 },
      { id: '4', label: 'Foto 4', description: 'Descripción de la foto 4', order: 3 },
      { id: '5', label: 'Foto 5', description: 'Descripción de la foto 5', order: 4 },
      { id: '6', label: 'Foto 6', description: 'Descripción de la foto 6', order: 5 },
    ],
    columns: 2,
    photoHeight: 180,
    alignment: 'center',
  },
  signature: {
    signatureImage: '',
    signatureWidth: 150,
    signatureHeight: 60,
    signatureName: 'Ronald Meza Lazo',
    signaturePosition: 'Supervisor de TI',
    fontSize: 12,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    fontStyle: 'normal',
    textDecoration: 'none',
    alignment: 'center',
  },
};

export const defaultEquipmentListTemplate: ReportTemplateConfig = {
  id: 'equipment-list',
  name: 'Lista de Equipos de Cómputo y Otros',
  header: {
    logoUrl: '/lovable-uploads/0ad48902-f38c-4c48-8a2b-8ab374774068.png',
    logoWidth: 80,
    logoHeight: 60,
    title: 'LISTA DE EQUIPOS DE CÓMPUTO Y OTROS',
    titleWidth: 60,
    titleFontSize: 14,
    titleFontFamily: 'Arial',
    titleFontWeight: 'bold',
    code: 'L-TI-FOR-002',
    version: '1.1',
    versionDate: '10/10/2024',
    metaFontSize: 11,
    metaFontFamily: 'Arial',
    alignment: 'center',
  },
  sections: [
    {
      id: 'fecha_actualizacion',
      name: 'Fecha de Actualización',
      order: 0,
      visible: true,
      titleFontSize: 11,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'horizontal',
      columns: 1,
      labelWidth: 25,
      valueWidth: 75,
      tableWidth: 30,
      tableRows: 5,
      fields: [
        { id: 'fechaActualizacion', label: 'Fecha de Actualización', type: 'date', required: true, order: 0, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
    {
      id: 'descripcion_equipo',
      name: 'Descripción del equipo',
      order: 1,
      visible: true,
      titleFontSize: 11,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#ffffff',
      alignment: 'center',
      layout: 'horizontal',
      columns: 5,
      labelWidth: 20,
      valueWidth: 80,
      tableWidth: 100,
      tableRows: 5,
      fields: [
        { id: 'codigo', label: 'Código', type: 'text', placeholder: 'LA-COM-003', required: true, order: 0, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Computadora de Escritorio', required: true, order: 1, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'marca', label: 'Marca', type: 'text', placeholder: 'PC Compatible', required: true, order: 2, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'modelo', label: 'Modelo', type: 'text', placeholder: 'H510MH I5 1040', required: false, order: 3, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'nroSerie', label: 'Nro. Serie', type: 'text', placeholder: 'No Aplica', required: false, order: 4, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
    {
      id: 'estado_equipo',
      name: 'Estado del equipo',
      order: 2,
      visible: true,
      titleFontSize: 11,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#ffffff',
      alignment: 'center',
      layout: 'horizontal',
      columns: 3,
      labelWidth: 33,
      valueWidth: 67,
      tableWidth: 100,
      tableRows: 5,
      fields: [
        { id: 'fechaAlta', label: 'Fecha de alta del equipo', type: 'date', required: true, order: 0, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'fechaBaja', label: 'Fecha de baja del equipo', type: 'date', required: false, order: 1, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'operativo', label: 'Operativo (Si/No)', type: 'select', options: ['Si', 'No'], required: true, order: 2, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
    {
      id: 'operador_red',
      name: 'Operador de Red',
      order: 3,
      visible: true,
      titleFontSize: 11,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#ffffff',
      alignment: 'center',
      layout: 'horizontal',
      columns: 2,
      labelWidth: 50,
      valueWidth: 50,
      tableWidth: 100,
      tableRows: 5,
      fields: [
        { id: 'redLinea', label: 'Red / Línea', type: 'text', placeholder: '977137574', required: false, order: 0, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'tarjetaSim', label: 'Tarjeta SIM', type: 'text', placeholder: '862345000000000', required: false, order: 1, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
    {
      id: 'observaciones',
      name: 'Observaciones',
      order: 4,
      visible: true,
      titleFontSize: 11,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#ffffff',
      alignment: 'center',
      layout: 'horizontal',
      columns: 1,
      labelWidth: 0,
      valueWidth: 100,
      tableWidth: 100,
      tableRows: 5,
      fields: [
        { id: 'observaciones', label: 'Observaciones', type: 'textarea', placeholder: 'Observaciones adicionales...', required: false, order: 0, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
  ],
  photoPanel: {
    visible: false,
    title: 'Panel Fotográfico',
    photos: [],
    columns: 2,
    photoHeight: 180,
    alignment: 'center',
  },
  signature: {
    signatureImage: '',
    signatureWidth: 150,
    signatureHeight: 60,
    signatureName: '',
    signaturePosition: '',
    fontSize: 12,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    alignment: 'center',
  },
};

export const defaultServiceOrderTemplate: ReportTemplateConfig = {
  id: 'service-order',
  name: 'Orden de Servicio de Mantenimiento de Equipos',
  header: {
    logoUrl: '/lovable-uploads/0ad48902-f38c-4c48-8a2b-8ab374774068.png',
    logoWidth: 80,
    logoHeight: 60,
    title: 'ORDEN DE SERVICIO DE MANTENIMIENTO DE EQUIPOS',
    titleWidth: 60,
    titleFontSize: 14,
    titleFontFamily: 'Arial',
    titleFontWeight: 'bold',
    code: 'L-TI-FOR-004',
    version: '1.0',
    versionDate: '20/04/2023',
    metaFontSize: 11,
    metaFontFamily: 'Arial',
    alignment: 'center',
  },
  sections: [
    {
      id: 'order_info',
      name: 'Información de la Orden',
      order: 0,
      visible: true,
      titleFontSize: 11,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'horizontal-2col',
      columns: 2,
      labelWidth: 30,
      valueWidth: 70,
      tableWidth: 100,
      tableRows: 5,
      fields: [
        { id: 'nroOrden', label: 'Nro. de Orden', type: 'text', placeholder: '036', required: true, order: 0, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#f9fafb' },
        { id: 'fecha', label: 'Fecha', type: 'date', required: true, order: 1, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'referencia', label: 'Referencia', type: 'text', placeholder: 'Programa de Mantenimiento', required: false, order: 2, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#f9fafb' },
        { id: 'solicitud', label: 'Solicitud de Mantenimiento', type: 'text', placeholder: '036', required: false, order: 3, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'usuario', label: 'Usuario', type: 'text', placeholder: 'Ysabo Begazo', required: true, order: 4, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#f9fafb' },
        { id: 'area', label: 'Área', type: 'text', placeholder: 'SSOMA', required: true, order: 5, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
    {
      id: 'equipment_data',
      name: 'Datos del Equipo',
      order: 1,
      visible: true,
      titleFontSize: 11,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'center',
      layout: 'table',
      columns: 5,
      labelWidth: 20,
      valueWidth: 80,
      tableWidth: 100,
      tableRows: 1,
      fields: [
        { id: 'nombreEquipo', label: 'Nombre del Equipo', type: 'text', placeholder: 'LA-LAP-012', required: true, order: 0, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'codigo', label: 'Código', type: 'text', placeholder: 'LA-LAP-012', required: true, order: 1, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'marca', label: 'Marca', type: 'text', placeholder: 'LENOVO', required: true, order: 2, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'modelo', label: 'Modelo', type: 'text', placeholder: 'V15G3', required: false, order: 3, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'nroSerie', label: 'N° de Serie', type: 'text', placeholder: 'PF4DKVFB', required: false, order: 4, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
    {
      id: 'maintenance_type',
      name: 'Tipo y Modalidad del Mantenimiento',
      order: 2,
      visible: true,
      titleFontSize: 11,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'center',
      layout: 'checkboxGroup',
      columns: 2,
      labelWidth: 50,
      valueWidth: 50,
      tableWidth: 100,
      tableRows: 1,
      fields: [
        { id: 'tipoMantenimiento', label: 'Tipo de Mantenimiento', type: 'select', selectOptions: [{ value: 'interno', label: 'Interno' }, { value: 'externo', label: 'Externo' }], required: true, order: 0, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'modalidadMantenimiento', label: 'Modalidad del Mantenimiento', type: 'select', selectOptions: [{ value: 'preventivo', label: 'Preventivo' }, { value: 'correctivo', label: 'Correctivo' }], required: true, order: 1, fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
    {
      id: 'fault_details',
      name: 'Detalle de Fallas Reportadas',
      order: 3,
      visible: true,
      titleFontSize: 11,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'vertical',
      columns: 1,
      labelWidth: 100,
      valueWidth: 100,
      tableWidth: 100,
      tableRows: 8,
      fields: [
        { id: 'detalleFallas', label: 'Detalle de Fallas Reportadas', type: 'textarea', placeholder: 'Mantenimiento Preventivo programado para la limpieza y aplicación de la Pasta Térmica', required: false, order: 0, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
  ],
  photoPanel: {
    visible: false,
    title: 'Panel Fotográfico',
    photos: [],
    columns: 2,
    photoHeight: 180,
    alignment: 'center',
  },
  signature: {
    signatureImage: '',
    signatureWidth: 150,
    signatureHeight: 60,
    signatureName: '',
    signaturePosition: 'Firma de Recepción',
    fontSize: 12,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'underline',
    alignment: 'right',
  },
};

export const fontFamilies = [
  'Arial',
  'Times New Roman',
  'Helvetica',
  'Georgia',
  'Verdana',
  'Courier New',
  'Trebuchet MS',
  'Tahoma',
];

export const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24];

export const defaultMaintenanceRequestTemplate: ReportTemplateConfig = {
  id: 'maintenance-request',
  name: 'Solicitud de Mantenimiento',
  header: {
    logoUrl: '/lovable-uploads/0ad48902-f38c-4c48-8a2b-8ab374774068.png',
    logoWidth: 80,
    logoHeight: 60,
    title: 'SOLICITUD DE MANTENIMIENTO',
    titleWidth: 60,
    titleFontSize: 14,
    titleFontFamily: 'Arial',
    titleFontWeight: 'bold',
    code: 'L-TI-FOR-006',
    version: '1.0',
    versionDate: '11/03/2026',
    metaFontSize: 11,
    metaFontFamily: 'Arial',
    alignment: 'center',
  },
  sections: [
    {
      id: 'header_info',
      name: 'Información de la Solicitud',
      order: 0,
      visible: true,
      titleFontSize: 11,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'horizontal',
      columns: 2,
      labelWidth: 20,
      valueWidth: 80,
      tableWidth: 100,
      tableRows: 5,
      fields: [
        { id: 'nro', label: 'Nro.', type: 'text', placeholder: '', required: true, order: 0, column: 1, columnWidth: 100, isFirstInColumn: true, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'sede', label: 'Sede', type: 'text', placeholder: '', required: true, order: 1, column: 2, columnWidth: 100, isFirstInColumn: true, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'fecha', label: 'Fecha', type: 'date', required: true, order: 2, column: 1, columnWidth: 100, isFirstInColumn: true, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
    {
      id: 'solicitante',
      name: 'Datos del Solicitante',
      order: 1,
      visible: true,
      titleFontSize: 11,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'horizontal',
      columns: 3,
      labelWidth: 20,
      valueWidth: 80,
      tableWidth: 100,
      tableRows: 5,
      fields: [
        { id: 'nombreSolicitante', label: 'Nombre', type: 'text', placeholder: '', required: true, order: 0, column: 1, columnWidth: 100, isFirstInColumn: true, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'areaSolicitante', label: 'Área', type: 'text', placeholder: '', required: true, order: 1, column: 2, columnWidth: 100, isFirstInColumn: true, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'cargoSolicitante', label: 'Cargo', type: 'text', placeholder: '', required: true, order: 2, column: 3, columnWidth: 100, isFirstInColumn: true, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
    {
      id: 'equipo',
      name: 'Equipo / Dispositivo',
      order: 2,
      visible: true,
      titleFontSize: 11,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'horizontal',
      columns: 2,
      labelWidth: 20,
      valueWidth: 80,
      tableWidth: 100,
      tableRows: 5,
      fields: [
        { id: 'tipoEquipo', label: 'Tipo', type: 'select', selectOptions: [{ value: 'laptop', label: 'Laptop' }, { value: 'desktop', label: 'Desktop' }, { value: 'impresora', label: 'Impresora' }, { value: 'servidor', label: 'Servidor' }, { value: 'tablet', label: 'Tablet' }, { value: 'celular', label: 'Celular' }, { value: 'otro', label: 'Otro' }], required: true, order: 0, column: 1, columnWidth: 100, isFirstInColumn: true, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'marcaEquipo', label: 'Marca', type: 'text', placeholder: '', required: true, order: 1, column: 1, columnWidth: 100, isFirstInColumn: false, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'modeloEquipo', label: 'Modelo', type: 'text', placeholder: '', required: true, order: 2, column: 2, columnWidth: 100, isFirstInColumn: true, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'serieEquipo', label: 'Serie', type: 'text', placeholder: '', required: true, order: 3, column: 2, columnWidth: 100, isFirstInColumn: false, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
    {
      id: 'servicio',
      name: 'Datos del Servicio Solicitado',
      order: 3,
      visible: true,
      titleFontSize: 11,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'vertical',
      columns: 1,
      labelWidth: 100,
      valueWidth: 100,
      tableWidth: 100,
      tableRows: 5,
      fields: [
        { id: 'tipoMantenimiento', label: 'Tipo de Mantenimiento', type: 'select', selectOptions: [{ value: 'preventivo', label: 'Preventivo' }, { value: 'correctivo', label: 'Correctivo' }], required: true, order: 0, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'descripcionProblema', label: 'Descripción del Problema', type: 'textarea', placeholder: '', required: true, order: 1, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
    {
      id: 'estado_equipo',
      name: 'Estado del Equipo',
      order: 4,
      visible: true,
      titleFontSize: 11,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'horizontal',
      columns: 4,
      labelWidth: 25,
      valueWidth: 75,
      tableWidth: 100,
      tableRows: 5,
      fields: [
        { id: 'estadoEnciende', label: 'Enciende', type: 'checkbox', required: false, order: 0, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'estadoNoEnciende', label: 'No Enciende', type: 'checkbox', required: false, order: 1, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'estadoRuido', label: 'Ruido Extraño', type: 'checkbox', required: false, order: 2, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'estadoLentitud', label: 'Lentitud', type: 'checkbox', required: false, order: 3, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'estadoSobrecalentamiento', label: 'Sobrecalentamiento', type: 'checkbox', required: false, order: 4, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'estadoPantalla', label: 'Pantalla Defectuosa', type: 'checkbox', required: false, order: 5, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'estadoBateria', label: 'Batería Defectuosa', type: 'checkbox', required: false, order: 6, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'estadoOtros', label: 'Otros', type: 'checkbox', required: false, order: 7, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
  ],
  photoPanel: {
    visible: false,
    title: 'Panel Fotográfico',
    photos: [],
    columns: 2,
    photoHeight: 180,
    alignment: 'center',
  },
  signature: {
    signatureImage: '',
    signatureWidth: 150,
    signatureHeight: 60,
    signatureName: '',
    signaturePosition: 'Autorizado por',
    fontSize: 12,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    alignment: 'center',
  },
};

export const defaultMaintenanceRequestFormTemplate: ReportTemplateConfig = {
  id: 'maintenance-request-form',
  name: 'Solicitud de Mantenimiento de Equipos (HTML)',
  header: {
    logoUrl: '/lovable-uploads/0ad48902-f38c-4c48-8a2b-8ab374774068.png',
    logoWidth: 80,
    logoHeight: 60,
    title: 'SOLICITUD DE MANTENIMIENTO DE EQUIPOS',
    titleWidth: 60,
    titleFontSize: 14,
    titleFontFamily: 'Arial',
    titleFontWeight: 'bold',
    code: 'L-TI-FOR-003',
    version: '1.0',
    versionDate: '20/04/2023',
    metaFontSize: 11,
    metaFontFamily: 'Arial',
    alignment: 'center',
  },
  sections: [
    {
      id: 'datos_generales',
      name: 'DATOS GENERALES',
      order: 0,
      visible: true,
      titleFontSize: 12,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'horizontal',
      columns: 2,
      labelWidth: 35,
      valueWidth: 65,
      tableWidth: 100,
      tableRows: 5,
      fields: [
        { id: 'numeroSolicitud', label: 'Número de Solicitud*', type: 'text', required: true, order: 0, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'fechaSolicitud', label: 'Fecha', type: 'date', required: true, order: 1, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'nombreSolicitante', label: 'Nombre Solicitante', type: 'text', required: true, order: 2, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'cargoSolicitante', label: 'Cargo del Solicitante', type: 'text', required: true, order: 3, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'areaSolicitante', label: 'Área', type: 'text', required: true, order: 4, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
    {
      id: 'identificacion_equipo',
      name: 'IDENTIFICACIÓN DEL EQUIPO',
      order: 1,
      visible: true,
      titleFontSize: 12,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'horizontal',
      columns: 2,
      labelWidth: 35,
      valueWidth: 65,
      tableWidth: 100,
      tableRows: 5,
      fields: [
        { id: 'equipoEscritorio', label: 'Computadora de Escritorio', type: 'checkbox', required: false, order: 0, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'codigoEquipo', label: 'Código', type: 'text', required: false, order: 1, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'equipoLaptop', label: 'Computadora Portátil (Laptop)', type: 'checkbox', required: false, order: 2, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'marcaEquipo', label: 'Marca', type: 'text', required: false, order: 3, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'equipoTelefonoMovil', label: 'Teléfono móvil', type: 'checkbox', required: false, order: 4, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'modeloEquipo', label: 'Modelo', type: 'text', required: false, order: 5, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'equipoTelefonoFijo', label: 'Teléfono fijo', type: 'checkbox', required: false, order: 6, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'equipoOtros', label: 'Otros', type: 'checkbox', required: false, order: 7, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'otrosEquipoText', label: 'Otros (especificar)', type: 'text', required: false, order: 8, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
    {
      id: 'descripcion_solicitud',
      name: 'DESCRIPCIÓN DE LA SOLICITUD',
      order: 2,
      visible: true,
      titleFontSize: 12,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'vertical',
      columns: 1,
      labelWidth: 100,
      valueWidth: 100,
      tableWidth: 100,
      tableRows: 3,
      fields: [
        { id: 'descripcionSolicitud', label: 'Descripción de la solicitud', type: 'textarea', required: true, order: 0, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
    {
      id: 'prioridad_mantenimiento',
      name: 'PRIORIDAD DE MANTENIMIENTO',
      order: 3,
      visible: true,
      titleFontSize: 12,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'horizontal',
      columns: 3,
      labelWidth: 33,
      valueWidth: 67,
      tableWidth: 100,
      tableRows: 3,
      fields: [
        { id: 'prioridadAlta', label: 'Alta', type: 'checkbox', required: false, order: 0, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'prioridadModerada', label: 'Moderada', type: 'checkbox', required: false, order: 1, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'prioridadBaja', label: 'Baja', type: 'checkbox', required: false, order: 2, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
    {
      id: 'firmas_solicitante_receptor',
      name: '',
      order: 4,
      visible: true,
      titleFontSize: 12,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'horizontal',
      columns: 2,
      labelWidth: 50,
      valueWidth: 50,
      tableWidth: 100,
      tableRows: 3,
      fields: [
        { id: 'nombreSolicitanteFirma', label: 'Nombre', type: 'text', required: false, order: 0, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'cargoSolicitanteFirma', label: 'Cargo', type: 'text', required: false, order: 1, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
    {
      id: 'conformidad_solicitante',
      name: 'CONFORMIDAD DEL SOLICITANTE',
      order: 5,
      visible: true,
      titleFontSize: 12,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'vertical',
      columns: 1,
      labelWidth: 100,
      valueWidth: 100,
      tableWidth: 100,
      tableRows: 3,
      fields: [
        { id: 'conformidadTexto', label: 'Conformidad del solicitante', type: 'textarea', required: false, order: 0, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
    {
      id: 'conformidad_servicio',
      name: '',
      order: 6,
      visible: true,
      titleFontSize: 12,
      titleFontFamily: 'Arial',
      titleFontWeight: 'bold',
      titleColor: '#000000',
      alignment: 'left',
      layout: 'horizontal',
      columns: 2,
      labelWidth: 50,
      valueWidth: 50,
      tableWidth: 100,
      tableRows: 3,
      fields: [
        { id: 'esConforme', label: 'Es conforme el servicio', type: 'text', required: false, order: 0, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'conformeSi', label: 'Si', type: 'checkbox', required: false, order: 1, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'conformeNo', label: 'No', type: 'checkbox', required: false, order: 2, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
        { id: 'fechaConformidad', label: 'Fecha de conformidad', type: 'date', required: false, order: 3, fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textColor: '#000000', bgColor: '#ffffff' },
      ],
    },
  ],
  photoPanel: {
    visible: false,
    title: 'Panel Fotográfico',
    photos: [],
    columns: 2,
    photoHeight: 180,
    alignment: 'center',
  },
  signature: {
    signatureImage: '',
    signatureWidth: 150,
    signatureHeight: 60,
    signatureName: '',
    signaturePosition: 'Firma del solicitante',
    fontSize: 12,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    alignment: 'center',
  },
};
