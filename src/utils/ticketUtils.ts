// Utility functions for ticket management
import { TicketStatus } from '@/types/ticket';

// Get the effective display status considering conformidad
export const getEffectiveTicketStatus = (status: TicketStatus, conformidadStatus?: boolean): TicketStatus => {
  // If conformidad is true, always show as closed regardless of database status
  if (conformidadStatus) {
    return 'closed';
  }
  return status;
};

// Area codes mapping
const AREA_CODES: Record<string, string> = {
  'Contabilidad': 'CON',
  'Recursos Humanos': 'REC', 
  'Tecnología': 'TEC',
  'Ventas': 'VEN',
  'Marketing': 'MKT',
  'Administración': 'ADM',
  'Gerencia': 'GER',
  'Finanzas': 'FIN',
  'Operaciones': 'OPE',
  'Logística': 'LOG',
  'Soporte': 'SOP',
  'General': 'GEN'
};

// Get area code from area name (fallback to first 3 letters)
export const getAreaCode = (area: string): string => {
  return AREA_CODES[area] || area.substring(0, 3).toUpperCase();
};

// Generate ticket code in format: TLA-CON-001
export const generateTicketCode = (sede: string, area: string, correlativo: number): string => {
  const sedeCode = sede === 'Lima' ? 'L' : 'A'; // Lima = L, Arequipa = A
  const areaCode = getAreaCode(area);
  const correlativoStr = correlativo.toString().padStart(3, '0');
  
  return `TL${sedeCode}-${areaCode}-${correlativoStr}`;
};

// Extract area codes for validation
export const getAvailableAreaCodes = (): Record<string, string> => {
  return AREA_CODES;
};