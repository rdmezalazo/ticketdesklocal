-- Update the generate_ti_task_code function to use the new format
-- TR + A/L + - + Area Code + - + Correlative
CREATE OR REPLACE FUNCTION public.generate_ti_task_code(area text DEFAULT 'Sistemas', sede text DEFAULT 'Arequipa')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    sede_code TEXT;
    area_code TEXT;
    correlativo INTEGER;
    new_code TEXT;
BEGIN
    -- Generate sede code: A for Arequipa, L for Lima
    sede_code := CASE UPPER(sede)
        WHEN 'LIMA' THEN 'L'
        WHEN 'AREQUIPA' THEN 'A'
        ELSE 'A'  -- Default to Arequipa
    END;
    
    -- Generate area code (first 3 letters, uppercase)
    area_code := UPPER(LEFT(COALESCE(area, 'SIS'), 3));
    
    -- Get next correlativo number for this sede-area combination
    SELECT COALESCE(MAX(
        CASE 
            WHEN code ~ ('TR' || sede_code || '-' || area_code || '-[0-9]+') 
            THEN CAST(SPLIT_PART(code, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO correlativo
    FROM public.ti_tasks
    WHERE code LIKE 'TR' || sede_code || '-' || area_code || '-%';
    
    -- Format the new code: TRA-SIS-0001 (4 digits for correlativo)
    new_code := 'TR' || sede_code || '-' || area_code || '-' || LPAD(correlativo::TEXT, 4, '0');
    
    RETURN new_code;
END;
$$;

-- Create ti_task_attachments table for file uploads
CREATE TABLE public.ti_task_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ti_task_id uuid NOT NULL,
  file_name text NOT NULL,
  file_type text,
  file_url text NOT NULL,
  file_size bigint,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ti_task_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for ti_task_attachments
CREATE POLICY "Users can view attachments of visible ti_tasks"
ON public.ti_task_attachments
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.ti_tasks t
  WHERE t.id = ti_task_attachments.ti_task_id
));

CREATE POLICY "TI users can manage all ti_task attachments"
ON public.ti_task_attachments
FOR ALL
TO authenticated
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE POLICY "Users can upload attachments to ti_tasks they can access"
ON public.ti_task_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by 
  AND EXISTS (
    SELECT 1 FROM public.ti_tasks t
    WHERE t.id = ti_task_attachments.ti_task_id
    AND (t.created_by = auth.uid() OR is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
  )
);

-- Add sede and area columns to ti_tasks for code generation
ALTER TABLE public.ti_tasks 
ADD COLUMN sede text DEFAULT 'Arequipa',
ADD COLUMN area text DEFAULT 'Sistemas';