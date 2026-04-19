/**
 * WebSocket Service for Patient Mobile App
 * Handles real-time communication with backend using Socket.io
 */

import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { SOCKET_URL, STORAGE_KEYS } from '../constants/config';

type EventCallback = (data: any) => void;

class SocketService {
  private socket: any = null;
  private patientId: string | null = null;
  private messageQueue: Array<{ event: string; data: any }> = [];
  private listeners: Map<string, EventCallback[]> = new Map();
  public isConnected: boolean = false;

  /**
   * Initialize WebSocket connection
   */
  async initialize() {
    try {
      // Get patient ID from storage (check SecureStore first, then AsyncStorage fallback)
      let patientId = await SecureStore.getItemAsync(STORAGE_KEYS.PATIENT_ID);
      if (!patientId) {
        patientId = await AsyncStorage.getItem('patientId');
      }
      if (!patientId) {
        return;
      }

      this.patientId = patientId;

      // Create socket connection
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        timeout: 20000,
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('[Socket] Initialization error:', error);
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.emitMobileConnect();
      this.sendQueuedMessages();
      this.notifyListeners('connection_status', { connected: true });
    });

    this.socket.on('disconnect', (_reason: string) => {
      this.isConnected = false;
      this.notifyListeners('connection_status', { connected: false });
    });

    this.socket.on('connect_error', (_error: Error) => {
      this.isConnected = false;
    });

    this.socket.on('reconnect', (_attemptNumber: number) => {
      this.isConnected = true;
      this.emitMobileConnect();
      this.sendQueuedMessages();
    });

    // Listen for server events
    this.socket.on('reminder:due', (data: any) => this.handleReminderDue(data));
    this.socket.on('ai:response', (data: any) => this.handleAIResponse(data));
    this.socket.on('medication:reminder', (data: any) => this.handleMedicationReminder(data));
    this.socket.on('family:message', (data: any) => this.handleFamilyMessage(data));
    this.socket.on('schedule:updated', (data: any) => this.handleScheduleUpdated(data));
    this.socket.on('patient:updated', (data: any) => this.handlePatientUpdated(data));
    this.socket.on('error', (data: any) => this.handleError(data));
  }

  /**
   * Emit mobile connect event
   */
  emitMobileConnect() {
    if (!this.patientId) return;

    this.emit('mobile:connect', {
      patientId: this.patientId,
      deviceId: 'rn-' + Math.random().toString(36).substr(2, 9),
      deviceType: Platform.OS,
    });
  }

  /**
   * Send message to backend
   */
  sendMessage(message: string) {
    if (!this.patientId) {
      console.warn('[Socket] Cannot send message: no patient ID');
      return;
    }

    this.emit('mobile:message', {
      patientId: this.patientId,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Mark task as completed
   */
  completeTask(taskId: string) {
    if (!this.patientId) return;

    this.emit('mobile:task_complete', {
      patientId: this.patientId,
      taskId,
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Send location update
   */
  sendLocationUpdate(location: { latitude: number; longitude: number; address?: string }) {
    if (!this.patientId) return;

    this.emit('mobile:location_update', {
      patientId: this.patientId,
      location,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send distress signal
   */
  sendDistressSignal(type: string = 'help', message: string = '') {
    if (!this.patientId) return;

    this.emit('mobile:distress_signal', {
      patientId: this.patientId,
      type,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log medication taken
   */
  logMedicationTaken(medicationId: string, notes: string = '') {
    if (!this.patientId) return;

    this.emit('mobile:medication_taken', {
      patientId: this.patientId,
      medicationId,
      takenAt: new Date().toISOString(),
      notes,
    });
  }

  /**
   * Send heartbeat (keep-alive)
   */
  sendHeartbeat() {
    if (!this.patientId || !this.isConnected) return;

    this.emit('mobile:heartbeat', {
      patientId: this.patientId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Generic emit function with queue support
   */
  emit(event: string, data: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
      console.log('[Socket] Emitted:', event);
    } else {
      // Queue message for later
      this.messageQueue.push({ event, data });
      console.log('[Socket] Queued:', event, '(not connected)');
    }
  }

  /**
   * Send all queued messages
   */
  sendQueuedMessages() {
    console.log('[Socket] Sending', this.messageQueue.length, 'queued messages');

    while (this.messageQueue.length > 0) {
      const { event, data } = this.messageQueue.shift()!;
      this.socket!.emit(event, data);
    }
  }

  /**
   * Event Handlers
   */
  handleReminderDue(data: any) {
    console.log('[Socket] Reminder due:', data.title);
    this.notifyListeners('reminder:due', data);
  }

  handleAIResponse(data: any) {
    console.log('[Socket] AI response received');
    this.notifyListeners('ai:response', data);
  }

  handleMedicationReminder(data: any) {
    console.log('[Socket] Medication reminder:', data.name);
    this.notifyListeners('medication:reminder', data);
  }

  handleFamilyMessage(data: any) {
    console.log('[Socket] Family message from:', data.fromName);
    this.notifyListeners('family:message', data);
  }

  handleScheduleUpdated(data: any) {
    console.log('[Socket] Schedule updated:', data.message);
    this.notifyListeners('schedule:updated', data);
  }

  handlePatientUpdated(data: any) {
    console.log('[Socket] Patient profile updated:', data.patientId);
    this.notifyListeners('patient:updated', data);
  }

  handleError(data: any) {
    console.error('[Socket] Server error:', data);
    this.notifyListeners('error', data);
  }

  /**
   * Register event listener
   */
  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Unregister event listener
   */
  off(event: string, callback: EventCallback) {
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
  notifyListeners(event: string, data: any) {
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
  getConnectionStatus(): { connected: boolean; patientId: string | null } {
    return {
      connected: this.isConnected,
      patientId: this.patientId,
    };
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.socket) {
      console.log('[Socket] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();
