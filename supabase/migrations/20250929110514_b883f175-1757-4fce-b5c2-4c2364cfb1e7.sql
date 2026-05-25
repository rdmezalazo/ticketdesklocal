-- Ensure app_settings table has proper structure for general report config
-- Add unique constraint to prevent duplicate keys per module
DO $$ 
BEGIN
    -- Check if the unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'app_settings_key_module_unique'
    ) THEN
        ALTER TABLE public.app_settings 
        ADD CONSTRAINT app_settings_key_module_unique UNIQUE (key, module);
    END IF;
END $$;

-- Insert default general report configuration if it doesn't exist
INSERT INTO public.app_settings (key, module, value, description)
VALUES (
    'general_report_config',
    'reports',
    '{
        "filters": {
            "dates": true,
            "areas": true,
            "categories": true,
            "productivity": true
        },
        "ticketCharts": {
            "byStatus": true,
            "byPriority": true,
            "byAreas": true,
            "byCategories": true,
            "byProductivity": true
        },
        "tiTaskCharts": {
            "byStatus": true,
            "byPriority": true,
            "byAreas": true,
            "byCategories": true,
            "byProductivity": true
        }
    }'::jsonb,
    'Configuración general para reportes - filtros y gráficos disponibles'
)
ON CONFLICT (key, module) DO NOTHING;