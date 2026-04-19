/**
 * AI Controller
 * Handles AI-related endpoints that proxy to the Python ADK service
 */

import { Request, Response } from 'express';
import { adkClient, ADKServiceError } from '../services/adkClient';
import supabase from '../config/supabase';
import { broadcaster } from '../websocket/broadcaster';

// ── Session-based conversation history ───────────────────────────────────────
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes
interface SessionEntry {
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  lastUsed: number;
}
const voiceSessions = new Map<string, SessionEntry>();

function getSessionHistory(sessionId: string): Array<{ role: 'user' | 'assistant'; content: string }> {
  const entry = voiceSessions.get(sessionId);
  if (!entry || Date.now() - entry.lastUsed > SESSION_TTL) {
    voiceSessions.delete(sessionId);
    return [];
  }
  return entry.history;
}

function appendToSession(sessionId: string, role: 'user' | 'assistant', content: string): void {
  const entry = voiceSessions.get(sessionId) || { history: [], lastUsed: 0 };
  entry.history.push({ role, content });
  // Keep last 20 messages (10 exchanges)
  if (entry.history.length > 20) entry.history.splice(0, entry.history.length - 20);
  entry.lastUsed = Date.now();
  voiceSessions.set(sessionId, entry);
}

// ── Voice assistant system prompt for Memorii ────────────────────────────────
function buildSystemPrompt(patientName: string): string {
  const now = new Date();
  return `You are Memorii, a warm and caring AI companion for ${patientName}, who has Alzheimer's disease.
Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
The current time is ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.

Guidelines:
- Keep responses SHORT — 1 to 2 sentences maximum. They will be spoken aloud.
- Be warm, gentle, and reassuring at all times.
- Use simple, clear language — no jargon or complex words.
- Address ${patientName} by name occasionally.
- If asked about family, remind them they are loved.
- If asked about time or date, give the current information.
- If they seem confused or distressed, be extra gentle and calming.
- Never say you are an AI model — just be Memorii, their companion.`;
}

// ── Call Claude API ──────────────────────────────────────────────────────────
async function callClaudeAPI(
  message: string,
  patientName: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const messages = [...history, { role: 'user' as const, content: message }];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        system: buildSystemPrompt(patientName),
        messages,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API ${response.status}: ${err}`);
    }

    const data = await response.json() as any;
    const text = data.content?.[0]?.text;
    if (!text) throw new Error('Empty Claude response');
    return text.trim();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ── Call Gemini API (fallback) ───────────────────────────────────────────────
async function callGeminiAPI(
  message: string,
  patientName: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const systemPrompt = buildSystemPrompt(patientName);
  // Build Gemini contents from history + current message
  const contents = [
    ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: message }] },
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 150, topP: 0.9 },
        }),
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Gemini API ${response.status}`);

    const data = await response.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty Gemini response');
    return text.trim();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * POST /api/ai/voice
 * Voice assistant endpoint for the patient mobile app.
 * Tries Claude (Haiku) first, falls back to Gemini, then local keyword response.
 */
export const handleVoiceMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, patientName = 'friend', sessionId } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      res.status(400).json({ error: 'Bad Request', message: 'message is required' });
      return;
    }

    const query = message.trim();
    const sid = sessionId || `anon_${Date.now()}`;
    const history = getSessionHistory(sid);

    let response: string;
    let provider: string;

    // 1. Try Claude (Haiku — cheapest, fast, with conversation history)
    try {
      response = await callClaudeAPI(query, patientName, history);
      provider = 'claude-haiku';
    } catch (claudeErr: any) {
      console.warn('[Voice] Claude failed, trying Gemini:', claudeErr.message);

      // 2. Fall back to Gemini (with conversation history)
      try {
        response = await callGeminiAPI(query, patientName, history);
        provider = 'gemini-flash';
      } catch (geminiErr: any) {
        console.warn('[Voice] Gemini failed, using local fallback:', geminiErr.message);

        // 3. Local keyword fallback (no API)
        const now = new Date();
        const lower = query.toLowerCase();
        if (lower.includes('day') || lower.includes('date') || lower.includes('today')) {
          response = `Today is ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. You're doing wonderfully, ${patientName}!`;
        } else if (lower.includes('time')) {
          response = `It's ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} right now.`;
        } else if (lower.includes('who am i') || lower.includes('my name')) {
          response = `You are ${patientName}. You are safe and loved!`;
        } else if (lower.includes('family') || lower.includes('loved')) {
          response = `Your family loves you very much, ${patientName}. You can see them in the Loved Ones section.`;
        } else if (lower.includes('medication') || lower.includes('medicine') || lower.includes('pill')) {
          response = `Check your Today's Schedule for medication times. I'll remind you when it's time!`;
        } else if (lower.includes('help') || lower.includes('emergency')) {
          response = `Hold the red emergency button if you need urgent help. Your caretaker will be notified right away.`;
        } else {
          response = `I'm here with you, ${patientName}. How can I help you feel better today?`;
        }
        provider = 'local';
      }
    }

    // Persist exchange to session
    appendToSession(sid, 'user', query);
    appendToSession(sid, 'assistant', response);

    res.json({ response, provider, sessionId: sid });
  } catch (err) {
    console.error('[Voice] Unexpected error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Voice assistant unavailable' });
  }
};

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
    const health = await adkClient.healthCheck();

    res.json({
      adkStatus: health.status,
      agents: health.agents || [],
      model: health.model,
      version: health.version,
      timestamp: health.timestamp || new Date().toISOString()
    });
  } catch {
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
