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
}

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  dosage: string;
  status: 'scheduled' | 'completed' | 'upcoming' | 'missed';
  created_at: string;
}

export interface PatientWithMedications extends Patient {
  medications: Medication[];
}

export interface CreatePatientInput {
  name: string;
  age: number;
  diagnosis: string;
  photo_url?: string;
  location?: string;
  safety_status?: 'safe' | 'warning' | 'danger';
}

export interface UpdatePatientInput {
  name?: string;
  age?: number;
  diagnosis?: string;
  photo_url?: string;
  location?: string;
  last_checkin?: string;
  safety_status?: 'safe' | 'warning' | 'danger';
  geofence_radius?: number;
  emergency_contact?: string | null;
}
