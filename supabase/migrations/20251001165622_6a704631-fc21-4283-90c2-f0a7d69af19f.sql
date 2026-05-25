-- Add reminder fields to ti_tasks table
ALTER TABLE public.ti_tasks
ADD COLUMN reminder_date date,
ADD COLUMN reminder_frequency jsonb DEFAULT '{"type": "none"}'::jsonb;

COMMENT ON COLUMN public.ti_tasks.reminder_date IS 'Fecha programada para enviar recordatorios';
COMMENT ON COLUMN public.ti_tasks.reminder_frequency IS 'Configuración de frecuencia de recordatorios: {"type": "one_day_before" | "same_day" | "three_times_daily" | "none"}';

-- Create a table to track sent reminders to avoid duplicates
CREATE TABLE IF NOT EXISTS public.ti_task_reminders_sent (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ti_task_id uuid NOT NULL REFERENCES public.ti_tasks(id) ON DELETE CASCADE,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  reminder_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on reminders tracking table
ALTER TABLE public.ti_task_reminders_sent ENABLE ROW LEVEL SECURITY;

-- RLS policies for reminders tracking
CREATE POLICY "TI users can view sent reminders"
  ON public.ti_task_reminders_sent
  FOR SELECT
  USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE POLICY "System can insert sent reminders"
  ON public.ti_task_reminders_sent
  FOR INSERT
  WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_ti_tasks_reminder_date ON public.ti_tasks(reminder_date) WHERE reminder_date IS NOT NULL;
CREATE INDEX idx_ti_task_reminders_sent_task_id ON public.ti_task_reminders_sent(ti_task_id);