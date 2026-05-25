-- Ensure tickets table has REPLICA IDENTITY FULL for realtime updates
ALTER TABLE public.tickets REPLICA IDENTITY FULL;

-- Ensure ticket_activities table has REPLICA IDENTITY FULL for realtime updates  
ALTER TABLE public.ticket_activities REPLICA IDENTITY FULL;

-- Add tickets and ticket_activities tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_activities;