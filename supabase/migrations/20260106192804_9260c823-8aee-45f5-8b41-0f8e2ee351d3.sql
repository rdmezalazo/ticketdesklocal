-- Add tipo column to equipos table (duplicate of nombre concept but for equipment type)
ALTER TABLE public.equipos 
ADD COLUMN tipo text;

-- Update existing records to copy nombre to tipo as initial value
UPDATE public.equipos SET tipo = nombre WHERE tipo IS NULL;

-- Make tipo required for new records
ALTER TABLE public.equipos 
ALTER COLUMN tipo SET NOT NULL,
ALTER COLUMN tipo SET DEFAULT 'Computadora'::text;