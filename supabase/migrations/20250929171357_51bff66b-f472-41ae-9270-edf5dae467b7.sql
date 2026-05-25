-- Add completion date and time fields to ti_task_activities
ALTER TABLE public.ti_task_activities 
ADD COLUMN completion_date date,
ADD COLUMN completion_time time without time zone;

-- Add completion date and time fields to ticket_activities  
ALTER TABLE public.ticket_activities
ADD COLUMN completion_date date,
ADD COLUMN completion_time time without time zone;

-- Create trigger to auto-set completion date/time when progress reaches 100%
CREATE OR REPLACE FUNCTION public.update_completion_datetime()
RETURNS TRIGGER AS $$
BEGIN
  -- If progress is being set to 100% and wasn't 100% before
  IF NEW.progress = 100 AND (OLD.progress IS NULL OR OLD.progress < 100) THEN
    NEW.completion_date = CURRENT_DATE;
    NEW.completion_time = CURRENT_TIME;
  -- If progress is being reduced from 100%, clear completion date/time
  ELSIF NEW.progress < 100 AND OLD.progress = 100 THEN
    NEW.completion_date = NULL;
    NEW.completion_time = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for both tables
CREATE TRIGGER update_ti_task_activities_completion
  BEFORE UPDATE ON public.ti_task_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_completion_datetime();

CREATE TRIGGER update_ticket_activities_completion
  BEFORE UPDATE ON public.ticket_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_completion_datetime();