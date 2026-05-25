-- Add progress field to ticket_activities table
ALTER TABLE public.ticket_activities 
ADD COLUMN progress integer NOT NULL DEFAULT 0;

-- Add constraint to ensure progress is between 0 and 100
ALTER TABLE public.ticket_activities 
ADD CONSTRAINT ticket_activities_progress_check CHECK (progress >= 0 AND progress <= 100);