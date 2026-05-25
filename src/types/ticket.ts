export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketCategory = 
  | 'Incidencia'
  | 'Soporte de Hardware'
  | 'Soporte de Software'
  | 'Soporte Remoto'
  | 'Mantenimiento Correctivo'
  | 'Suministros'
  | 'Circuito de Cámaras'
  | 'Análisis de Datos'
  | 'Desarrollo'
  | 'ERP'
  | 'Solicitud de Servicio'
  | 'Otros';

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  file_url: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface Ticket {
  id: string;
  code: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  requester: string;
  requesterEmail: string;
  requesterArea: string;
  requesterCargo?: string;
  requesterSede: string;
  assignee?: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  attachments?: TicketAttachment[];
  activitiesProgressAvg?: number;
  conformidadStatus?: boolean;
  conformidadDate?: Date;
  conformidadUserId?: string;
  createdBy?: string;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}