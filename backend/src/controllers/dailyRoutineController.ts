import { Request, Response } from 'express';
import supabase from '../config/supabase';
import { CreateDailyRoutineInput, UpdateDailyRoutineInput } from '../types/dailyRoutine';

// GET /api/daily-routines/patient/:patientId - Get all daily routines for a patient
export const getPatientRoutines = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    const { data, error } = await supabase
      .from('daily_routines')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error('Error fetching daily routines:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching daily routines:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch daily routines' });
  }
};

// POST /api/daily-routines - Create new daily routine
export const createDailyRoutine = async (req: Request, res: Response): Promise<void> => {
  try {
    const routineData: CreateDailyRoutineInput = req.body;

    const { data, error } = await supabase
      .from('daily_routines')
      .insert({
        patient_id: routineData.patient_id,
        activity_name: routineData.activity_name,
        time_of_day: routineData.time_of_day,
        scheduled_time: routineData.scheduled_time,
        description: routineData.description || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating daily routine:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Error creating daily routine:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create daily routine' });
  }
};

// PUT /api/daily-routines/:id - Update daily routine
export const updateDailyRoutine = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates: UpdateDailyRoutineInput = req.body;

    const { data, error } = await supabase
      .from('daily_routines')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Not Found', message: `Daily routine with ID ${id} not found` });
        return;
      }
      console.error('Error updating daily routine:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('Error updating daily routine:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update daily routine' });
  }
};

// DELETE /api/daily-routines/:id - Delete daily routine
export const deleteDailyRoutine = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('daily_routines')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting daily routine:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting daily routine:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete daily routine' });
  }
};
