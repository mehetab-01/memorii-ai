/**
 * AI Controller
 * Handles AI-related endpoints that proxy to the Python ADK service
 */

import { Request, Response } from 'express';
import { adkClient, ADKServiceError } from '../services/adkClient';
import supabase from '../config/supabase';
import { broadcaster } from '../websocket/broadcaster';

/**
 * POST /api/ai/chat
 * Handle patient chat messages
 */
export const handleChatMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, message, conversationHistory } = req.body;

    // Validate required fields (patientId is optional for general queries)
    if (!message || typeof message !== 'string' || message.trim() === '') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'message is required and must be a non-empty string'
      });
      return;
    }

    if (patientId) {
      console.log(`[AI Controller] Chat request for patient ${patientId}`);
    } else {
      console.log(`[AI Controller] General chat request (no patient specified)`);
    }

    // Call the ADK service (patientId can be undefined for general queries)
    const response = await adkClient.chat(patientId, message.trim(), conversationHistory);

    // If patient ID is provided, send real-time updates
    if (patientId && response.response) {
      // Send AI response to patient's mobile app
      broadcaster.sendAIResponseToPatient(patientId, {
        message: message.trim(),
        response: response.response,
        agent: response.agent || 'supervisor',
        sentiment: response.sentiment || 'neutral',
        confidence: response.confidence,
        timestamp: new Date().toISOString(),
      });

      // Notify dashboard about the conversation
      broadcaster.notifyConversationLogged({
        conversationId: '', // Will be set by database if saved
        patientId,
        message: message.trim(),
        response: response.response,
        sentiment: response.sentiment || 'neutral',
        confusionScore: (response as any).confusionScore || undefined,
        timestamp: new Date().toISOString(),
      });
    }

    res.json(response);
  } catch (error) {
    handleADKError(error, res);
  }
};

/**
 * POST /api/ai/analyze
 * Request patient behavior analysis
 */
export const handleAnalyzeRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, timeframe = '7days' } = req.body;

    // Validate required fields
    if (!patientId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'patientId is required'
      });
      return;
    }

    // Validate timeframe
    if (timeframe !== '7days' && timeframe !== '30days') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'timeframe must be "7days" or "30days"'
      });
      return;
    }

    console.log(`[AI Controller] Analysis request for patient ${patientId}, timeframe: ${timeframe}`);

    // Fetch recent conversations from Supabase
    const daysAgo = timeframe === '30days' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const { data: conversations, error: dbError } = await supabase
      .from('conversations')
      .select('*')
      .eq('patient_id', patientId)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false })
      .limit(100);

    if (dbError) {
      console.error('Error fetching conversations:', dbError);
      // Continue without conversations - ADK will handle empty array
    }

    // Call the ADK service
    const response = await adkClient.analyze(patientId, conversations || [], timeframe);

    res.json(response);
  } catch (error) {
    handleADKError(error, res);
  }
};

/**
 * POST /api/ai/optimize-reminder
 * Get AI suggestion for optimal reminder timing
 */
export const handleOptimizeReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, reminderType, currentSchedule } = req.body;

    // Validate required fields
    if (!patientId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'patientId is required'
      });
      return;
    }

    if (!reminderType || !['medication', 'meal', 'activity'].includes(reminderType)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'reminderType must be "medication", "meal", or "activity"'
      });
      return;
    }

    if (!currentSchedule || !/^\d{2}:\d{2}$/.test(currentSchedule)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'currentSchedule must be in HH:MM format'
      });
      return;
    }

    console.log(`[AI Controller] Optimize reminder for patient ${patientId}, type: ${reminderType}`);

    // Call the ADK service
    const response = await adkClient.optimizeReminder(patientId, reminderType, currentSchedule);

    res.json(response);
  } catch (error) {
    handleADKError(error, res);
  }
};

/**
 * GET /api/ai/health
 * Check ADK service health
 */
export const checkADKHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[AI Controller] Health check request');

    const health = await adkClient.healthCheck();

    res.json({
      adkStatus: health.status,
      agents: health.agents || [],
      model: health.model,
      version: health.version,
      timestamp: health.timestamp || new Date().toISOString()
    });
  } catch (error) {
    // Even if ADK is down, return a structured response
    res.json({
      adkStatus: 'down',
      agents: [],
      message: 'ADK service is not available',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/ai/agents/status
 * Get detailed status of all AI agents
 */
export const getAgentsStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[AI Controller] Agents status request');

    const status = await adkClient.getAgentsStatus();

    res.json(status);
  } catch (error) {
    handleADKError(error, res);
  }
};

/**
 * Helper function to handle ADK service errors
 */
function handleADKError(error: any, res: Response): void {
  console.error('[AI Controller] Error:', error);

  if (error instanceof ADKServiceError) {
    // Service-specific errors
    if (error.statusCode === 503) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'AI service is temporarily unavailable. Data operations still work.',
        details: error.details
      });
      return;
    }

    if (error.statusCode === 504) {
      res.status(504).json({
        error: 'Gateway Timeout',
        message: 'AI service request timed out. Please try again.',
        details: error.details
      });
      return;
    }

    res.status(error.statusCode).json({
      error: 'AI Service Error',
      message: error.message,
      details: error.details
    });
    return;
  }

  // Unknown errors
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred while processing the AI request'
  });
}
