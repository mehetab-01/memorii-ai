export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  dosage: string;
  status: 'scheduled' | 'completed' | 'upcoming' | 'missed';
  created_at: string;
}

export interface CreateMedicationInput {
  patient_id: string;
  name: string;
  dosage: string;
  status?: 'scheduled' | 'completed' | 'upcoming' | 'missed';
}

export interface UpdateMedicationInput {
  name?: string;
  dosage?: string;
  status?: 'scheduled' | 'completed' | 'upcoming' | 'missed';
}
