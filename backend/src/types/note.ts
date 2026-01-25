export interface Note {
  id: string;
  patient_id: string;
  content: string;
  timestamp: string;
  created_at: string;
}

export interface NoteWithPatient extends Note {
  patients: {
    name: string;
    photo_url: string | null;
  };
}

export interface CreateNoteInput {
  patient_id: string;
  content: string;
  timestamp?: string;
}
