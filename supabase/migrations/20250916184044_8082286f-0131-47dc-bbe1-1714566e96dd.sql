-- Delete all support chat data to start fresh
-- Delete in order to respect foreign key constraints

-- Delete support messages first
DELETE FROM public.support_messages;

-- Delete support participants
DELETE FROM public.support_participants;

-- Finally delete all support conversations
DELETE FROM public.support_conversations;