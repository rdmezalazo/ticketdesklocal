-- Make the support-files bucket public so images can be displayed in chat
UPDATE storage.buckets 
SET public = true 
WHERE id = 'support-files';

-- Create RLS policies for support files
CREATE POLICY "Support files are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'support-files');

CREATE POLICY "Users can upload support files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'support-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own support files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'support-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own support files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'support-files' AND auth.uid()::text = (storage.foldername(name))[1]);