-- Remove the old unique constraint that's causing conflicts
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_key_key;

-- Ensure the correct unique constraint exists (should already be there from previous migration)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'app_settings_key_module_unique'
    ) THEN
        ALTER TABLE public.app_settings 
        ADD CONSTRAINT app_settings_key_module_unique UNIQUE (key, module);
    END IF;
END $$;