import { Request, Response } from 'express';
import supabase from '../config/supabase';
import { CreatePatientInput, UpdatePatientInput } from '../types/patient';
import { broadcaster } from '../websocket/broadcaster';
import { onlinePatients } from '../websocket/onlinePatients';

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

// PATCH /api/patients/:id/geofence-radius - Update patient geofence radius (caretaker sets safe zone)
export const updateGeofenceRadius = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { geofence_radius } = req.body;

    if (typeof geofence_radius !== 'number' || geofence_radius < 50 || geofence_radius > 5000) {
      res.status(400).json({ error: 'Bad Request', message: 'geofence_radius must be a number between 50 and 5000 metres' });
      return;
    }

    const { data, error } = await supabase
      .from('patients')
      .update({ geofence_radius, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Not Found', message: `Patient with ID ${id} not found` });
        return;
      }
      console.error('Error updating geofence radius:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    // Push the new radius to the patient's mobile app in real-time
    broadcaster.notifyPatientUpdated(id, { geofence_radius });

    res.json(data);
  } catch (err) {
    console.error('Error updating geofence radius:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update geofence radius' });
  }
};

// PATCH /api/patients/:id/emergency-contact - Caretaker sets emergency phone number
export const updateEmergencyContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { emergency_contact } = req.body;

    if (emergency_contact !== null && (typeof emergency_contact !== 'string' || !/^\+\d{7,15}$/.test(emergency_contact))) {
      res.status(400).json({ error: 'Bad Request', message: 'emergency_contact must be in international format (e.g. +919876543210) or null' });
      return;
    }

    const { data, error } = await supabase
      .from('patients')
      .update({ emergency_contact, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Not Found', message: `Patient with ID ${id} not found` });
        return;
      }
      console.error('Error updating emergency contact:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    // Push updated contact to patient's mobile app in real-time
    broadcaster.notifyPatientUpdated(id, { emergency_contact });

    res.json(data);
  } catch (err) {
    console.error('Error updating emergency contact:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update emergency contact' });
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

// GET /api/patients/online — Returns list of currently connected patient devices
export const getOnlinePatients = (_req: Request, res: Response): void => {
  const online = Array.from(onlinePatients.entries()).map(([patientId, entry]) => ({
    patientId,
    connectedAt: entry.connectedAt,
    lastHeartbeat: entry.lastHeartbeat,
    deviceId: entry.deviceId,
  }));
  res.json({ online });
};
