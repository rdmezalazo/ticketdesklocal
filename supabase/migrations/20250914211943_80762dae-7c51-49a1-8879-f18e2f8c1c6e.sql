-- Update ticket status name from "Abierto" to "Ingresado"
UPDATE public.ticket_statuses 
SET name = 'Ingresado' 
WHERE slug = 'open' AND name = 'Abierto';