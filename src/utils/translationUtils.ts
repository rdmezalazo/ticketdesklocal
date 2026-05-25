// Translation utilities for status and priority labels

export const translateStatus = (status: string): string => {
  const translations: Record<string, string> = {
    'open': 'Ingresado',
    'in_progress': 'En Proceso',
    'resolved': 'Resuelto',
    'closed': 'Cerrado',
  };
  
  return translations[status.toLowerCase()] || status;
};

export const translatePriority = (priority: string): string => {
  const translations: Record<string, string> = {
    'low': 'Baja',
    'medium': 'Media',
    'high': 'Alta',
    'critical': 'Crítica',
  };
  
  return translations[priority.toLowerCase()] || priority;
};
