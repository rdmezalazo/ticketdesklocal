-- Make the support-files bucket public so images can be displayed in chat
UPDATE storage.buckets 
SET public = true 
WHERE id = 'support-files';