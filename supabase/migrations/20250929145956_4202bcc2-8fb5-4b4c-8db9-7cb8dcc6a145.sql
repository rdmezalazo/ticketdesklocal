-- Create TI Task Categories table
CREATE TABLE public.ti_task_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create TI Task Priorities table
CREATE TABLE public.ti_task_priorities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  level INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create TI Task Statuses table
CREATE TABLE public.ti_task_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ti_task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ti_task_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ti_task_statuses ENABLE ROW LEVEL SECURITY;

-- Create policies for TI Task Categories
CREATE POLICY "All users can view ti_task categories" 
ON public.ti_task_categories 
FOR SELECT 
USING (true);

CREATE POLICY "TI and gerencia can manage ti_task categories" 
ON public.ti_task_categories 
FOR ALL 
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

-- Create policies for TI Task Priorities
CREATE POLICY "All users can view ti_task priorities" 
ON public.ti_task_priorities 
FOR SELECT 
USING (true);

CREATE POLICY "TI and gerencia can manage ti_task priorities" 
ON public.ti_task_priorities 
FOR ALL 
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

-- Create policies for TI Task Statuses
CREATE POLICY "All users can view ti_task statuses" 
ON public.ti_task_statuses 
FOR SELECT 
USING (true);

CREATE POLICY "TI and gerencia can manage ti_task statuses" 
ON public.ti_task_statuses 
FOR ALL 
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_ti_task_categories_updated_at
BEFORE UPDATE ON public.ti_task_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ti_task_priorities_updated_at
BEFORE UPDATE ON public.ti_task_priorities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ti_task_statuses_updated_at
BEFORE UPDATE ON public.ti_task_statuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.ti_task_categories (name, description, color) VALUES
('Desarrollo', 'Tareas de desarrollo de software', '#3b82f6'),
('Mantenimiento', 'Tareas de mantenimiento de sistemas', '#10b981'),
('Soporte', 'Tareas de soporte técnico', '#f59e0b'),
('Infraestructura', 'Tareas de infraestructura IT', '#ef4444');

-- Insert default priorities
INSERT INTO public.ti_task_priorities (name, description, color, level) VALUES
('Baja', 'Prioridad baja', '#10b981', 1),
('Media', 'Prioridad media', '#f59e0b', 2),
('Alta', 'Prioridad alta', '#ef4444', 3),
('Crítica', 'Prioridad crítica', '#dc2626', 4);

-- Insert default statuses
INSERT INTO public.ti_task_statuses (name, slug, description, color, order_index) VALUES
('Abierto', 'open', 'Tarea abierta', '#6b7280', 0),
('En Progreso', 'in_progress', 'Tarea en progreso', '#3b82f6', 1),
('Resuelto', 'resolved', 'Tarea resuelta', '#10b981', 2),
('Cerrado', 'closed', 'Tarea cerrada', '#374151', 3);