-- Create table for equipment assignments (Asignación y Devolución de Equipos)
CREATE TABLE public.equipment_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL,
  worker_name TEXT NOT NULL,
  worker_position TEXT,
  worker_dni TEXT,
  assigner_name TEXT NOT NULL DEFAULT 'Ronald Meza',
  assigner_position TEXT DEFAULT 'Responsable de TI',
  assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active',
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create table for assignment items (individual equipment in each assignment)
CREATE TABLE public.equipment_assignment_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.equipment_assignments(id) ON DELETE CASCADE,
  equipo_id UUID NOT NULL REFERENCES public.equipos(id),
  equipo_codigo TEXT NOT NULL,
  equipo_nombre TEXT NOT NULL,
  equipo_marca TEXT,
  equipo_modelo TEXT,
  equipo_serie TEXT,
  assignment_reason TEXT NOT NULL,
  equipment_condition TEXT NOT NULL DEFAULT 'Usado',
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  return_reason TEXT,
  return_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.equipment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_assignment_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for equipment_assignments
CREATE POLICY "Users can view all assignments" 
ON public.equipment_assignments 
FOR SELECT 
USING (true);

CREATE POLICY "TI users can create assignments" 
ON public.equipment_assignments 
FOR INSERT 
WITH CHECK (public.is_ti_user_safe(auth.uid()));

CREATE POLICY "TI users can update assignments" 
ON public.equipment_assignments 
FOR UPDATE 
USING (public.is_ti_user_safe(auth.uid()));

CREATE POLICY "TI users can delete assignments" 
ON public.equipment_assignments 
FOR DELETE 
USING (public.is_ti_user_safe(auth.uid()));

-- RLS policies for equipment_assignment_items
CREATE POLICY "Users can view all assignment items" 
ON public.equipment_assignment_items 
FOR SELECT 
USING (true);

CREATE POLICY "TI users can create assignment items" 
ON public.equipment_assignment_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.equipment_assignments 
  WHERE id = assignment_id AND public.is_ti_user_safe(auth.uid())
));

CREATE POLICY "TI users can update assignment items" 
ON public.equipment_assignment_items 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.equipment_assignments 
  WHERE id = assignment_id AND public.is_ti_user_safe(auth.uid())
));

CREATE POLICY "TI users can delete assignment items" 
ON public.equipment_assignment_items 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.equipment_assignments 
  WHERE id = assignment_id AND public.is_ti_user_safe(auth.uid())
));

-- Trigger for updated_at
CREATE TRIGGER update_equipment_assignments_updated_at
BEFORE UPDATE ON public.equipment_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_assignment_items_updated_at
BEFORE UPDATE ON public.equipment_assignment_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_equipment_assignments_worker_id ON public.equipment_assignments(worker_id);
CREATE INDEX idx_equipment_assignments_status ON public.equipment_assignments(status);
CREATE INDEX idx_equipment_assignment_items_assignment_id ON public.equipment_assignment_items(assignment_id);
CREATE INDEX idx_equipment_assignment_items_equipo_id ON public.equipment_assignment_items(equipo_id);