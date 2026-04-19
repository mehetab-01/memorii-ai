/**
 * Mobile App Controller
 * Handles API endpoints specifically for the patient mobile app
 */

import { Request, Response } from 'express';
import supabase from '../config/supabase';

// Helper to determine icon and color based on reminder type
const getIconAndColor = (type: string, title: string): { icon: string; color: string } => {
  const titleLower = title.toLowerCase();
  
  if (type === 'medication' || titleLower.includes('medication') || titleLower.includes('medicine') || titleLower.includes('pill')) {
    return { icon: 'medical', color: '#10B981' };
  }
  if (type === 'appointment' || titleLower.includes('doctor') || titleLower.includes('appointment')) {
    return { icon: 'calendar', color: '#4F46E5' };
  }
  if (titleLower.includes('walk') || titleLower.includes('exercise') || titleLower.includes('gym')) {
    return { icon: 'walk', color: '#3B82F6' };
  }
  if (titleLower.includes('breakfast') || titleLower.includes('lunch') || titleLower.includes('dinner') || titleLower.includes('meal') || titleLower.includes('eat')) {
    return { icon: 'restaurant', color: '#F59E0B' };
  }
  if (titleLower.includes('water') || titleLower.includes('hydrate') || titleLower.includes('drink')) {
    return { icon: 'water', color: '#3B82F6' };
  }
  
  // Default based on type
  switch (type) {
    case 'task':
      return { icon: 'checkbox', color: '#8B5CF6' };
    case 'supplies':
      return { icon: 'cart', color: '#EC4899' };
    default:
      return { icon: 'notifications', color: '#6B7280' };
  }
};

// GET /api/patient/:patientId/schedule/today - Get today's schedule for patient app
export const getPatientScheduleToday = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Fetch reminders for today
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select('*')
      .eq('patient_id', patientId)
      .gte('due_date', startOfDay.toISOString())
      .lte('due_date', endOfDay.toISOString())
      .order('due_date', { ascending: true });

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      res.status(500).json({ error: 'Internal Server Error', message: remindersError.message });
      return;
    }

    // Fetch daily routines for today
    const { data: routines, error: routinesError } = await supabase
      .from('daily_routines')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_active', true);

    if (routinesError) {
      console.error('Error fetching routines:', routinesError);
      // Continue without routines
    }

    // Combine reminders and routines into schedule format
    const schedule: Array<{
      id: string;
      title: string;
      time: string;
      icon: string;
      color: string;
      completed: boolean;
      note?: string;
      type: string;
    }> = [];

    // Add reminders to schedule
    if (reminders) {
      for (const reminder of reminders) {
        const dueDate = new Date(reminder.due_date);
        const time = `${String(dueDate.getHours()).padStart(2, '0')}:${String(dueDate.getMinutes()).padStart(2, '0')}`;
        const { icon, color } = getIconAndColor(reminder.reminder_type, reminder.title);
        
        schedule.push({
          id: reminder.id,
          title: reminder.title,
          time,
          icon,
          color,
          completed: reminder.completed || false,
          note: reminder.description || undefined,
          type: 'reminder',
        });
      }
    }

    // Add daily routines to schedule (if not already covered by a reminder)
    if (routines) {
      for (const routine of routines) {
        // Check if there's already a reminder for this routine
        const existingReminder = schedule.find(
          (item) => item.title.toLowerCase().includes(routine.activity_name.toLowerCase())
        );
        
        if (!existingReminder) {
          const { icon, color } = getIconAndColor('task', routine.activity_name);
          
          schedule.push({
            id: `routine-${routine.id}`,
            title: routine.activity_name,
            time: routine.scheduled_time,
            icon,
            color,
            completed: false,
            note: routine.description || undefined,
            type: 'routine',
          });
        }
      }
    }

    // Sort by time
    schedule.sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    res.json({ schedule, patientId });
  } catch (err) {
    console.error('Error fetching patient schedule:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch schedule' });
  }
};

// PUT /api/patient/:patientId/schedule/:itemId/complete - Mark schedule item as complete
export const completeScheduleItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, itemId } = req.params;

    // Check if it's a routine or a reminder
    if (itemId.startsWith('routine-')) {
      // For routines, we might want to track completion differently
      // For now, just return success
      res.json({ message: 'Routine completed', itemId });
      return;
    }

    // It's a reminder - update it
    const { data, error } = await supabase
      .from('reminders')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .eq('patient_id', patientId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Not Found', message: 'Schedule item not found' });
        return;
      }
      console.error('Error completing schedule item:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.json({ message: 'Item completed', item: data });
  } catch (err) {
    console.error('Error completing schedule item:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to complete item' });
  }
};

// GET /api/patient/:patientId/profile - Get patient profile for mobile app
export const getPatientProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    // Fetch patient data
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (patientError) {
      if (patientError.code === 'PGRST116') {
        res.status(404).json({ error: 'Not Found', message: 'Patient not found' });
        return;
      }
      console.error('Error fetching patient:', patientError);
      res.status(500).json({ error: 'Internal Server Error', message: patientError.message });
      return;
    }

    // Fetch medications
    const { data: medications, error: medsError } = await supabase
      .from('medications')
      .select('*')
      .eq('patient_id', patientId);

    if (medsError) {
      console.error('Error fetching medications:', medsError);
    }

    res.json({
      id: patient.id,
      name: patient.name,
      age: patient.age,
      diagnosis: patient.diagnosis,
      location: patient.location,
      photo_url: patient.photo_url,
      safety_status: patient.safety_status,
      geofence_radius: patient.geofence_radius ?? 250,
      emergency_contact: patient.emergency_contact ?? null,
      medications: medications || [],
    });
  } catch (err) {
    console.error('Error fetching patient profile:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch profile' });
  }
};

// GET /api/patient/:patientId/daily-stats - Get daily stats for patient
export const getPatientDailyStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    // Get today's date
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Count completed medication reminders for today
    const { data: completedMeds } = await supabase
      .from('reminders')
      .select('id')
      .eq('patient_id', patientId)
      .eq('reminder_type', 'medication')
      .eq('completed', true)
      .gte('completed_at', startOfDay.toISOString())
      .lte('completed_at', endOfDay.toISOString());

    // Count total medication reminders for today
    const { data: totalMeds } = await supabase
      .from('reminders')
      .select('id')
      .eq('patient_id', patientId)
      .eq('reminder_type', 'medication')
      .gte('due_date', startOfDay.toISOString())
      .lte('due_date', endOfDay.toISOString());

    // For water and walking, we'd need a separate tracking table
    // For now, return sensible defaults
    res.json({
      waterGlasses: 0,
      waterTarget: 8,
      walkingTimes: 0,
      walkingTarget: 3,
      medicinesTaken: completedMeds?.length || 0,
      medicinesTotal: totalMeds?.length || 3,
    });
  } catch (err) {
    console.error('Error fetching daily stats:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch stats' });
  }
};

// PUT /api/patient/:patientId/daily-stats - Update daily stats
export const updatePatientDailyStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const { waterGlasses, walkingTimes, medicinesTaken } = req.body;

    // For now, just acknowledge the update
    // In a full implementation, we'd store this in a daily_stats table
    res.json({
      message: 'Stats updated',
      patientId,
      stats: { waterGlasses, walkingTimes, medicinesTaken },
    });
  } catch (err) {
    console.error('Error updating daily stats:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update stats' });
  }
};

