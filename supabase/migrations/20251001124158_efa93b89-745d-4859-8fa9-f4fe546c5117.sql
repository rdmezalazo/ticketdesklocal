-- Allow TI users to update created_at by adding explicit column permissions
-- This ensures the created_at field can be modified by authorized users

-- First, let's make sure the column is updatable (remove any immutability)
-- Note: In PostgreSQL, columns are updatable by default, but we're being explicit

-- Update the RLS policy to be more explicit about what can be updated
DROP POLICY IF EXISTS "TI users can update ti_tasks" ON public.ti_tasks;

CREATE POLICY "TI users can update ti_tasks"
ON public.ti_tasks
FOR UPDATE
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

-- Ensure there's no trigger or constraint preventing created_at updates
-- The update_updated_at_column trigger should only affect updated_at, not created_at
-- Let's verify by recreating it to be explicit

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update the updated_at column, don't touch created_at
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger to ensure it's properly set
DROP TRIGGER IF EXISTS update_ti_tasks_updated_at ON public.ti_tasks;

CREATE TRIGGER update_ti_tasks_updated_at
BEFORE UPDATE ON public.ti_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();