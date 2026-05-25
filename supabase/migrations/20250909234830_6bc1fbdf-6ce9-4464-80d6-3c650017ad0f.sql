-- Add sede (location/branch) field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN sede text NOT NULL DEFAULT 'Arequipa';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.sede IS 'Sede del usuario: Arequipa o Lima';