-- Add foreign key for assignee field to profiles table
-- This will help with better data integrity and enable JOIN queries
ALTER TABLE public.ti_tasks 
ADD CONSTRAINT ti_tasks_assignee_fkey 
FOREIGN KEY (assignee) 
REFERENCES public.profiles(user_id) 
ON DELETE SET NULL;