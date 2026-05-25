-- Create System Areas table
CREATE TABLE public.system_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_areas ENABLE ROW LEVEL SECURITY;

-- Create policies for System Areas
CREATE POLICY "All users can view system areas" 
ON public.system_areas 
FOR SELECT 
USING (true);

CREATE POLICY "TI and gerencia can manage system areas" 
ON public.system_areas 
FOR ALL 
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_system_areas_updated_at
BEFORE UPDATE ON public.system_areas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default areas
INSERT INTO public.system_areas (name, description, color) VALUES
('General', 'Área general del sistema', '#6b7280'),
('Sistemas', 'Área de sistemas e IT', '#3b82f6'),
('Contabilidad', 'Área de contabilidad y finanzas', '#10b981'),
('Recursos Humanos', 'Área de recursos humanos', '#f59e0b'),
('Ventas', 'Área de ventas y comercial', '#ef4444'),
('Producción', 'Área de producción', '#8b5cf6'),
('Logística', 'Área de logística y almacén', '#06b6d4'),
('Calidad', 'Área de control de calidad', '#84cc16');