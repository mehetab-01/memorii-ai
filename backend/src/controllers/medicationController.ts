import { Request, Response } from 'express';
import supabase from '../config/supabase';
import { CreateMedicationInput, UpdateMedicationInput } from '../types/medication';

// GET /api/medications/patient/:patientId - Get all medications for a patient
export const getPatientMedications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching medications:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching medications:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch medications' });
  }
};

// POST /api/medications - Create new medication
export const createMedication = async (req: Request, res: Response): Promise<void> => {
  try {
    const medicationData: CreateMedicationInput = req.body;

    const { data, error } = await supabase
      .from('medications')
      .insert({
        patient_id: medicationData.patient_id,
        name: medicationData.name,
        dosage: medicationData.dosage,
        status: medicationData.status || 'scheduled'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating medication:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Error creating medication:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create medication' });
  }
};

// PUT /api/medications/:id - Update medication
export const updateMedication = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates: UpdateMedicationInput = req.body;

    const { data, error } = await supabase
      .from('medications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Not Found', message: `Medication with ID ${id} not found` });
        return;
      }
      console.error('Error updating medication:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('Error updating medication:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update medication' });
  }
};

// DELETE /api/medications/:id - Delete medication
export const deleteMedication = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting medication:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting medication:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete medication' });
  }
};
