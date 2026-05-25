-- Add continuity field to return reasons
ALTER TABLE public.equipment_return_reasons 
ADD COLUMN has_continuity boolean NOT NULL DEFAULT true;

-- Update specific reasons to not have continuity
UPDATE public.equipment_return_reasons 
SET has_continuity = false 
WHERE name IN ('Equipo por averías o baja', 'Término del vínculo laboral');