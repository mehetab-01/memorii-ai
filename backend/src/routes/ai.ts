/**
 * AI Routes
 * Express router for AI-related endpoints that proxy to the Python ADK service
 */

import { Router } from 'express';
import {
  handleChatMessage,
  handleAnalyzeRequest,
  handleOptimizeReminder,
  checkADKHealth,
  getAgentsStatus
} from '../controllers/aiController';

const router = Router();

/**
 * POST /api/ai/chat
 * Send a chat message to the AI agent system
 *
 * Request body:
 * {
 *   "patientId": "uuid",
 *   "message": "string",
 *   "conversationHistory": [] (optional)
 * }
 *
 * Response:
 * {
 *   "response": "AI generated response",
 *   "agent": "memory|task|health",
 *   "sentiment": "positive|neutral|negative",
 *   "confidence": 0.85
 * }
 */
router.post('/chat', handleChatMessage);

/**
 * POST /api/ai/analyze
 * Request behavioral analysis for a patient
 *
 * Request body:
 * {
 *   "patientId": "uuid",
 *   "timeframe": "7days|30days" (optional, default: "7days")
 * }
 *
 * Response:
 * {
 *   "moodTrend": "description",
 *   "confusionScore": 3.5,
 *   "insights": ["array", "of", "insights"],
 *   "recommendations": ["array", "of", "recommendations"],
 *   "charts": {...}
 * }
 */
router.post('/analyze', handleAnalyzeRequest);

/**
 * POST /api/ai/optimize-reminder
 * Get AI suggestion for optimal reminder timing
 *
 * Request body:
 * {
 *   "patientId": "uuid",
 *   "reminderType": "medication|meal|activity",
 *   "currentSchedule": "09:00"
 * }
 *
 * Response:
 * {
 *   "suggestedTime": "08:00",
 *   "reasoning": "explanation",
 *   "confidence": 0.85
 * }
 */
router.post('/optimize-reminder', handleOptimizeReminder);

/**
 * GET /api/ai/health
 * Check the health status of the ADK (AI) service
 *
 * Response:
 * {
 *   "adkStatus": "healthy|down",
 *   "agents": ["memory", "task", "health", "supervisor"],
 *   "model": "gemini-2.0-flash-exp"
 * }
 */
router.get('/health', checkADKHealth);

/**
 * GET /api/ai/agents/status
 * Get detailed status of all AI agents
 *
 * Response:
 * {
 *   "agents": {...},
 *   "model": "gemini-2.0-flash-exp",
 *   "ai_available": true,
 *   "backend_connected": true
 * }
 */
router.get('/agents/status', getAgentsStatus);

export default router;
