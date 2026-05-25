-- Add foreign key constraint to establish relationship between ticket_responses and profiles
ALTER TABLE public.ticket_responses 
ADD CONSTRAINT fk_ticket_responses_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;