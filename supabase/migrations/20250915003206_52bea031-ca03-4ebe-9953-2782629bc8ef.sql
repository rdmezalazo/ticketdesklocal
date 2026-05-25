-- Create IT tasks table similar to tickets but without requester fields
CREATE TABLE public.ti_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL,
  subject text NOT NULL,
  description text,
  status ticket_status NOT NULL DEFAULT 'open'::ticket_status,
  priority ticket_priority NOT NULL DEFAULT 'medium'::ticket_priority,
  category text NOT NULL DEFAULT 'Desarrollo'::text,
  assignee text DEFAULT 'Ronald Meza, supervisorti@livigui.com'::text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  tags text[] DEFAULT '{}'::text[],
  activities_progress_avg integer DEFAULT 0,
  conformidad_status boolean DEFAULT false,
  conformidad_date timestamp with time zone,
  conformidad_user_id uuid
);

-- Enable RLS
ALTER TABLE public.ti_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies - only TI users can manage
CREATE POLICY "TI users can view all ti_tasks"
ON public.ti_tasks
FOR SELECT
TO authenticated
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE POLICY "TI users can create ti_tasks"
ON public.ti_tasks
FOR INSERT
TO authenticated
WITH CHECK (is_ti_user_safe(auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "TI users can update ti_tasks"
ON public.ti_tasks
FOR UPDATE
TO authenticated
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE POLICY "TI users can delete ti_tasks"
ON public.ti_tasks
FOR DELETE
TO authenticated
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_ti_tasks_updated_at
  BEFORE UPDATE ON public.ti_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create ti_task_activities table
CREATE TABLE public.ti_task_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ti_task_id uuid NOT NULL,
  activity_number integer NOT NULL,
  description text NOT NULL,
  due_date date NOT NULL,
  end_time time without time zone,
  progress integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ti_task_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for ti_task_activities
CREATE POLICY "TI users can view ti_task_activities"
ON public.ti_task_activities
FOR SELECT
TO authenticated
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE POLICY "TI users can create ti_task_activities"
ON public.ti_task_activities
FOR INSERT
TO authenticated
WITH CHECK (is_ti_user_safe(auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "TI users can update ti_task_activities"
ON public.ti_task_activities
FOR UPDATE
TO authenticated
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE POLICY "TI users can delete ti_task_activities"
ON public.ti_task_activities
FOR DELETE
TO authenticated
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_ti_task_activities_updated_at
  BEFORE UPDATE ON public.ti_task_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate ti_task codes
CREATE OR REPLACE FUNCTION public.generate_ti_task_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    correlativo INTEGER;
    new_code TEXT;
BEGIN
    -- Get next correlativo number for TI tasks
    SELECT COALESCE(MAX(
        CASE 
            WHEN code ~ 'TI-TASK-[0-9]+' 
            THEN CAST(SPLIT_PART(code, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO correlativo
    FROM public.ti_tasks
    WHERE code LIKE 'TI-TASK-%';
    
    -- Format the new code: TI-TASK-XXXX
    new_code := 'TI-TASK-' || LPAD(correlativo::TEXT, 4, '0');
    
    RETURN new_code;
END;
$$;

-- Create function to update ti_task activities progress
CREATE OR REPLACE FUNCTION public.update_ti_task_activities_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update the ti_task's activities progress average
    UPDATE public.ti_tasks 
    SET activities_progress_avg = (
        SELECT COALESCE(ROUND(AVG(progress)), 0)
        FROM public.ti_task_activities 
        WHERE ti_task_id = COALESCE(NEW.ti_task_id, OLD.ti_task_id)
    )
    WHERE id = COALESCE(NEW.ti_task_id, OLD.ti_task_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to update progress when activities change
CREATE TRIGGER update_ti_task_progress_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.ti_task_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ti_task_activities_progress();