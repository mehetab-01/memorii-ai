import { Router } from 'express';
import {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  updateGeofenceRadius,
  updateEmergencyContact,
  getOnlinePatients,
} from '../controllers/patientController';
import { generatePairingToken, verifyPairingToken } from '../controllers/pairingController';

const router = Router();

// GET /api/patients - Fetch all patients with medications
router.get('/', getAllPatients);

// GET /api/patients/online - Get currently connected patient devices (must be before /:id)
router.get('/online', getOnlinePatients);

// GET /api/patients/:id - Fetch single patient with medications and notes
router.get('/:id', getPatientById);

// POST /api/patients - Create new patient
router.post('/', createPatient);

// PUT /api/patients/:id - Update patient
router.put('/:id', updatePatient);

// PATCH /api/patients/:id/geofence-radius - Caretaker sets safe zone radius
router.patch('/:id/geofence-radius', updateGeofenceRadius);

// PATCH /api/patients/:id/emergency-contact - Caretaker sets emergency phone number
router.patch('/:id/emergency-contact', updateEmergencyContact);

// GET /api/patients/:patientId/pairing-code - Generate QR pairing token (must be before /:id catch-all? No — uses sub-path)
router.get('/:patientId/pairing-code', generatePairingToken);

// POST /api/patients/verify-pairing - Verify a pairing token/code
router.post('/verify-pairing', verifyPairingToken);

export default router;
