-- Insert report-designer permission for Ronald Meza
INSERT INTO public.user_permissions (user_id, page_slug, can_access)
VALUES ('dd335516-4239-4fa0-8097-c255a6695826', 'report-designer', true)
ON CONFLICT (user_id, page_slug) DO UPDATE SET can_access = true, updated_at = now();