-- Add user ticket preferences to profiles table
ALTER TABLE public.profiles
ADD COLUMN dashboard_show_all_tickets boolean DEFAULT false,
ADD COLUMN page_show_all_tickets boolean DEFAULT false;