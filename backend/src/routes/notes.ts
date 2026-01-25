import { Router } from 'express';
import {
  getPatientNotes,
  createNote
} from '../controllers/noteController';

const router = Router();

// GET /api/notes/patient/:patientId - Fetch all notes for a patient
router.get('/patient/:patientId', getPatientNotes);

// POST /api/notes - Create new note
router.post('/', createNote);

export default router;
