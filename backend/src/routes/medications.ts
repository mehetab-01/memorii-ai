import { Router } from 'express';
import {
  getPatientMedications,
  createMedication,
  updateMedication,
  deleteMedication
} from '../controllers/medicationController';

const router = Router();

// GET /api/medications/patient/:patientId - Get medications for a patient
router.get('/patient/:patientId', getPatientMedications);

// POST /api/medications - Create new medication
router.post('/', createMedication);

// PUT /api/medications/:id - Update medication
router.put('/:id', updateMedication);

// DELETE /api/medications/:id - Delete medication
router.delete('/:id', deleteMedication);

export default router;
