/**
 * AI API Service Layer for Memoral Frontend
 * Handles communication with AI-related backend endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// ==================== TYPES ====================

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  patientId: string;
  message: string;
  conversationHistory?: ConversationMessage[];
}

export interface ChatResponse {
  response: string;
  agent: 'memory' | 'task' | 'health';
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

export interface AnalysisResponse {
  moodTrend: string;
  confusionScore: number;
  insights: string[];
  recommendations: string[];
  charts?: {
    moodOverTime?: {
      labels: string[];
      positive: number[];
      negative: number[];
      neutral: number[];
    };
    confusionTrend?: {
      labels: string[];
      scores: number[];
    };
  };
}

export interface ReminderOptimizationResponse {
  suggestedTime: string;
  reasoning: string;
  confidence: number;
}

export interface AIHealthStatus {
  adkStatus: 'healthy' | 'down';
  agents: string[];
  model?: string;
  version?: string;
  timestamp: string;
}

export interface ConversationRecord {
  id: string;
  patient_id: string;
  message: string;
  response: string;
  agent: string;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  confidence: number | null;
  timestamp: string;
}

export interface ConversationStats {
  totalConversations: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  agentBreakdown: {
    memory: number;
    task: number;
    health: number;
  };
  averagePerDay: number;
}

export interface Alert {
  id: string;
  patient_id: string;
  alert_type: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  created_at: string;
  patients?: { name: string };
}

// ==================== ERROR HANDLING ====================

class AIApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AIApiError';
  }
}

async function fetchAIApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new AIApiError(response.status, error.message || 'An error occurred');
  }

  return response.json();
}

// ==================== AI CHAT API ====================

export const aiChatApi = {
  /**
   * Send a chat message to the AI system
   */
  sendMessage: (patientId: string, message: string, conversationHistory?: ConversationMessage[]) =>
    fetchAIApi<ChatResponse>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        patientId,
        message,
        conversationHistory: conversationHistory || []
      }),
    }),

  /**
   * Get patient behavior analysis
   */
  analyzePatient: (patientId: string, timeframe: '7days' | '30days' = '7days') =>
    fetchAIApi<AnalysisResponse>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ patientId, timeframe }),
    }),

  /**
   * Get AI suggestion for optimal reminder timing
   */
  optimizeReminder: (
    patientId: string,
    reminderType: 'medication' | 'meal' | 'activity',
    currentSchedule: string
  ) =>
    fetchAIApi<ReminderOptimizationResponse>('/ai/optimize-reminder', {
      method: 'POST',
      body: JSON.stringify({ patientId, reminderType, currentSchedule }),
    }),

  /**
   * Check if AI service is available
   */
  checkHealth: () =>
    fetchAIApi<AIHealthStatus>('/ai/health'),
};

// ==================== CONVERSATIONS API ====================

export const conversationApi = {
  /**
   * Get conversations for a patient
   */
  getByPatient: (patientId: string, limit?: number) =>
    fetchAIApi<ConversationRecord[]>(
      `/conversations/patient/${patientId}${limit ? `?limit=${limit}` : ''}`
    ),

  /**
   * Get conversation statistics for a patient
   */
  getStats: (patientId: string, days: number = 7) =>
    fetchAIApi<ConversationStats>(
      `/conversations/patient/${patientId}/stats?days=${days}`
    ),
};

// ==================== ALERTS API ====================

export const alertApi = {
  /**
   * Get all alerts
   */
  getAll: (acknowledged?: boolean, priority?: string) => {
    const params = new URLSearchParams();
    if (acknowledged !== undefined) params.append('acknowledged', String(acknowledged));
    if (priority) params.append('priority', priority);
    const queryString = params.toString();
    return fetchAIApi<Alert[]>(`/alerts${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get unacknowledged alerts (for dashboard)
   */
  getUnacknowledged: () =>
    fetchAIApi<Alert[]>('/alerts/unacknowledged'),

  /**
   * Get alerts for a specific patient
   */
  getByPatient: (patientId: string, acknowledged?: boolean) => {
    const params = acknowledged !== undefined ? `?acknowledged=${acknowledged}` : '';
    return fetchAIApi<Alert[]>(`/alerts/patient/${patientId}${params}`);
  },

  /**
   * Acknowledge an alert
   */
  acknowledge: (alertId: string) =>
    fetchAIApi<Alert>(`/alerts/${alertId}/acknowledge`, {
      method: 'PUT',
    }),

  /**
   * Delete an alert
   */
  delete: (alertId: string) =>
    fetchAIApi<void>(`/alerts/${alertId}`, {
      method: 'DELETE',
    }),
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Helper function to format agent name for display
 */
export function formatAgentName(agent: string): string {
  const names: Record<string, string> = {
    memory: 'Memory Agent',
    task: 'Task Agent',
    health: 'Health Agent',
    supervisor: 'Supervisor'
  };
  return names[agent] || agent;
}

/**
 * Helper function to format sentiment for display
 */
export function formatSentiment(sentiment: string | null): { label: string; color: string } {
  switch (sentiment) {
    case 'positive':
      return { label: 'Positive', color: 'green' };
    case 'negative':
      return { label: 'Negative', color: 'red' };
    case 'neutral':
    default:
      return { label: 'Neutral', color: 'gray' };
  }
}

/**
 * Helper function to format priority for display
 */
export function formatPriority(priority: string): { label: string; color: string } {
  switch (priority) {
    case 'critical':
      return { label: 'Critical', color: 'red' };
    case 'high':
      return { label: 'High', color: 'orange' };
    case 'medium':
      return { label: 'Medium', color: 'yellow' };
    case 'low':
    default:
      return { label: 'Low', color: 'gray' };
  }
}

/**
 * Check if AI service is available (non-throwing version)
 */
export async function isAIServiceAvailable(): Promise<boolean> {
  try {
    const health = await aiChatApi.checkHealth();
    return health.adkStatus === 'healthy';
  } catch {
    return false;
  }
}
