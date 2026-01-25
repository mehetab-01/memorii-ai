export interface Appointment {
  id: string;
  patient_id: string;
  title: string;
  description: string | null;
  appointment_type: 'medical' | 'therapy' | 'checkup' | 'lab' | 'other';
  appointment_date: string;
  appointment_time: string;
  location: string | null;
  doctor_name: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  created_at: string;
  updated_at: string;
}

export interface CreateAppointmentInput {
  patient_id: string;
  title: string;
  description?: string;
  appointment_type: 'medical' | 'therapy' | 'checkup' | 'lab' | 'other';
  appointment_date: string;
  appointment_time: string;
  location?: string;
  doctor_name?: string;
}

export interface UpdateAppointmentInput {
  title?: string;
  description?: string;
  appointment_type?: 'medical' | 'therapy' | 'checkup' | 'lab' | 'other';
  appointment_date?: string;
  appointment_time?: string;
  location?: string;
  doctor_name?: string;
  status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
}
