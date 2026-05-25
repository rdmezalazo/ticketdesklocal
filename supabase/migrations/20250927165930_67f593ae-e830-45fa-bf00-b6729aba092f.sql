-- Agregar nuevos campos a automatic_report_configs para soportar rangos de fecha y frecuencia
ALTER TABLE public.automatic_report_configs 
ADD COLUMN frequency text NOT NULL DEFAULT 'daily',
ADD COLUMN period_type text NOT NULL DEFAULT 'daily',
ADD COLUMN start_date date NULL,
ADD COLUMN end_date date NULL,
ADD COLUMN send_time time without time zone NOT NULL DEFAULT '18:00:00';

-- Actualizar sent_reports_history para incluir información del período
ALTER TABLE public.sent_reports_history
ADD COLUMN frequency text NULL,
ADD COLUMN period_type text NULL,
ADD COLUMN report_start_date date NULL,
ADD COLUMN report_end_date date NULL;

-- Comentarios para claridad
COMMENT ON COLUMN public.automatic_report_configs.frequency IS 'Frecuencia de envío: daily, weekly, monthly';
COMMENT ON COLUMN public.automatic_report_configs.period_type IS 'Tipo de período del reporte: daily, weekly, monthly, date_range';
COMMENT ON COLUMN public.automatic_report_configs.start_date IS 'Fecha de inicio (solo para date_range)';
COMMENT ON COLUMN public.automatic_report_configs.end_date IS 'Fecha de fin (solo para date_range)';
COMMENT ON COLUMN public.automatic_report_configs.send_time IS 'Hora específica de envío del reporte';