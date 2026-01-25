import { Request, Response } from 'express';
import supabase from '../config/supabase';
import { CreateNoteInput } from '../types/note';

// GET /api/notes/patient/:patientId - Fetch all notes for a patient
export const getPatientNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('patient_id', patientId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch notes' });
  }
};

// POST /api/notes - Create new note
export const createNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const noteData: CreateNoteInput = req.body;

    const { data, error } = await supabase
      .from('notes')
      .insert({
        patient_id: noteData.patient_id,
        content: noteData.content,
        timestamp: noteData.timestamp || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create note' });
  }
};
