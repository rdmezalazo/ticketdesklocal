-- Create table for automatic report configurations
CREATE TABLE public.automatic_report_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('tickets', 'ti_tasks', 'both')),
  recipient_emails TEXT[] NOT NULL DEFAULT '{}',
  work_start_time TIME NOT NULL DEFAULT '08:00:00',
  work_end_time TIME NOT NULL DEFAULT '18:00:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create table for sent reports history
CREATE TABLE public.sent_reports_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES public.automatic_report_configs(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  recipient_emails TEXT[] NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  report_data JSONB,
  email_subject TEXT,
  email_status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS on both tables
ALTER TABLE public.automatic_report_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_reports_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for automatic_report_configs
CREATE POLICY "TI and gerencia can manage report configs" 
ON public.automatic_report_configs 
FOR ALL 
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE POLICY "All users can view report configs" 
ON public.automatic_report_configs 
FOR SELECT 
USING (true);

-- RLS policies for sent_reports_history  
CREATE POLICY "TI and gerencia can manage sent reports history" 
ON public.sent_reports_history 
FOR ALL 
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE POLICY "All users can view sent reports history" 
ON public.sent_reports_history 
FOR SELECT 
USING (true);

-- Add trigger for automatic_report_configs updated_at
CREATE TRIGGER update_automatic_report_configs_updated_at
BEFORE UPDATE ON public.automatic_report_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();