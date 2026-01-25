export interface Reminder {
  id: string;
  patient_id: string;
  title: string;
  description: string | null;
  reminder_type: 'medication' | 'appointment' | 'task' | 'supplies';
  due_date: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface ReminderWithPatient extends Reminder {
  patients: {
    name: string;
    photo_url: string | null;
  };
}

export interface CreateReminderInput {
  patient_id: string;
  title: string;
  description?: string;
  reminder_type: 'medication' | 'appointment' | 'task' | 'supplies';
  due_date: string;
}

export interface UpdateReminderInput {
  title?: string;
  description?: string;
  reminder_type?: 'medication' | 'appointment' | 'task' | 'supplies';
  due_date?: string;
  completed?: boolean;
  completed_at?: string;
}
