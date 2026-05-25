-- Add end_time field to ticket_activities table for activities with current date
ALTER TABLE public.ticket_activities 
ADD COLUMN end_time time without time zone;

-- Add a comment to explain the purpose
COMMENT ON COLUMN public.ticket_activities.end_time IS 'End time for activities that have due_date as current date';