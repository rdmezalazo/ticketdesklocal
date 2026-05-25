-- Add mentioned_users column to ti_tasks table
ALTER TABLE public.ti_tasks 
ADD COLUMN mentioned_users UUID[] DEFAULT '{}';

-- Add mentioned_users column to tickets table for consistency
ALTER TABLE public.tickets 
ADD COLUMN mentioned_users UUID[] DEFAULT '{}';