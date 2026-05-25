-- Add activities progress average column to tickets table
ALTER TABLE public.tickets 
ADD COLUMN activities_progress_avg integer DEFAULT 0;

-- Create function to calculate and update ticket activities progress average
CREATE OR REPLACE FUNCTION public.update_ticket_activities_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the ticket's activities progress average
    UPDATE public.tickets 
    SET activities_progress_avg = (
        SELECT COALESCE(ROUND(AVG(progress)), 0)
        FROM public.ticket_activities 
        WHERE ticket_id = COALESCE(NEW.ticket_id, OLD.ticket_id)
    )
    WHERE id = COALESCE(NEW.ticket_id, OLD.ticket_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically update progress when activities change
CREATE TRIGGER update_ticket_progress_on_activity_change
    AFTER INSERT OR UPDATE OR DELETE ON public.ticket_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ticket_activities_progress();

-- Update existing tickets with current activity progress averages
UPDATE public.tickets 
SET activities_progress_avg = (
    SELECT COALESCE(ROUND(AVG(ta.progress)), 0)
    FROM public.ticket_activities ta
    WHERE ta.ticket_id = tickets.id
);