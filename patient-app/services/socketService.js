/**
 * WebSocket Service for Patient Mobile App
 * Handles real-time communication with backend using Socket.io
 */

import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Backend WebSocket URL
// For development: use your computer's IP address when testing on physical device
// For emulator: localhost works fine
const SOCKET_URL = __DEV__
  ? Platform.OS === 'ios'
    ? 'http://localhost:8000'  // iOS Simulator
    : 'http://10.0.2.2:8000'    // Android Emulator
  : 'https://your-production-url.com';

class SocketService {
  constructor() {
    this.socket = null;
    this.patientId = null;
    this.messageQueue = [];
    this.listeners = new Map();
    this.isConnected = false;
  }

  /**
   * Initialize WebSocket connection
   */
  async initialize() {
    try {
      // Get patient ID from storage
      const patientId = await AsyncStorage.getItem('patientId');
      if (!patientId) {
        console.log('[Socket] No patient ID found, skipping connection');
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
      console.log('[Socket] Initializing connection...');
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
      console.log('[Socket] Connected successfully');
      this.isConnected = true;
      this.emitMobileConnect();
      this.sendQueuedMessages();
      this.notifyListeners('connection_status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.isConnected = false;
      this.notifyListeners('connection_status', { connected: false });
    });

    this.socket.on('connect_error', (error) => {
      console.log('[Socket] Connection error:', error.message);
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.emitMobileConnect();
      this.sendQueuedMessages();
    });

    // Listen for server events
    this.socket.on('reminder:due', (data) => this.handleReminderDue(data));
    this.socket.on('ai:response', (data) => this.handleAIResponse(data));
    this.socket.on('medication:reminder', (data) => this.handleMedicationReminder(data));
    this.socket.on('family:message', (data) => this.handleFamilyMessage(data));
    this.socket.on('schedule:updated', (data) => this.handleScheduleUpdated(data));
    this.socket.on('patient:updated', (data) => this.handlePatientUpdated(data));
    this.socket.on('error', (data) => this.handleError(data));
  }

  /**
   * Emit mobile connect event
   */
  emitMobileConnect() {
    if (!this.patientId) return;

    this.emit('mobile:connect', {
      patientId: this.patientId,
      deviceId: 'rn-' + Math.random().toString(36).substr(2, 9), // Generate device ID
      deviceType: Platform.OS,
    });
  }

  /**
   * Send message to backend
   */
  sendMessage(message) {
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
  completeTask(taskId) {
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
  sendLocationUpdate(location) {
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
  sendDistressSignal(type = 'help', message = '') {
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
  logMedicationTaken(medicationId, notes = '') {
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
  emit(event, data) {
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
      const { event, data } = this.messageQueue.shift();
      this.socket.emit(event, data);
    }
  }

  /**
   * Event Handlers
   */
  handleReminderDue(data) {
    console.log('[Socket] Reminder due:', data.title);
    this.notifyListeners('reminder:due', data);
  }

  handleAIResponse(data) {
    console.log('[Socket] AI response received');
    this.notifyListeners('ai:response', data);
  }

  handleMedicationReminder(data) {
    console.log('[Socket] Medication reminder:', data.name);
    this.notifyListeners('medication:reminder', data);
  }

  handleFamilyMessage(data) {
    console.log('[Socket] Family message from:', data.fromName);
    this.notifyListeners('family:message', data);
  }

  handleScheduleUpdated(data) {
    console.log('[Socket] Schedule updated:', data.message);
    this.notifyListeners('schedule:updated', data);
  }

  handlePatientUpdated(data) {
    console.log('[Socket] Patient profile updated:', data.patientId);
    this.notifyListeners('patient:updated', data);
  }

  handleError(data) {
    console.error('[Socket] Server error:', data);
    this.notifyListeners('error', data);
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Unregister event listener
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Notify all listeners for an event
   */
  notifyListeners(event, data) {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event);
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
  getConnectionStatus() {
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
