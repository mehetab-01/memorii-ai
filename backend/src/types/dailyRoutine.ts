export interface DailyRoutine {
  id: string;
  patient_id: string;
  activity_name: string;
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  scheduled_time: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDailyRoutineInput {
  patient_id: string;
  activity_name: string;
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  scheduled_time: string;
  description?: string;
}

export interface UpdateDailyRoutineInput {
  activity_name?: string;
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
  scheduled_time?: string;
  description?: string;
  is_active?: boolean;
}
