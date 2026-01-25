/**
 * Alerts Routes
 * Express router for alert-related endpoints
 */

import { Router } from 'express';
import {
  getAllAlerts,
  getPatientAlerts,
  getUnacknowledgedAlerts,
  createAlert,
  acknowledgeAlert,
  deleteAlert
} from '../controllers/alertController';

const router = Router();

/**
 * GET /api/alerts
 * Get all alerts with optional filters
 *
 * Query params:
 * - acknowledged: boolean (optional)
 * - priority: 'low' | 'medium' | 'high' | 'critical' (optional)
 */
router.get('/', getAllAlerts);

/**
 * GET /api/alerts/unacknowledged
 * Get all unacknowledged alerts (for caregiver dashboard)
 */
router.get('/unacknowledged', getUnacknowledgedAlerts);

/**
 * GET /api/alerts/patient/:patientId
 * Get alerts for a specific patient
 *
 * Query params:
 * - acknowledged: boolean (optional)
 */
router.get('/patient/:patientId', getPatientAlerts);

/**
 * POST /api/alerts
 * Create a new alert (typically called by Python ADK)
 *
 * Request body:
 * {
 *   "patient_id": "uuid",
 *   "alert_type": "confusion|emergency|medication|health",
 *   "message": "Alert description",
 *   "priority": "low|medium|high|critical" (optional, default: "medium")
 * }
 */
router.post('/', createAlert);

/**
 * PUT /api/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.put('/:id/acknowledge', acknowledgeAlert);

/**
 * DELETE /api/alerts/:id
 * Delete an alert
 */
router.delete('/:id', deleteAlert);

export default router;
