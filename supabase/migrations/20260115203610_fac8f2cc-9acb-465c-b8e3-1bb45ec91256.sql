-- Create table for assignment reasons (motivos de asignación)
CREATE TABLE public.equipment_assignment_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for return reasons (motivos de devolución)
CREATE TABLE public.equipment_return_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment_assignment_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_return_reasons ENABLE ROW LEVEL SECURITY;

-- RLS policies for assignment reasons
CREATE POLICY "Anyone can view assignment reasons"
  ON public.equipment_assignment_reasons FOR SELECT
  USING (true);

CREATE POLICY "TI users can manage assignment reasons"
  ON public.equipment_assignment_reasons FOR ALL
  USING (is_ti_user_safe(auth.uid()));

-- RLS policies for return reasons
CREATE POLICY "Anyone can view return reasons"
  ON public.equipment_return_reasons FOR SELECT
  USING (true);

CREATE POLICY "TI users can manage return reasons"
  ON public.equipment_return_reasons FOR ALL
  USING (is_ti_user_safe(auth.uid()));

-- Insert default assignment reasons
INSERT INTO public.equipment_assignment_reasons (name) VALUES
  ('Hombre Nuevo'),
  ('Retorno de Vacaciones'),
  ('Reemplazo'),
  ('Cambio de Equipo'),
  ('Asignado');

-- Insert default return reasons
INSERT INTO public.equipment_return_reasons (name) VALUES
  ('Vacaciones'),
  ('Término del vínculo laboral'),
  ('Equipo por averías o bajas'),
  ('Licencias mayores a 7 días');

-- Add triggers for updated_at
CREATE TRIGGER update_equipment_assignment_reasons_updated_at
  BEFORE UPDATE ON public.equipment_assignment_reasons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_return_reasons_updated_at
  BEFORE UPDATE ON public.equipment_return_reasons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();