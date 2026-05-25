-- Add start_date and start_time columns to ticket_activities table
ALTER TABLE public.ticket_activities
ADD COLUMN start_date date,
ADD COLUMN start_time time without time zone,
ADD COLUMN duration_days integer;

-- Add comment for the new columns
COMMENT ON COLUMN public.ticket_activities.start_date IS 'Fecha de inicio de la actividad';
COMMENT ON COLUMN public.ticket_activities.start_time IS 'Hora de inicio de la actividad';
COMMENT ON COLUMN public.ticket_activities.duration_days IS 'Duración de la actividad en días';