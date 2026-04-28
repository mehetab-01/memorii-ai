// API Service Layer for Memoral Frontend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Types
export interface Patient {
  id: string;
  name: string;
  age: number;
  diagnosis: string;
  photo_url: string | null;
  location: string;
  last_checkin: string;
  safety_status: 'safe' | 'warning' | 'danger';
  geofence_radius: number;
  emergency_contact: string | null;
  created_at: string;
  updated_at: string;
  last_location?: { latitude: number; longitude: number; accuracy?: number } | null;
  last_location_update?: string | null;
  medications?: Medication[];
  daily_routines?: DailyRoutine[];
  appointments?: Appointment[];
}

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  dosage: string;
  status: 'scheduled' | 'completed' | 'upcoming' | 'missed';
  created_at: string;
}

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

export interface Note {
  id: string;
  patient_id: string;
  content: string;
  timestamp: string;
  created_at: string;
}

// Input Types
export interface CreatePatientInput {
  name: string;
  age: number;
  diagnosis: string;
  photo_url?: string;
  location?: string;
  safety_status?: 'safe' | 'warning' | 'danger';
}

export interface CreateMedicationInput {
  patient_id: string;
  name: string;
  dosage: string;
  status?: 'scheduled' | 'completed' | 'upcoming' | 'missed';
}

export interface CreateDailyRoutineInput {
  patient_id: string;
  activity_name: string;
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  scheduled_time: string;
  description?: string;
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

export interface CreateReminderInput {
  patient_id: string;
  title: string;
  description?: string;
  reminder_type: 'medication' | 'appointment' | 'task' | 'supplies';
  due_date: string;
}

export interface CreateNoteInput {
  patient_id: string;
  content: string;
}

// API Error class
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic fetch wrapper
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new ApiError(response.status, error.message || 'An error occurred');
  }

  return response.json();
}

// Patient API
export const patientApi = {
  getAll: () => fetchApi<Patient[]>('/patients'),

  getById: (id: string) => fetchApi<Patient>(`/patients/${id}`),

  create: (data: CreatePatientInput) =>
    fetchApi<Patient>('/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreatePatientInput>) =>
    fetchApi<Patient>(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateGeofenceRadius: (id: string, geofence_radius: number) =>
    fetchApi<Patient>(`/patients/${id}/geofence-radius`, {
      method: 'PATCH',
      body: JSON.stringify({ geofence_radius }),
    }),

  updateEmergencyContact: (id: string, emergency_contact: string | null) =>
    fetchApi<Patient>(`/patients/${id}/emergency-contact`, {
      method: 'PATCH',
      body: JSON.stringify({ emergency_contact }),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/patients/${id}`, {
      method: 'DELETE',
    }),
};

// Medication API
export const medicationApi = {
  create: (data: CreateMedicationInput) =>
    fetchApi<Medication>('/medications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateMedicationInput>) =>
    fetchApi<Medication>(`/medications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/medications/${id}`, {
      method: 'DELETE',
    }),
};

// Daily Routine API
export const dailyRoutineApi = {
  getByPatient: (patientId: string) =>
    fetchApi<DailyRoutine[]>(`/daily-routines/patient/${patientId}`),

  create: (data: CreateDailyRoutineInput) =>
    fetchApi<DailyRoutine>('/daily-routines', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateDailyRoutineInput>) =>
    fetchApi<DailyRoutine>(`/daily-routines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/daily-routines/${id}`, {
      method: 'DELETE',
    }),
};

// Appointment API
export const appointmentApi = {
  getAll: () => fetchApi<Appointment[]>('/appointments'),

  getByPatient: (patientId: string) =>
    fetchApi<Appointment[]>(`/appointments/patient/${patientId}`),

  getUpcoming: () =>
    fetchApi<Appointment[]>('/appointments/upcoming'),

  create: (data: CreateAppointmentInput) =>
    fetchApi<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateAppointmentInput & { status: string }>) =>
    fetchApi<Appointment>(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/appointments/${id}`, {
      method: 'DELETE',
    }),
};

// Reminder API
export const reminderApi = {
  getAll: () => fetchApi<Reminder[]>('/reminders'),

  getToday: () => fetchApi<Reminder[]>('/reminders/today'),

  getByPatient: (patientId: string) =>
    fetchApi<Reminder[]>(`/reminders/patient/${patientId}/today`),

  create: (data: CreateReminderInput) =>
    fetchApi<Reminder>('/reminders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  complete: (id: string) =>
    fetchApi<Reminder>(`/reminders/${id}/complete`, {
      method: 'PUT',
    }),

  delete: (id: string) =>
    fetchApi<void>(`/reminders/${id}`, {
      method: 'DELETE',
    }),
};

// Note API
export const noteApi = {
  getByPatient: (patientId: string) =>
    fetchApi<Note[]>(`/notes/patient/${patientId}`),

  create: (data: CreateNoteInput) =>
    fetchApi<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Dashboard API
export const dashboardApi = {
  getOverview: () =>
    fetchApi<{
      patients: Patient[];
      todaysTasks: Reminder[];
      recentNotes: Note[];
      safetySummary: { safe: number; warning: number; danger: number };
    }>('/dashboard/overview'),

  getPatientDashboard: (patientId: string) =>
    fetchApi<{
      patient: Patient;
      todaysTasks: Reminder[];
      recentNotes: Note[];
    }>(`/dashboard/patient/${patientId}`),
};

// AI API
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  patientId?: string;
  message: string;
  conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
  response: string;
  agent: string;
  sentiment: string;
  confidence: number;
}

export const aiApi = {
  chat: (data: ChatRequest) =>
    fetchApi<ChatResponse>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
