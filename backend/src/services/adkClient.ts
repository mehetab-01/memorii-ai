/**
 * ADK Client Service
 * HTTP client for communicating with the Python ADK (AI) service
 */

import {
  ChatRequest,
  ChatResponse,
  AnalysisRequest,
  AnalysisResponse,
  ReminderOptimizationRequest,
  ReminderOptimizationResponse,
  ADKHealthResponse,
  AgentsStatusResponse
} from '../types/adk';

class ADKClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl?: string, timeout?: number) {
    this.baseUrl = baseUrl || process.env.ADK_SERVICE_URL || 'http://localhost:5000';
    this.timeout = timeout || parseInt(process.env.ADK_TIMEOUT || '60000', 10);
  }

  /**
   * Make a POST request to the ADK service
   */
  private async post<T>(endpoint: string, data: any): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new ADKServiceError(
          `ADK service error: ${response.status}`,
          response.status,
          errorBody
        );
      }

      return await response.json() as T;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new ADKServiceError('ADK service request timeout', 504, 'Request timed out');
      }

      if (error instanceof ADKServiceError) {
        throw error;
      }

      // Connection error
      throw new ADKServiceError(
        'Cannot connect to ADK service',
        503,
        error.message || 'Service unavailable'
      );
    }
  }

  /**
   * Make a GET request to the ADK service
   */
  private async get<T>(endpoint: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new ADKServiceError(
          `ADK service error: ${response.status}`,
          response.status,
          errorBody
        );
      }

      return await response.json() as T;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new ADKServiceError('ADK service request timeout', 504, 'Request timed out');
      }

      if (error instanceof ADKServiceError) {
        throw error;
      }

      throw new ADKServiceError(
        'Cannot connect to ADK service',
        503,
        error.message || 'Service unavailable'
      );
    }
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Send a chat message to the ADK service
   */
  async chat(patientId: string | undefined, message: string, conversationHistory?: any[]): Promise<ChatResponse> {
    const request: ChatRequest = {
      patientId,
      message,
      conversationHistory: conversationHistory || []
    };

    const response = await this.post<ChatResponse>('/api/chat', request);
    return response;
  }

  /**
   * Request patient behavior analysis
   */
  async analyze(patientId: string, conversations?: any[], timeframe: '7days' | '30days' = '7days'): Promise<AnalysisResponse> {
    const request: AnalysisRequest = {
      patientId,
      conversations,
      timeframe
    };

    const response = await this.post<AnalysisResponse>('/api/analyze', request);
    return response;
  }

  /**
   * Request reminder optimization suggestion
   */
  async optimizeReminder(
    patientId: string,
    reminderType: 'medication' | 'meal' | 'activity',
    currentSchedule: string
  ): Promise<ReminderOptimizationResponse> {
    const request: ReminderOptimizationRequest = {
      patientId,
      reminderType,
      currentSchedule
    };

    const response = await this.post<ReminderOptimizationResponse>('/api/optimize-reminder', request);
    return response;
  }

  /**
   * Check ADK service health
   */
  async healthCheck(): Promise<ADKHealthResponse> {
    try {
      const response = await this.get<ADKHealthResponse>('/health');
      return response;
    } catch {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get status of all AI agents
   */
  async getAgentsStatus(): Promise<AgentsStatusResponse> {
    return await this.get<AgentsStatusResponse>('/api/agents/status');
  }

  /**
   * Check if ADK service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }
}

/**
 * Custom error class for ADK service errors
 */
export class ADKServiceError extends Error {
  public statusCode: number;
  public details: string;

  constructor(message: string, statusCode: number, details: string) {
    super(message);
    this.name = 'ADKServiceError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Export singleton instance
export const adkClient = new ADKClient();

// Export class for testing
export { ADKClient };
