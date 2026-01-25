import { Router } from 'express';
import {
  getAllReminders,
  getTodaysReminders,
  getPatientTodaysReminders,
  createReminder,
  completeReminder,
  deleteReminder
} from '../controllers/reminderController';

const router = Router();

// GET /api/reminders - Fetch all reminders (with optional filters)
router.get('/', getAllReminders);

// GET /api/reminders/today - Fetch today's reminders across all patients
router.get('/today', getTodaysReminders);

// GET /api/reminders/patient/:patientId/today - Fetch today's reminders for specific patient
router.get('/patient/:patientId/today', getPatientTodaysReminders);

// POST /api/reminders - Create new reminder
router.post('/', createReminder);

// PUT /api/reminders/:id/complete - Mark reminder as completed
router.put('/:id/complete', completeReminder);

// DELETE /api/reminders/:id - Delete reminder
router.delete('/:id', deleteReminder);

export default router;
