-- Add unique constraint to app_settings.key column to enable upsert operations
ALTER TABLE app_settings ADD CONSTRAINT app_settings_key_unique UNIQUE (key);