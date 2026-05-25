-- Drop the previous foreign key
ALTER TABLE public.ticket_responses 
DROP CONSTRAINT IF EXISTS fk_ticket_responses_user_id;

-- Add correct foreign key constraint to profiles table
ALTER TABLE public.ticket_responses 
ADD CONSTRAINT fk_ticket_responses_profiles 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;