-- Add conformidad fields to tickets table
ALTER TABLE public.tickets 
ADD COLUMN conformidad_status boolean DEFAULT false,
ADD COLUMN conformidad_date timestamp with time zone,
ADD COLUMN conformidad_user_id uuid REFERENCES auth.users(id);