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
// Comprehensive guidelines for caring for Alzheimer's patients
function buildSystemPrompt(patientName: string): string {
  const now = new Date();
  return `You are Memorii, a warm, kind, and deeply compassionate AI companion for ${patientName}, who has Alzheimer's disease.
Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
The current time is ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.

CORE GUIDELINES:
- Make ${patientName} feel SAFE above all else.
- Reduce confusion and anxiety with calm, gentle responses.
- Keep responses SHORT — 1-2 sentences maximum. They will be spoken aloud.
- Use simple, clear, warm language. Never sound robotic.
- Always reassure safety and emphasize that they are not alone.
- Repeat key facts like their name, location, and that they are safe.
- Speak like a caring companion, not a machine.

RESPONSE PATTERNS:
- If confused or disoriented: "It's okay. I'm here with you. You are safe."
- If scared or anxious: "You are safe. Take a deep breath. I am here."
- If asking about family: "Your family loves you and cares about you deeply."
- If asking about time/date: Provide current info + reassurance.
- If asking "Where am I?": "You are at home. This is a safe place."
- If asking "Who am I?": "You are ${patientName}. You are safe and loved."
- If asking for help: "I'm here to help you. You are not alone."
- If repeating a question: "That's okay. I'm happy to help you again."

NEVER:
- Never say "I don't know"
- Never sound clinical or robotic
- Never rush or interrupt
- Never make them feel forgotten
- Never end responses abruptly without reassurance

ALWAYS END WITH:
- "You are safe." OR "I am here with you." OR "Everything is okay."`;
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

        // 3. Local keyword fallback (no API) — Compassionate Alzheimer's care responses
        const now = new Date();
        const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const lower = query.toLowerCase();

        // IDENTITY RESPONSES
        if (lower.includes('who am i') || lower.includes('my name') || lower.includes('what is my name')) {
          response = `You are ${patientName}. You are safe and at home. Everything is okay.`;
        }
        // WHERE AM I
        else if (lower.includes('where am i') || lower.includes('where am') || lower.includes('location')) {
          response = `You are at your home. This is a safe place. You are not alone. I am here with you.`;
        }
        // CONFUSION & ANXIETY
        else if (lower.includes('confused') || lower.includes('lost') || lower.includes('disoriented')) {
          response = `It's okay to feel confused, ${patientName}. That's alright. I'm here with you. You are safe. You are at home with people who care about you.`;
        }
        else if (lower.includes('scared') || lower.includes('afraid') || lower.includes('frightened') || lower.includes('anxious')) {
          response = `You are safe, ${patientName}. There is nothing to worry about. I am here with you. Take a deep breath. Everything is alright.`;
        }
        else if (lower.includes('help') || lower.includes('assist')) {
          response = `I'm here to help you, ${patientName}. You are safe. Tell me what you need, and I will guide you. You are not alone.`;
        }
        // TIME & DATE
        else if (lower.includes('what time') || lower.includes('what is the time') || lower.includes('time now') || lower.includes('current time')) {
          response = `It's okay, ${patientName}. The time is ${currentTime} right now. You are doing well.`;
        }
        else if (lower.includes('what day') || lower.includes('what is the day') || lower.includes('today') || lower.includes('current day') || lower.includes('date')) {
          response = `Today is ${currentDay}, ${patientName}. You are doing wonderfully. Everything is okay.`;
        }
        // FAMILY & LOVED ONES
        else if (lower.includes('family') || lower.includes('loved ones') || lower.includes('loved') || lower.includes('children') || lower.includes('grandchildren')) {
          response = `Your family loves you very much, ${patientName}. They care about you deeply and are nearby. You are never alone.`;
        }
        else if (lower.includes('lonely') || lower.includes('alone') || lower.includes('need company')) {
          response = `You are not alone, ${patientName}. I am here with you. Your loved ones care about you. You are surrounded by care and support.`;
        }
        // MEDICATION
        else if (lower.includes('medication') || lower.includes('medicine') || lower.includes('pill') || lower.includes('tablets')) {
          response = `It's okay, ${patientName}. Your medicine schedule is taken care of. I will remind you when it's time. Don't worry.`;
        }
        // ACTIVITIES & DAILY TASKS
        else if (lower.includes('what should i do') || lower.includes('what can i do') || lower.includes('bored') || lower.includes('activity')) {
          response = `You can relax, ${patientName}. Maybe sit comfortably, have some water, or look at photos of your loved ones. Take your time. Everything is okay.`;
        }
        else if (lower.includes('breakfast') || lower.includes('lunch') || lower.includes('dinner') || lower.includes('eat') || lower.includes('food') || lower.includes('hungry')) {
          response = `That's a good idea, ${patientName}. Let's check your schedule to see meal times. Make sure you have water nearby. You are doing great.`;
        }
        // EMERGENCY
        else if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('pain') || lower.includes('hurt')) {
          response = `If you are in pain or need urgent help, press the red emergency button on your screen. Your caretaker will help you right away. You are safe.`;
        }
        // DEFAULT COMPASSIONATE RESPONSE
        else {
          response = `I'm here with you, ${patientName}. You are safe and loved. Tell me what's on your mind, and I'll do my best to help you feel better. Everything is okay.`;
        }
        provider = 'local-fallback';
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
