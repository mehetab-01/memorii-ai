import { Request, Response } from 'express';
import supabase from '../config/supabase';
import { CreatePatientInput, UpdatePatientInput } from '../types/patient';
import { broadcaster } from '../websocket/broadcaster';

// GET /api/patients - Fetch all patients with their medications
export const getAllPatients = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*, medications(*)')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching patients:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching patients:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch patients' });
  }
};

// GET /api/patients/:id - Fetch single patient with medications and recent notes
export const getPatientById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Fetch patient with medications
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*, medications(*)')
      .eq('id', id)
      .single();

    if (patientError) {
      if (patientError.code === 'PGRST116') {
        res.status(404).json({ error: 'Not Found', message: `Patient with ID ${id} not found` });
        return;
      }
      console.error('Error fetching patient:', patientError);
      res.status(500).json({ error: 'Internal Server Error', message: patientError.message });
      return;
    }

    // Fetch recent notes for this patient (last 5)
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .eq('patient_id', id)
      .order('timestamp', { ascending: false })
      .limit(5);

    if (notesError) {
      console.error('Error fetching notes:', notesError);
      // Continue without notes rather than failing the entire request
    }

    res.json({
      ...patient,
      notes: notes || []
    });
  } catch (err) {
    console.error('Error fetching patient:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch patient' });
  }
};

// POST /api/patients - Create new patient
export const createPatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const patientData: CreatePatientInput = req.body;

    const { data, error } = await supabase
      .from('patients')
      .insert({
        name: patientData.name,
        age: patientData.age,
        diagnosis: patientData.diagnosis,
        photo_url: patientData.photo_url || null,
        location: patientData.location || 'At home',
        safety_status: patientData.safety_status || 'safe'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating patient:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Error creating patient:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create patient' });
  }
};

// PUT /api/patients/:id - Update patient
export const updatePatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates: UpdatePatientInput = req.body;

    const { data, error } = await supabase
      .from('patients')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Not Found', message: `Patient with ID ${id} not found` });
        return;
      }
      console.error('Error updating patient:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    // Notify patient app that their profile was updated
    broadcaster.notifyPatientUpdated(id, updates);

    res.json(data);
  } catch (err) {
    console.error('Error updating patient:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update patient' });
  }
};
