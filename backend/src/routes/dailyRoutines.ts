import { Router } from 'express';
import {
  getPatientRoutines,
  createDailyRoutine,
  updateDailyRoutine,
  deleteDailyRoutine
} from '../controllers/dailyRoutineController';

const router = Router();

// GET /api/daily-routines/patient/:patientId - Get routines for a patient
router.get('/patient/:patientId', getPatientRoutines);

// POST /api/daily-routines - Create new daily routine
router.post('/', createDailyRoutine);

// PUT /api/daily-routines/:id - Update daily routine
router.put('/:id', updateDailyRoutine);

// DELETE /api/daily-routines/:id - Delete daily routine
router.delete('/:id', deleteDailyRoutine);

export default router;
