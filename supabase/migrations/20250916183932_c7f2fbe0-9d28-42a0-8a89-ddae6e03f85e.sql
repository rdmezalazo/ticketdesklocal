-- Delete all ticket-related data to start fresh
-- Delete in order to respect foreign key constraints

-- Delete ticket activities first
DELETE FROM public.ticket_activities;

-- Delete ticket attachments
DELETE FROM public.ticket_attachments;

-- Delete ticket responses
DELETE FROM public.ticket_responses;

-- Finally delete all tickets
DELETE FROM public.tickets;

-- Reset any sequences or counters (the ticket code generation will start from 1 again)