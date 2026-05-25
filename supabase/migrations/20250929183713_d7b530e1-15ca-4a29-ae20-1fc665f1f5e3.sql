-- Drop the existing trigger function
DROP FUNCTION IF EXISTS public.update_completion_datetime() CASCADE;

-- Create updated function to use local timezone for Peru (UTC-5)
CREATE OR REPLACE FUNCTION public.update_completion_datetime()
RETURNS TRIGGER AS $$
BEGIN
  -- If progress is being set to 100% and wasn't 100% before
  IF NEW.progress = 100 AND (OLD.progress IS NULL OR OLD.progress < 100) THEN
    NEW.completion_date = CURRENT_DATE;
    -- Use timezone 'America/Lima' for Peru local time
    NEW.completion_time = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::time;
  -- If progress is being reduced from 100%, clear completion date/time
  ELSIF NEW.progress < 100 AND OLD.progress = 100 THEN
    NEW.completion_date = NULL;
    NEW.completion_time = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recreate triggers for ti_task_activities
CREATE TRIGGER update_ti_task_activity_completion_datetime
BEFORE UPDATE ON public.ti_task_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_completion_datetime();

-- Recreate triggers for ticket_activities
CREATE TRIGGER update_ticket_activity_completion_datetime
BEFORE UPDATE ON public.ticket_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_completion_datetime();