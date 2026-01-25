import { Request, Response } from 'express';
import supabase from '../config/supabase';
import { CreateAppointmentInput, UpdateAppointmentInput } from '../types/appointment';

// GET /api/appointments - Get all appointments
export const getAllAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, patients(name)')
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch appointments' });
  }
};

// GET /api/appointments/patient/:patientId - Get all appointments for a patient
export const getPatientAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch appointments' });
  }
};

// GET /api/appointments/upcoming - Get upcoming appointments
export const getUpcomingAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('appointments')
      .select('*, patients(name)')
      .gte('appointment_date', today)
      .eq('status', 'scheduled')
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error fetching upcoming appointments:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching upcoming appointments:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch upcoming appointments' });
  }
};

// POST /api/appointments - Create new appointment
export const createAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const appointmentData: CreateAppointmentInput = req.body;

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        patient_id: appointmentData.patient_id,
        title: appointmentData.title,
        description: appointmentData.description || null,
        appointment_type: appointmentData.appointment_type,
        appointment_date: appointmentData.appointment_date,
        appointment_time: appointmentData.appointment_time,
        location: appointmentData.location || null,
        doctor_name: appointmentData.doctor_name || null,
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating appointment:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create appointment' });
  }
};

// PUT /api/appointments/:id - Update appointment
export const updateAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates: UpdateAppointmentInput = req.body;

    const { data, error } = await supabase
      .from('appointments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Not Found', message: `Appointment with ID ${id} not found` });
        return;
      }
      console.error('Error updating appointment:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('Error updating appointment:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update appointment' });
  }
};

// DELETE /api/appointments/:id - Delete appointment
export const deleteAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting appointment:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting appointment:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete appointment' });
  }
};
