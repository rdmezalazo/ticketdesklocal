-- Add new fields to ti_task_activities table
ALTER TABLE public.ti_task_activities
ADD COLUMN start_date date,
ADD COLUMN start_time time without time zone,
ADD COLUMN duration_days integer GENERATED ALWAYS AS (
  CASE 
    WHEN start_date IS NOT NULL AND due_date IS NOT NULL 
    THEN (due_date - start_date)
    ELSE NULL
  END
) STORED;

-- Add comments for documentation
COMMENT ON COLUMN public.ti_task_activities.start_date IS 'Fecha de inicio de la actividad';
COMMENT ON COLUMN public.ti_task_activities.start_time IS 'Hora de inicio de la actividad';
COMMENT ON COLUMN public.ti_task_activities.duration_days IS 'Duración en días calculada (fecha planificada - fecha de inicio)';