import { Router } from 'express';
import {
  getAllAppointments,
  getPatientAppointments,
  getUpcomingAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment
} from '../controllers/appointmentController';

const router = Router();

// GET /api/appointments - Get all appointments
router.get('/', getAllAppointments);

// GET /api/appointments/upcoming - Get upcoming appointments
router.get('/upcoming', getUpcomingAppointments);

// GET /api/appointments/patient/:patientId - Get appointments for a patient
router.get('/patient/:patientId', getPatientAppointments);

// POST /api/appointments - Create new appointment
router.post('/', createAppointment);

// PUT /api/appointments/:id - Update appointment
router.put('/:id', updateAppointment);

// DELETE /api/appointments/:id - Delete appointment
router.delete('/:id', deleteAppointment);

export default router;
