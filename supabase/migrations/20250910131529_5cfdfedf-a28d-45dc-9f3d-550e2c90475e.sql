-- Create enum types for tickets
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Create tickets table
CREATE TABLE public.tickets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    description TEXT,
    status ticket_status NOT NULL DEFAULT 'open',
    priority ticket_priority NOT NULL DEFAULT 'medium',
    category TEXT NOT NULL DEFAULT 'Incidencia',
    requester TEXT NOT NULL,
    requester_email TEXT NOT NULL,
    requester_area TEXT,
    requester_cargo TEXT,
    requester_sede TEXT NOT NULL DEFAULT 'Arequipa',
    assignee TEXT DEFAULT 'Ronald Meza, supervisorti@livigui.com',
    tags TEXT[] DEFAULT '{}',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket_attachments table
CREATE TABLE public.ticket_attachments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    file_url TEXT NOT NULL,
    uploaded_by UUID NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-attachments', 'ticket-attachments', false);

-- Create indexes for better performance
CREATE INDEX idx_tickets_created_by ON public.tickets(created_by);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_assignee ON public.tickets(assignee);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at DESC);
CREATE INDEX idx_ticket_attachments_ticket_id ON public.ticket_attachments(ticket_id);

-- Create RLS policies for tickets
CREATE POLICY "Users can view all tickets" 
ON public.tickets 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create tickets" 
ON public.tickets 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "TI users can update all tickets" 
ON public.tickets 
FOR UPDATE 
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

CREATE POLICY "Users can update their own tickets" 
ON public.tickets 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "TI users can delete tickets" 
ON public.tickets 
FOR DELETE 
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

-- Create RLS policies for ticket attachments
CREATE POLICY "Users can view attachments of visible tickets" 
ON public.ticket_attachments 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = ticket_attachments.ticket_id
));

CREATE POLICY "Users can upload attachments to tickets they can access" 
ON public.ticket_attachments 
FOR INSERT 
WITH CHECK (
    auth.uid() = uploaded_by AND 
    EXISTS (
        SELECT 1 FROM public.tickets t 
        WHERE t.id = ticket_attachments.ticket_id 
        AND (t.created_by = auth.uid() OR is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
    )
);

CREATE POLICY "TI users can manage all attachments" 
ON public.ticket_attachments 
FOR ALL 
USING (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()));

-- Create storage policies for ticket attachments
CREATE POLICY "Users can view ticket attachments" 
ON storage.objects 
FOR SELECT 
USING (
    bucket_id = 'ticket-attachments' AND 
    EXISTS (
        SELECT 1 FROM public.ticket_attachments ta
        JOIN public.tickets t ON ta.ticket_id = t.id
        WHERE ta.file_url LIKE '%' || storage.objects.name
    )
);

CREATE POLICY "Users can upload ticket attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
    bucket_id = 'ticket-attachments' AND 
    auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their ticket attachments" 
ON storage.objects 
FOR UPDATE 
USING (
    bucket_id = 'ticket-attachments' AND 
    auth.uid() IS NOT NULL
);

CREATE POLICY "TI users can delete ticket attachments" 
ON storage.objects 
FOR DELETE 
USING (
    bucket_id = 'ticket-attachments' AND 
    (is_ti_user_safe(auth.uid()) OR is_gerencia_user_safe(auth.uid()))
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate next ticket code
CREATE OR REPLACE FUNCTION public.generate_ticket_code(sede TEXT, area TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    sede_code TEXT;
    area_code TEXT;
    correlativo INTEGER;
    new_code TEXT;
BEGIN
    -- Generate sede code
    sede_code := CASE sede
        WHEN 'Arequipa' THEN 'AQP'
        WHEN 'Lima' THEN 'LMA'
        ELSE 'GEN'
    END;
    
    -- Generate area code (first 3 letters, uppercase)
    area_code := UPPER(LEFT(COALESCE(area, 'GEN'), 3));
    
    -- Get next correlativo number for this sede-area combination
    SELECT COALESCE(MAX(
        CASE 
            WHEN code ~ (sede_code || '-' || area_code || '-[0-9]+') 
            THEN CAST(SPLIT_PART(code, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO correlativo
    FROM public.tickets
    WHERE code LIKE sede_code || '-' || area_code || '-%';
    
    -- Format the new code
    new_code := sede_code || '-' || area_code || '-' || LPAD(correlativo::TEXT, 3, '0');
    
    RETURN new_code;
END;
$$;