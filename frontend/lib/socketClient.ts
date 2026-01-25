/**
 * WebSocket Client for Frontend Dashboard
 * Handles real-time communication with backend using Socket.io
 */

import { io, Socket } from 'socket.io-client';

// Backend WebSocket URL
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Event callback type
 */
type EventCallback = (data: any) => void;

/**
 * Dashboard Socket Client
 */
class DashboardSocket {
  private socket: Socket | null = null;
  private listeners: Map<string, EventCallback[]> = new Map();
  private caregiverId: string | null = null;
  private isConnected: boolean = false;

  /**
   * Connect to WebSocket server
   */
  connect(caregiverId: string): void {
    if (this.socket?.connected) {
      console.log('[Socket] Already connected');
      return;
    }

    this.caregiverId = caregiverId;

    // Create socket connection
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    this.setupEventListeners();
    console.log('[Socket] Connecting to', SOCKET_URL);
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Socket] Connected');
      this.isConnected = true;

      // Join caregiver room
      if (this.caregiverId) {
        this.socket?.emit('caregiver:connect', {
          caregiverId: this.caregiverId,
        });
      }

      this.notifyListeners('connection_status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.isConnected = false;
      this.notifyListeners('connection_status', { connected: false });
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;

      // Rejoin caregiver room
      if (this.caregiverId) {
        this.socket?.emit('caregiver:connect', {
          caregiverId: this.caregiverId,
        });
      }
    });

    // Listen for dashboard events
    this.socket.on('patient:activity', (data) => {
      console.log('[Socket] Patient activity:', data.activityType);
      this.notifyListeners('patient:activity', data);
    });

    this.socket.on('patient:status_change', (data) => {
      console.log('[Socket] Patient status change:', data.field);
      this.notifyListeners('patient:status_change', data);
    });

    this.socket.on('alert:created', (data) => {
      console.log('[Socket] Alert created:', data.type, '(', data.priority, ')');
      this.notifyListeners('alert:created', data);
    });

    this.socket.on('conversation:logged', (data) => {
      console.log('[Socket] Conversation logged');
      this.notifyListeners('conversation:logged', data);
    });

    this.socket.on('patient:online_status', (data) => {
      console.log('[Socket] Patient online status:', data.patientId, '-', data.online ? 'online' : 'offline');
      this.notifyListeners('patient:online_status', data);
    });
  }

  /**
   * Send message to patient
   */
  sendMessageToPatient(patientId: string, message: string, caregiverName: string): void {
    if (!this.socket || !this.caregiverId) {
      console.warn('[Socket] Cannot send message: not connected or no caregiver ID');
      return;
    }

    this.socket.emit('caregiver:send_message', {
      patientId,
      message,
      caregiverId: this.caregiverId,
      caregiverName,
    });
  }

  /**
   * Update reminder
   */
  updateReminder(
    reminderId: string,
    updates: {
      title?: string;
      description?: string;
      time?: string;
      enabled?: boolean;
    }
  ): void {
    if (!this.socket || !this.caregiverId) {
      console.warn('[Socket] Cannot update reminder: not connected or no caregiver ID');
      return;
    }

    this.socket.emit('caregiver:update_reminder', {
      reminderId,
      updates,
      caregiverId: this.caregiverId,
    });
  }

  /**
   * Register event listener
   */
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Unregister event listener
   */
  off(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event)!;
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Notify all listeners for an event
   */
  private notifyListeners(event: string, data: any): void {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event)!;
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[Socket] Listener error:', error);
      }
    });
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { connected: boolean; caregiverId: string | null } {
    return {
      connected: this.isConnected,
      caregiverId: this.caregiverId,
    };
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      console.log('[Socket] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.caregiverId = null;
    }
  }
}

// Export singleton instance
export const dashboardSocket = new DashboardSocket();
