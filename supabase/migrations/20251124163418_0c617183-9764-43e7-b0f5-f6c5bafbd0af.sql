-- Add is_bcc column to notification_recipients table
ALTER TABLE notification_recipients 
ADD COLUMN IF NOT EXISTS is_bcc boolean DEFAULT false;

-- Update updated_at timestamp when active or is_bcc changes
CREATE OR REPLACE FUNCTION update_notification_recipient_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_notification_recipient_updated_at ON notification_recipients;
CREATE TRIGGER update_notification_recipient_updated_at
  BEFORE UPDATE ON notification_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_recipient_timestamp();