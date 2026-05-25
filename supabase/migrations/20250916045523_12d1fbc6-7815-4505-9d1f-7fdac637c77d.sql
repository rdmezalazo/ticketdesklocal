-- Drop the old function signatures and keep only the new one
DROP FUNCTION IF EXISTS public.generate_ti_task_code(text, text);
DROP FUNCTION IF EXISTS public.generate_ti_task_code(text);

-- Ensure we have the correct function
CREATE OR REPLACE FUNCTION public.generate_ti_task_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    correlativo INTEGER;
    new_code TEXT;
BEGIN
    -- Get next correlativo number for TI tasks
    SELECT COALESCE(MAX(
        CASE 
            WHEN code ~ 'TSK-[0-9]+' 
            THEN CAST(SPLIT_PART(code, '-', 2) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO correlativo
    FROM public.ti_tasks
    WHERE code LIKE 'TSK-%';
    
    -- Format the new code: TSK-XXXX (4 digits)
    new_code := 'TSK-' || LPAD(correlativo::TEXT, 4, '0');
    
    RETURN new_code;
END;
$function$