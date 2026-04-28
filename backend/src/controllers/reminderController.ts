import { Request, Response } from 'express';
import supabase from '../config/supabase';
import { CreateReminderInput } from '../types/reminder';
import { broadcaster } from '../websocket/broadcaster';

// Helper to determine icon and color for task notifications sent to patient app
const getIconAndColorForBroadcast = (title: string): { icon: string; color: string } => {
  const t = title.toLowerCase();
  if (t.includes('walk') || t.includes('exercise') || t.includes('gym')) return { icon: 'walk', color: '#3B82F6' };
  if (t.includes('medication') || t.includes('medicine') || t.includes('pill')) return { icon: 'medical', color: '#10B981' };
  if (t.includes('doctor') || t.includes('appointment')) return { icon: 'calendar', color: '#4F46E5' };
  if (t.includes('breakfast') || t.includes('lunch') || t.includes('dinner') || t.includes('eat') || t.includes('meal')) return { icon: 'restaurant', color: '#F59E0B' };
  if (t.includes('water') || t.includes('drink') || t.includes('hydrate')) return { icon: 'water', color: '#3B82F6' };
  return { icon: 'checkbox', color: '#8B5CF6' };
};

// Helper to get start and end of today
const getTodayRange = () => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  return {
    start: startOfDay.toISOString(),
    end: endOfDay.toISOString()
  };
};

// GET /api/reminders - Fetch all reminders with optional filters
export const getAllReminders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, completed } = req.query;

    let query = supabase
      .from('reminders')
      .select('*, patients(name, photo_url)')
      .order('due_date', { ascending: true });

    if (patientId) {
      query = query.eq('patient_id', patientId as string);
    }

    if (completed !== undefined) {
      query = query.eq('completed', completed === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reminders:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching reminders:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch reminders' });
  }
};

// GET /api/reminders/today - Fetch today's and upcoming reminders across all patients
export const getTodaysReminders = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get reminders for the next 7 days (not completed)
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const { data, error } = await supabase
      .from('reminders')
      .select('*, patients(name, photo_url)')
      .lte('due_date', weekFromNow.toISOString())
      .eq('completed', false)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching today\'s reminders:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching today\'s reminders:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch today\'s reminders' });
  }
};

// GET /api/reminders/patient/:patientId/today - Fetch today's reminders for specific patient
export const getPatientTodaysReminders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const { end } = getTodayRange();

    const { data, error } = await supabase
      .from('reminders')
      .select('*, patients(name, photo_url)')
      .eq('patient_id', patientId)
      .lte('due_date', end)
      .eq('completed', false)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching patient\'s today reminders:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching patient\'s today reminders:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch patient\'s reminders' });
  }
};

// POST /api/reminders - Create new reminder
export const createReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const reminderData: CreateReminderInput = req.body;

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        patient_id: reminderData.patient_id,
        title: reminderData.title,
        description: reminderData.description || null,
        reminder_type: reminderData.reminder_type,
        due_date: reminderData.due_date
      })
      .select('*, patients(name, photo_url)')
      .single();

    if (error) {
      console.error('Error creating reminder:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    // Send reminder to patient's mobile app if it's due soon
    const dueDate = new Date(data.due_date);
    const now = new Date();
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Format time for display (e.g., "10:00 AM")
    const timeStr = dueDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // If due within 24 hours, send notification to mobile app
    if (hoursUntilDue <= 24 && hoursUntilDue > 0) {
      broadcaster.sendReminderToPatient(data.patient_id, {
        taskId: data.id,
        title: data.title,
        description: data.description || '',
        time: data.due_date,
        priority: 'medium',
      });
    }

    // For task-type reminders (added via AI chat), send a dedicated task:added event
    // This gives the patient app a rich notification with all task details
    if (data.reminder_type === 'task') {
      const { icon, color } = getIconAndColorForBroadcast(data.title);
      broadcaster.sendTaskAddedToPatient(data.patient_id, {
        taskId: data.id,
        title: data.title,
        time: timeStr,
        description: data.description || undefined,
        icon,
        color,
      });
    }

    // Always notify patient app that schedule was updated so they can refresh
    broadcaster.notifyScheduleUpdated(data.patient_id, {
      taskId: data.id,
      taskTitle: data.title,
      taskTime: timeStr,
    });

    res.status(201).json(data);
  } catch (err) {
    console.error('Error creating reminder:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create reminder' });
  }
};

// PUT /api/reminders/:id/complete - Mark reminder as completed
export const completeReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('reminders')
      .update({
        completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, patients(name, photo_url)')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Not Found', message: `Reminder with ID ${id} not found` });
        return;
      }
      console.error('Error completing reminder:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    // Broadcast real-time update to dashboard
    broadcaster.notifyPatientActivity({
      patientId: data.patient_id,
      patientName: data.patients?.name,
      activityType: 'task_completed',
      details: {
        taskId: id,
        title: data.title,
        completedAt: data.completed_at,
      },
      timestamp: data.completed_at,
    });

    res.json(data);
  } catch (err) {
    console.error('Error completing reminder:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to complete reminder' });
  }
};

// DELETE /api/reminders/:id - Delete reminder
export const deleteReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting reminder:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
      return;
    }

    res.json({ message: 'Reminder deleted successfully' });
  } catch (err) {
    console.error('Error deleting reminder:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete reminder' });
  }
};
