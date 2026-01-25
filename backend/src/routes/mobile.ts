/**
 * Mobile App Routes
 * API endpoints specifically for the patient mobile app
 */

import { Router } from 'express';
import {
  getPatientScheduleToday,
  completeScheduleItem,
  getPatientProfile,
  getPatientDailyStats,
  updatePatientDailyStats,
} from '../controllers/mobileController';

const router = Router();

// GET /api/patient/:patientId/schedule/today - Get today's schedule
router.get('/:patientId/schedule/today', getPatientScheduleToday);

// PUT /api/patient/:patientId/schedule/:itemId/complete - Mark item as complete
router.put('/:patientId/schedule/:itemId/complete', completeScheduleItem);

// GET /api/patient/:patientId/profile - Get patient profile
router.get('/:patientId/profile', getPatientProfile);

// GET /api/patient/:patientId/daily-stats - Get daily stats
router.get('/:patientId/daily-stats', getPatientDailyStats);

// PUT /api/patient/:patientId/daily-stats - Update daily stats
router.put('/:patientId/daily-stats', updatePatientDailyStats);

export default router;

