-- Create ticket activities table
CREATE TABLE public.ticket_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL,
  activity_number integer NOT NULL,
  description text NOT NULL,
  due_date date NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(ticket_id, activity_number)
);

-- Enable RLS
ALTER TABLE public.ticket_activities ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view activities of visible tickets" 
ON public.ticket_activities 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM tickets t 
    WHERE t.id = ticket_activities.ticket_id
  )
);

CREATE POLICY "Users can create activities for accessible tickets" 
ON public.ticket_activities 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND 
  EXISTS (
    SELECT 1 FROM tickets t 
    WHERE t.id = ticket_activities.ticket_id 
    AND (t.created_by = auth.uid() OR is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
  )
);

CREATE POLICY "Users can update activities for accessible tickets" 
ON public.ticket_activities 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM tickets t 
    WHERE t.id = ticket_activities.ticket_id 
    AND (t.created_by = auth.uid() OR is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
  )
);

CREATE POLICY "TI users can manage all activities" 
ON public.ticket_activities 
FOR ALL 
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_ticket_activities_updated_at
  BEFORE UPDATE ON public.ticket_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();