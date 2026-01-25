import { Request, Response } from 'express';
import supabase from '../config/supabase';

// Helper to get date ranges
const getDateRanges = () => {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  const weekFromNow = new Date(startOfToday);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  // Return dates in a format that works for date-only comparison
  // Format: YYYY-MM-DD for date comparisons
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return {
    startOfToday: startOfToday.toISOString(),
    endOfToday: endOfToday.toISOString(),
    todayDate: formatDate(today),
    weekFromNowDate: formatDate(weekFromNow),
    weekFromNow: weekFromNow.toISOString()
  };
};

// GET /api/dashboard/overview - Fetch aggregated dashboard data
export const getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { weekFromNow } = getDateRanges();

    // Fetch all patients with medications
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('*, medications(*)')
      .order('name', { ascending: true });

    if (patientsError) {
      console.error('Error fetching patients:', patientsError);
      res.status(500).json({ error: 'Internal Server Error', message: patientsError.message });
      return;
    }

    // Fetch all upcoming reminders (due within the next week or overdue, not completed)
    // This ensures reminders created for today or future dates show up
    const { data: todaysTasks, error: remindersError } = await supabase
      .from('reminders')
      .select('*, patients(name, photo_url)')
      .lte('due_date', weekFromNow)
      .eq('completed', false)
      .order('due_date', { ascending: true });

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
    }

    // Fetch recent notes (last 10 across all patients)
    const { data: recentNotes, error: notesError } = await supabase
      .from('notes')
      .select('*, patients(name, photo_url)')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (notesError) {
      console.error('Error fetching notes:', notesError);
    }

    // Calculate safety summary
    const safetySummary = {
      total: patients?.length || 0,
      safe: patients?.filter(p => p.safety_status === 'safe').length || 0,
      warning: patients?.filter(p => p.safety_status === 'warning').length || 0,
      danger: patients?.filter(p => p.safety_status === 'danger').length || 0
    };

    res.json({
      patients: patients || [],
      todaysTasks: todaysTasks || [],
      recentNotes: recentNotes || [],
      safetySummary
    });
  } catch (err) {
    console.error('Error fetching dashboard overview:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch dashboard data' });
  }
};

// GET /api/dashboard/patient/:patientId - Fetch single patient dashboard
export const getPatientDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const { endOfToday, weekFromNow } = getDateRanges();

    // Fetch patient with medications
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*, medications(*)')
      .eq('id', patientId)
      .single();

    if (patientError) {
      if (patientError.code === 'PGRST116') {
        res.status(404).json({ error: 'Not Found', message: `Patient with ID ${patientId} not found` });
        return;
      }
      console.error('Error fetching patient:', patientError);
      res.status(500).json({ error: 'Internal Server Error', message: patientError.message });
      return;
    }

    // Fetch today's reminders for this patient
    const { data: todaysTasks, error: todayError } = await supabase
      .from('reminders')
      .select('*')
      .eq('patient_id', patientId)
      .lte('due_date', endOfToday)
      .eq('completed', false)
      .order('due_date', { ascending: true });

    if (todayError) {
      console.error('Error fetching today\'s tasks:', todayError);
    }

    // Fetch upcoming reminders (next 7 days, not including today's)
    const { data: upcomingReminders, error: upcomingError } = await supabase
      .from('reminders')
      .select('*')
      .eq('patient_id', patientId)
      .gt('due_date', endOfToday)
      .lte('due_date', weekFromNow)
      .eq('completed', false)
      .order('due_date', { ascending: true });

    if (upcomingError) {
      console.error('Error fetching upcoming reminders:', upcomingError);
    }

    // Fetch recent notes (last 5)
    const { data: recentNotes, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .eq('patient_id', patientId)
      .order('timestamp', { ascending: false })
      .limit(5);

    if (notesError) {
      console.error('Error fetching notes:', notesError);
    }

    res.json({
      patient,
      todaysTasks: todaysTasks || [],
      upcomingReminders: upcomingReminders || [],
      recentNotes: recentNotes || []
    });
  } catch (err) {
    console.error('Error fetching patient dashboard:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch patient dashboard' });
  }
};
