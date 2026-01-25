/**
 * Conversations Routes
 * Express router for conversation-related endpoints
 */

import { Router } from 'express';
import {
  getPatientConversations,
  createConversation,
  getConversationStats
} from '../controllers/conversationController';

const router = Router();

/**
 * GET /api/conversations/patient/:patientId
 * Get conversations for a specific patient
 *
 * Query params:
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 *
 * Response: Array of conversation records
 */
router.get('/patient/:patientId', getPatientConversations);

/**
 * GET /api/conversations/patient/:patientId/stats
 * Get conversation statistics for a patient
 *
 * Query params:
 * - days: number (default: 7)
 *
 * Response:
 * {
 *   "totalConversations": 42,
 *   "sentimentBreakdown": {...},
 *   "agentBreakdown": {...},
 *   "averagePerDay": 6
 * }
 */
router.get('/patient/:patientId/stats', getConversationStats);

/**
 * POST /api/conversations
 * Log a new conversation (typically called by Python ADK)
 *
 * Request body:
 * {
 *   "patient_id": "uuid",
 *   "message": "user message",
 *   "response": "AI response",
 *   "agent": "memory|task|health",
 *   "sentiment": "positive|neutral|negative" (optional),
 *   "confidence": 0.85 (optional)
 * }
 */
router.post('/', createConversation);

export default router;
