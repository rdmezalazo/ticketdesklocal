
-- Create inventarios table (Master)
CREATE TABLE public.inventarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  fecha_inventario DATE NOT NULL DEFAULT CURRENT_DATE,
  vigente BOOLEAN NOT NULL DEFAULT true,
  comentario TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create equipos table (Detail)
CREATE TABLE public.equipos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventario_id UUID NOT NULL REFERENCES public.inventarios(id) ON DELETE CASCADE,
  sede TEXT NOT NULL DEFAULT 'Arequipa',
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  nro_serie TEXT,
  fecha_alta DATE,
  fecha_baja DATE,
  operativo BOOLEAN NOT NULL DEFAULT true,
  red_linea TEXT,
  tarjeta_sim TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(codigo)
);

-- Create index for faster lookups
CREATE INDEX idx_equipos_inventario_id ON public.equipos(inventario_id);
CREATE INDEX idx_equipos_sede ON public.equipos(sede);
CREATE INDEX idx_equipos_codigo ON public.equipos(codigo);
CREATE INDEX idx_inventarios_year ON public.inventarios(year);

-- Enable RLS
ALTER TABLE public.inventarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventarios
CREATE POLICY "All users can view inventarios"
ON public.inventarios FOR SELECT
USING (true);

CREATE POLICY "TI and gerencia can manage inventarios"
ON public.inventarios FOR ALL
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

-- RLS Policies for equipos
CREATE POLICY "All users can view equipos"
ON public.equipos FOR SELECT
USING (true);

CREATE POLICY "TI and gerencia can manage equipos"
ON public.equipos FOR ALL
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

-- Function to generate equipment code based on sede and type
CREATE OR REPLACE FUNCTION public.generate_equipo_code(
  p_sede TEXT,
  p_tipo TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sede_prefix TEXT;
  tipo_prefix TEXT;
  next_number INTEGER;
  new_code TEXT;
BEGIN
  -- Determine sede prefix
  CASE p_sede
    WHEN 'Arequipa' THEN sede_prefix := 'LA';
    WHEN 'Lima' THEN sede_prefix := 'LL';
    ELSE sede_prefix := 'LX';
  END CASE;
  
  -- Determine tipo prefix
  CASE UPPER(p_tipo)
    WHEN 'COMPUTADORA' THEN tipo_prefix := 'COM';
    WHEN 'COMPUTADORA DE ESCRITORIO' THEN tipo_prefix := 'COM';
    WHEN 'LAPTOP' THEN tipo_prefix := 'LAP';
    WHEN 'CELULAR' THEN tipo_prefix := 'CEL';
    WHEN 'CAMARA' THEN tipo_prefix := 'CAM';
    WHEN 'IMPRESORA' THEN tipo_prefix := 'IMP';
    WHEN 'MONITOR' THEN tipo_prefix := 'MON';
    WHEN 'TABLET' THEN tipo_prefix := 'TAB';
    WHEN 'ROUTER' THEN tipo_prefix := 'ROU';
    WHEN 'SWITCH' THEN tipo_prefix := 'SWI';
    WHEN 'SERVIDOR' THEN tipo_prefix := 'SER';
    ELSE tipo_prefix := 'OTR';
  END CASE;
  
  -- Get next number for this prefix combination
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(codigo FROM LENGTH(sede_prefix || '-' || tipo_prefix || '-') + 1) AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM equipos
  WHERE codigo LIKE sede_prefix || '-' || tipo_prefix || '-%';
  
  -- Generate the code
  new_code := sede_prefix || '-' || tipo_prefix || '-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN new_code;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_inventarios_updated_at
BEFORE UPDATE ON public.inventarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipos_updated_at
BEFORE UPDATE ON public.equipos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
