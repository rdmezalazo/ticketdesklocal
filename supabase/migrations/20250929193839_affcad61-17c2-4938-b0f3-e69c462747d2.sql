-- Add new app setting for admin to edit completion date/time in TI task activities
INSERT INTO public.app_settings (key, value, description, module)
VALUES (
  'admin_titask_edit_completion_datetime_enabled',
  'false',
  'Permite al administrador editar manualmente la fecha y hora de cumplimiento de actividades completadas en tareas TI',
  'ti_tasks'
)
ON CONFLICT (key) DO NOTHING;