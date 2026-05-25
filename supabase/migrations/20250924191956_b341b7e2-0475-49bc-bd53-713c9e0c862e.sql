-- Fix date offset issue: Increment all activity due dates by 1 day
-- This addresses the timezone/date handling bug that caused activities to be saved one day behind

-- Update ticket activities
UPDATE public.ticket_activities 
SET due_date = due_date + INTERVAL '1 day'
WHERE due_date IS NOT NULL;

-- Update ti_task activities  
UPDATE public.ti_task_activities 
SET due_date = due_date + INTERVAL '1 day'
WHERE due_date IS NOT NULL;

-- Log the changes for debugging
DO $$
DECLARE
    ticket_count INTEGER;
    ti_task_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO ticket_count FROM public.ticket_activities WHERE due_date IS NOT NULL;
    SELECT COUNT(*) INTO ti_task_count FROM public.ti_task_activities WHERE due_date IS NOT NULL;
    
    RAISE NOTICE 'Date correction completed: % ticket activities and % TI task activities updated', 
                 ticket_count, ti_task_count;
END
$$;