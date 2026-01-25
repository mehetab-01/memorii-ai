import { Router } from 'express';
import {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient
} from '../controllers/patientController';

const router = Router();

// GET /api/patients - Fetch all patients with medications
router.get('/', getAllPatients);

// GET /api/patients/:id - Fetch single patient with medications and notes
router.get('/:id', getPatientById);

// POST /api/patients - Create new patient
router.post('/', createPatient);

// PUT /api/patients/:id - Update patient
router.put('/:id', updatePatient);

export default router;
