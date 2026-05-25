-- Add new configuration settings for expired date restrictions for admin users

-- Insert ticket admin configurations
INSERT INTO app_settings (key, value, description, module) 
SELECT 'admin_ticket_edit_expired_enabled', 'true', 'Permite al administrador editar tickets con fecha límite vencida', 'tickets'
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'admin_ticket_edit_expired_enabled');

INSERT INTO app_settings (key, value, description, module) 
SELECT 'admin_ticket_create_activity_expired_enabled', 'true', 'Permite al administrador crear actividades con fecha vencida en tickets', 'tickets'
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'admin_ticket_create_activity_expired_enabled');

INSERT INTO app_settings (key, value, description, module) 
SELECT 'admin_ticket_edit_activity_expired_enabled', 'true', 'Permite al administrador editar actividades con fecha vencida en tickets', 'tickets'
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'admin_ticket_edit_activity_expired_enabled');

-- Insert TI task admin configurations  
INSERT INTO app_settings (key, value, description, module) 
SELECT 'admin_titask_create_activity_expired_enabled', 'true', 'Permite al administrador crear actividades con fecha vencida en tareas TI', 'titasks'
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'admin_titask_create_activity_expired_enabled');

INSERT INTO app_settings (key, value, description, module) 
SELECT 'admin_titask_edit_activity_expired_enabled', 'true', 'Permite al administrador editar actividades con fecha vencida en tareas TI', 'titasks'
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'admin_titask_edit_activity_expired_enabled');