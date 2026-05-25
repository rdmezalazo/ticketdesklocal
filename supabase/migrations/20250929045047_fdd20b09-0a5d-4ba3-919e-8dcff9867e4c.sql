-- Add filter configuration fields to automatic_report_configs table
ALTER TABLE automatic_report_configs ADD COLUMN IF NOT EXISTS include_status_filter boolean NOT NULL DEFAULT true;
ALTER TABLE automatic_report_configs ADD COLUMN IF NOT EXISTS include_priority_filter boolean NOT NULL DEFAULT true;
ALTER TABLE automatic_report_configs ADD COLUMN IF NOT EXISTS include_category_filter boolean NOT NULL DEFAULT true;
ALTER TABLE automatic_report_configs ADD COLUMN IF NOT EXISTS include_assignee_filter boolean NOT NULL DEFAULT false;
ALTER TABLE automatic_report_configs ADD COLUMN IF NOT EXISTS include_area_filter boolean NOT NULL DEFAULT false;
ALTER TABLE automatic_report_configs ADD COLUMN IF NOT EXISTS include_charts boolean NOT NULL DEFAULT true;
ALTER TABLE automatic_report_configs ADD COLUMN IF NOT EXISTS include_summary boolean NOT NULL DEFAULT true;