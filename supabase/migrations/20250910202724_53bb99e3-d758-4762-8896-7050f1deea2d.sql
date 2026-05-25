-- Create app_settings table for general application settings
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  module text NOT NULL, -- 'chat', 'tickets', 'users', etc.
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ticket_categories table for managing ticket categories
CREATE TABLE public.ticket_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#3b82f6',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ticket_priorities table for managing ticket priorities
CREATE TABLE public.ticket_priorities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  level integer NOT NULL UNIQUE, -- 1=lowest, higher numbers=higher priority
  color text NOT NULL DEFAULT '#3b82f6',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ticket_statuses table for managing ticket statuses
CREATE TABLE public.ticket_statuses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE, -- 'open', 'in_progress', 'resolved', 'closed'
  color text NOT NULL DEFAULT '#3b82f6',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_permissions table for managing page access
CREATE TABLE public.user_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  page_slug text NOT NULL,
  can_access boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, page_slug)
);

-- Enable RLS on all settings tables
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for app_settings (only TI and gerencia can manage)
CREATE POLICY "TI and gerencia can manage app settings"
ON public.app_settings
FOR ALL
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE POLICY "All users can view app settings"
ON public.app_settings
FOR SELECT
USING (true);

-- RLS policies for ticket_categories
CREATE POLICY "TI and gerencia can manage ticket categories"
ON public.ticket_categories
FOR ALL
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE POLICY "All users can view ticket categories"
ON public.ticket_categories
FOR SELECT
USING (true);

-- RLS policies for ticket_priorities
CREATE POLICY "TI and gerencia can manage ticket priorities"
ON public.ticket_priorities
FOR ALL
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE POLICY "All users can view ticket priorities"
ON public.ticket_priorities
FOR SELECT
USING (true);

-- RLS policies for ticket_statuses
CREATE POLICY "TI and gerencia can manage ticket statuses"
ON public.ticket_statuses
FOR ALL
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE POLICY "All users can view ticket statuses"
ON public.ticket_statuses
FOR SELECT
USING (true);

-- RLS policies for user_permissions
CREATE POLICY "TI and gerencia can manage user permissions"
ON public.user_permissions
FOR ALL
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
WITH CHECK (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
USING (auth.uid() = user_id OR is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ticket_categories_updated_at
BEFORE UPDATE ON public.ticket_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ticket_priorities_updated_at
BEFORE UPDATE ON public.ticket_priorities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ticket_statuses_updated_at
BEFORE UPDATE ON public.ticket_statuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default app settings
INSERT INTO public.app_settings (key, value, description, module) VALUES
('chat_allow_file_attachments', 'true', 'Allow file attachments in chat support', 'chat'),
('chat_allow_image_paste', 'true', 'Allow pasting images in chat support', 'chat');

-- Insert default ticket categories (from current system)
INSERT INTO public.ticket_categories (name, color) VALUES
('Incidencia', '#ef4444'),
('Soporte de Hardware', '#3b82f6'),
('Soporte de Software', '#10b981'),
('Soporte Remoto', '#8b5cf6'),
('Mantenimiento Correctivo', '#f59e0b'),
('Suministros', '#06b6d4'),
('Circuito de Cámaras', '#84cc16'),
('Análisis de Datos', '#ec4899'),
('Desarrollo', '#6366f1'),
('ERP', '#f97316'),
('Otros', '#6b7280');

-- Insert default ticket priorities
INSERT INTO public.ticket_priorities (name, level, color) VALUES
('Baja', 1, '#10b981'),
('Media', 2, '#f59e0b'),
('Alta', 3, '#ef4444'),
('Crítica', 4, '#dc2626');

-- Insert default ticket statuses
INSERT INTO public.ticket_statuses (name, slug, color, order_index) VALUES
('Abierto', 'open', '#3b82f6', 1),
('En Progreso', 'in_progress', '#f59e0b', 2),
('Resuelto', 'resolved', '#10b981', 3),
('Cerrado', 'closed', '#6b7280', 4);