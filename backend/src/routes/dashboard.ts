import { Router } from 'express';
import {
  getDashboardOverview,
  getPatientDashboard
} from '../controllers/dashboardController';

const router = Router();

// GET /api/dashboard/overview - Fetch aggregated dashboard data
router.get('/overview', getDashboardOverview);

// GET /api/dashboard/patient/:patientId - Fetch single patient dashboard
router.get('/patient/:patientId', getPatientDashboard);

export default router;
