-- Create table for ticket replies/responses
CREATE TABLE public.ticket_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ticket_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for ticket responses
CREATE POLICY "Users can view responses for visible tickets" 
ON public.ticket_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM tickets t 
    WHERE t.id = ticket_responses.ticket_id
  )
);

CREATE POLICY "Users can create responses for accessible tickets" 
ON public.ticket_responses 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM tickets t 
    WHERE t.id = ticket_responses.ticket_id 
    AND (t.created_by = auth.uid() OR is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
  )
);

CREATE POLICY "TI users can manage all responses" 
ON public.ticket_responses 
FOR ALL 
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ticket_responses_updated_at
BEFORE UPDATE ON public.ticket_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_ticket_responses_ticket_id ON public.ticket_responses(ticket_id);
CREATE INDEX idx_ticket_responses_created_at ON public.ticket_responses(created_at);