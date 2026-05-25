-- Create table for additional email recipients for notifications
CREATE TABLE IF NOT EXISTS public.notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Enable RLS
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

-- Create policies for notification_recipients
CREATE POLICY "TI users can view notification recipients"
  ON public.notification_recipients
  FOR SELECT
  USING (is_ti_user_safe() OR is_gerencia_user_safe());

CREATE POLICY "TI users can insert notification recipients"
  ON public.notification_recipients
  FOR INSERT
  WITH CHECK (is_ti_user_safe());

CREATE POLICY "TI users can update notification recipients"
  ON public.notification_recipients
  FOR UPDATE
  USING (is_ti_user_safe());

CREATE POLICY "TI users can delete notification recipients"
  ON public.notification_recipients
  FOR DELETE
  USING (is_ti_user_safe());

-- Create trigger for updated_at
CREATE TRIGGER update_notification_recipients_updated_at
  BEFORE UPDATE ON public.notification_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for active recipients
CREATE INDEX idx_notification_recipients_active ON public.notification_recipients(active) WHERE active = true;