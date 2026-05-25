-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_auto_update_ti_task_status ON public.ti_tasks;
DROP FUNCTION IF EXISTS public.auto_update_ti_task_status();

-- Create function to automatically update TI task status based on activities progress
CREATE OR REPLACE FUNCTION public.auto_update_ti_task_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If task has activities with progress > 0 but not completed, set to in_progress
  IF NEW.activities_progress_avg > 0 AND NEW.activities_progress_avg < 100 THEN
    NEW.status = 'in_progress'::ticket_status;
  
  -- If all activities are completed (100% progress), set to resolved
  ELSIF NEW.activities_progress_avg = 100 THEN
    NEW.status = 'resolved'::ticket_status;
  
  -- If no activities or all at 0%, keep current status (usually open)
  -- This allows manual status changes when there are no activities yet
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update status when activities_progress_avg changes
CREATE TRIGGER trigger_auto_update_ti_task_status
  BEFORE UPDATE OF activities_progress_avg ON public.ti_tasks
  FOR EACH ROW
  WHEN (OLD.activities_progress_avg IS DISTINCT FROM NEW.activities_progress_avg)
  EXECUTE FUNCTION public.auto_update_ti_task_status();

-- Update existing tasks with correct status based on their current progress
UPDATE public.ti_tasks
SET status = CASE 
  WHEN activities_progress_avg = 100 THEN 'resolved'::ticket_status
  WHEN activities_progress_avg > 0 AND activities_progress_avg < 100 THEN 'in_progress'::ticket_status
  ELSE status
END
WHERE activities_progress_avg IS NOT NULL AND activities_progress_avg > 0;