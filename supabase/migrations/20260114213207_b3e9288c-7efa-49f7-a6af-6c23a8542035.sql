-- Create table for maintenance plan items
CREATE TABLE public.maintenance_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  area TEXT NOT NULL,
  tipo_equipo TEXT NOT NULL,
  cargo_responsable TEXT,
  codigo_equipo TEXT,
  actividad TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Interno' CHECK (tipo IN ('Interno', 'Externo')),
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create table for maintenance schedule (P=Programado, E=Ejecutado)
CREATE TABLE public.maintenance_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_item_id UUID NOT NULL REFERENCES public.maintenance_plan_items(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  is_programado BOOLEAN NOT NULL DEFAULT false,
  is_ejecutado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(maintenance_item_id, month)
);

-- Create table for maintenance plan config (document info)
CREATE TABLE public.maintenance_plan_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  code TEXT NOT NULL DEFAULT 'L-TI-PRG-001',
  version TEXT NOT NULL DEFAULT '1.0',
  date TEXT NOT NULL,
  elaborado_por TEXT,
  puesto_trabajo TEXT,
  fecha_actualizacion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.maintenance_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plan_config ENABLE ROW LEVEL SECURITY;

-- Create policies for maintenance_plan_items
CREATE POLICY "TI users can view all maintenance items" 
ON public.maintenance_plan_items 
FOR SELECT 
USING (public.is_ti_user_safe(auth.uid()));

CREATE POLICY "TI users can insert maintenance items" 
ON public.maintenance_plan_items 
FOR INSERT 
WITH CHECK (public.is_ti_user_safe(auth.uid()));

CREATE POLICY "TI users can update maintenance items" 
ON public.maintenance_plan_items 
FOR UPDATE 
USING (public.is_ti_user_safe(auth.uid()));

CREATE POLICY "TI users can delete maintenance items" 
ON public.maintenance_plan_items 
FOR DELETE 
USING (public.is_ti_user_safe(auth.uid()));

-- Create policies for maintenance_schedule
CREATE POLICY "TI users can view all schedules" 
ON public.maintenance_schedule 
FOR SELECT 
USING (public.is_ti_user_safe(auth.uid()));

CREATE POLICY "TI users can insert schedules" 
ON public.maintenance_schedule 
FOR INSERT 
WITH CHECK (public.is_ti_user_safe(auth.uid()));

CREATE POLICY "TI users can update schedules" 
ON public.maintenance_schedule 
FOR UPDATE 
USING (public.is_ti_user_safe(auth.uid()));

CREATE POLICY "TI users can delete schedules" 
ON public.maintenance_schedule 
FOR DELETE 
USING (public.is_ti_user_safe(auth.uid()));

-- Create policies for maintenance_plan_config
CREATE POLICY "TI users can view all configs" 
ON public.maintenance_plan_config 
FOR SELECT 
USING (public.is_ti_user_safe(auth.uid()));

CREATE POLICY "TI users can insert configs" 
ON public.maintenance_plan_config 
FOR INSERT 
WITH CHECK (public.is_ti_user_safe(auth.uid()));

CREATE POLICY "TI users can update configs" 
ON public.maintenance_plan_config 
FOR UPDATE 
USING (public.is_ti_user_safe(auth.uid()));

CREATE POLICY "TI users can delete configs" 
ON public.maintenance_plan_config 
FOR DELETE 
USING (public.is_ti_user_safe(auth.uid()));

-- Create trigger for automatic timestamp updates on maintenance_plan_items
CREATE TRIGGER update_maintenance_plan_items_updated_at
BEFORE UPDATE ON public.maintenance_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on maintenance_schedule
CREATE TRIGGER update_maintenance_schedule_updated_at
BEFORE UPDATE ON public.maintenance_schedule
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on maintenance_plan_config
CREATE TRIGGER update_maintenance_plan_config_updated_at
BEFORE UPDATE ON public.maintenance_plan_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();