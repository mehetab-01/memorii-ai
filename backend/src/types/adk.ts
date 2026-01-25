// TypeScript interfaces for ADK (AI Service) communication

// ==================== CHAT ====================

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  patientId?: string;  // Optional - for general queries
  message: string;
  conversationHistory?: ConversationMessage[];
}

export interface ChatResponse {
  response: string;
  agent: 'memory' | 'task' | 'health';
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

// ==================== ANALYSIS ====================

export interface AnalysisRequest {
  patientId: string;
  conversations?: ConversationRecord[];
  timeframe: '7days' | '30days';
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

// ==================== REMINDER OPTIMIZATION ====================

export interface ReminderOptimizationRequest {
  patientId: string;
  reminderType: 'medication' | 'meal' | 'activity';
  currentSchedule: string;  // HH:MM format
}

export interface ReminderOptimizationResponse {
  suggestedTime: string;  // HH:MM format
  reasoning: string;
  confidence: number;
}

// ==================== HEALTH CHECK ====================

export interface ADKHealthResponse {
  status: 'healthy' | 'unhealthy';
  service?: string;
  timestamp?: string;
  agents?: string[];
  model?: string;
  version?: string;
}

// ==================== CONVERSATIONS (for logging) ====================

export interface ConversationRecord {
  id?: string;
  patient_id: string;
  message: string;
  response: string;
  agent: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | null;
  confidence?: number | null;
  timestamp?: string;
}

export interface CreateConversationInput {
  patient_id: string;
  message: string;
  response: string;
  agent: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  confidence?: number;
}

// ==================== ALERTS ====================

export interface Alert {
  id: string;
  patient_id: string;
  alert_type: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  created_at: string;
}

export interface CreateAlertInput {
  patient_id: string;
  alert_type: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

// ==================== AGENT STATUS ====================

export interface AgentStatus {
  status: 'active' | 'inactive' | 'error';
  description: string;
}

export interface AgentsStatusResponse {
  agents: {
    memory: AgentStatus;
    task: AgentStatus;
    health: AgentStatus;
    supervisor: AgentStatus;
  };
  model: string;
  ai_available: boolean;
  backend_connected: boolean;
  timestamp: string;
}

// ==================== ERROR RESPONSES ====================

export interface ADKErrorResponse {
  error: string;
  message: string;
  details?: string;
}
