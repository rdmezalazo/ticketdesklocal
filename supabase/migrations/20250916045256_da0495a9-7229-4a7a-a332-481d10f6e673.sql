-- Delete all TI task data
DELETE FROM ti_task_attachments;
DELETE FROM ti_task_activities;
DELETE FROM ti_tasks;

-- Update the TI task code generation function to use TSK-0000 format
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

-- Verify table relationships and constraints
-- Check foreign key constraints
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('ti_tasks', 'ti_task_activities', 'ti_task_attachments');

-- Verify RLS policies are active
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('ti_tasks', 'ti_task_activities', 'ti_task_attachments')
AND schemaname = 'public';

-- Check RLS policies for TI tasks tables
SELECT 
    t.tablename,
    pol.policyname,
    pol.cmd,
    pol.permissive,
    pol.roles,
    pol.qual,
    pol.with_check
FROM pg_policies pol
JOIN pg_tables t ON pol.tablename = t.tablename
WHERE t.tablename IN ('ti_tasks', 'ti_task_activities', 'ti_task_attachments')
AND t.schemaname = 'public'
ORDER BY t.tablename, pol.policyname;