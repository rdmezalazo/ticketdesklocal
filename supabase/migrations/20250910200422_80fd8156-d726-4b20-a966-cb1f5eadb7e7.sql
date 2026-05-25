-- Make ticket-attachments bucket public so images can be displayed in responses
UPDATE storage.buckets 
SET public = true 
WHERE id = 'ticket-attachments';