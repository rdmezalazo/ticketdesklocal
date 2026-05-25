export type TiTaskStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TiTaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TiTaskActivity {
  id: string;
  ti_task_id: string;
  activity_number: number;
  description: string;
  due_date: string;
  start_date?: string;
  start_time?: string;
  end_time?: string;
  duration_days?: number;
  progress: number;
  completed: boolean;
  completed_at?: string;
  completion_date?: string;
  completion_time?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ReminderFrequency {
  type: 'one_day_before' | 'same_day' | 'three_times_daily' | 'none';
}

export interface TiTask {
  id: string;
  code: string;
  subject: string;
  description?: string;
  status: TiTaskStatus;
  priority: TiTaskPriority;
  category: string;
  assignee?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  tags: string[];
  sede?: string;
  area?: string;
  activities_progress_avg?: number;
  conformidad_status?: boolean;
  conformidad_date?: Date;
  conformidad_user_id?: string;
  mentioned_users?: string[];
  reminder_date?: string;
  reminder_frequency?: ReminderFrequency;
  // Additional fields for display
  created_by_name?: string;
  assignee_name?: string;
}

export interface TiTaskWithActivities extends TiTask {
  activities?: TiTaskActivity[];
}

export interface TiTaskStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}