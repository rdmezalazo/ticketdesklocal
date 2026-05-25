-- Delete all TI task activities first (due to foreign key constraints)
DELETE FROM ti_task_activities;

-- Delete all TI tasks  
DELETE FROM ti_tasks;

-- Also delete any TI task attachments if they exist
DELETE FROM ti_task_attachments;