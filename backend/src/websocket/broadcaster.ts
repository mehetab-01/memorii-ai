/**
 * WebSocket Broadcaster
 * Utility for broadcasting events from anywhere in the backend
 */

import { Server } from 'socket.io';
import {
  getPatientRoom,
  getCaregiverRoom,
  getDashboardRoom,
} from './rooms';
import {
  PatientActivityData,
  PatientStatusChangeData,
  AlertCreatedData,
  ConversationLoggedData,
  PatientOnlineStatusData,
  ReminderDueData,
  MedicationReminderData,
  FamilyMessageData,
  AIResponseData,
  SERVER_TO_MOBILE_EVENTS,
  SERVER_TO_DASHBOARD_EVENTS,
} from './events';

class Broadcaster {
  private io: Server | null = null;

  /**
   * Initialize the broadcaster with Socket.io server instance
   */
  setIO(io: Server): void {
    this.io = io;
    console.log('[Broadcaster] Initialized with Socket.io server');
  }

  /**
   * Check if broadcaster is initialized
   */
  private ensureInitialized(): void {
    if (!this.io) {
      console.warn('[Broadcaster] Not initialized. WebSocket events will not be sent.');
    }
  }

  // ============================================
  // Dashboard Broadcasts
  // ============================================

  /**
   * Notify dashboard about patient activity
   */
  notifyPatientActivity(activity: PatientActivityData): void {
    this.ensureInitialized();
    if (!this.io) return;

    const room = getDashboardRoom();
    this.io.to(room).emit(SERVER_TO_DASHBOARD_EVENTS.PATIENT_ACTIVITY, activity);
    console.log(`[Broadcaster] Patient activity sent to dashboard: ${activity.activityType}`);
  }

  /**
   * Notify dashboard about patient status change
   */
  notifyPatientStatusChange(statusChange: PatientStatusChangeData): void {
    this.ensureInitialized();
    if (!this.io) return;

    const room = getDashboardRoom();
    this.io.to(room).emit(SERVER_TO_DASHBOARD_EVENTS.PATIENT_STATUS_CHANGE, statusChange);
    console.log(`[Broadcaster] Patient status change sent to dashboard`);
  }

  /**
   * Notify dashboard about new alert
   */
  notifyAlertCreated(alert: AlertCreatedData): void {
    this.ensureInitialized();
    if (!this.io) return;

    const room = getDashboardRoom();
    this.io.to(room).emit(SERVER_TO_DASHBOARD_EVENTS.ALERT_CREATED, alert);
    console.log(`[Broadcaster] Alert sent to dashboard: ${alert.type} (${alert.priority})`);
  }

  /**
   * Notify dashboard about new conversation
   */
  notifyConversationLogged(conversation: ConversationLoggedData): void {
    this.ensureInitialized();
    if (!this.io) return;

    const room = getDashboardRoom();
    this.io.to(room).emit(SERVER_TO_DASHBOARD_EVENTS.CONVERSATION_LOGGED, conversation);
    console.log(`[Broadcaster] Conversation logged sent to dashboard`);
  }

  /**
   * Notify dashboard about patient online status change
   */
  notifyPatientOnlineStatus(status: PatientOnlineStatusData): void {
    this.ensureInitialized();
    if (!this.io) return;

    const room = getDashboardRoom();
    this.io.to(room).emit(SERVER_TO_DASHBOARD_EVENTS.PATIENT_ONLINE_STATUS, status);
    console.log(`[Broadcaster] Patient online status: ${status.patientId} - ${status.online ? 'online' : 'offline'}`);
  }

  // ============================================
  // Mobile App Broadcasts
  // ============================================

  /**
   * Send reminder to patient mobile app
   */
  sendReminderToPatient(patientId: string, reminder: ReminderDueData): void {
    this.ensureInitialized();
    if (!this.io) return;

    const room = getPatientRoom(patientId);
    this.io.to(room).emit(SERVER_TO_MOBILE_EVENTS.REMINDER_DUE, reminder);
    console.log(`[Broadcaster] Reminder sent to patient ${patientId}: ${reminder.title}`);
  }

  /**
   * Send AI response to patient mobile app
   */
  sendAIResponseToPatient(patientId: string, aiResponse: AIResponseData): void {
    this.ensureInitialized();
    if (!this.io) return;

    const room = getPatientRoom(patientId);
    this.io.to(room).emit(SERVER_TO_MOBILE_EVENTS.AI_RESPONSE, aiResponse);
    console.log(`[Broadcaster] AI response sent to patient ${patientId}`);
  }

  /**
   * Send medication reminder to patient mobile app
   */
  sendMedicationReminderToPatient(patientId: string, medication: MedicationReminderData): void {
    this.ensureInitialized();
    if (!this.io) return;

    const room = getPatientRoom(patientId);
    this.io.to(room).emit(SERVER_TO_MOBILE_EVENTS.MEDICATION_REMINDER, medication);
    console.log(`[Broadcaster] Medication reminder sent to patient ${patientId}: ${medication.name}`);
  }

  /**
   * Send family message to patient mobile app
   */
  sendFamilyMessageToPatient(patientId: string, message: FamilyMessageData): void {
    this.ensureInitialized();
    if (!this.io) return;

    const room = getPatientRoom(patientId);
    this.io.to(room).emit(SERVER_TO_MOBILE_EVENTS.FAMILY_MESSAGE, message);
    console.log(`[Broadcaster] Family message sent to patient ${patientId} from ${message.fromName}`);
  }

  /**
   * Notify patient mobile app that schedule has been updated
   */
  notifyScheduleUpdated(patientId: string): void {
    this.ensureInitialized();
    if (!this.io) return;

    const room = getPatientRoom(patientId);
    this.io.to(room).emit(SERVER_TO_MOBILE_EVENTS.SCHEDULE_UPDATED, {
      patientId,
      timestamp: new Date().toISOString(),
      message: 'Your schedule has been updated',
    });
    console.log(`[Broadcaster] Schedule update notification sent to patient ${patientId}`);
  }

  /**
   * Notify patient mobile app that their profile has been updated
   */
  notifyPatientUpdated(patientId: string, updates: any): void {
    this.ensureInitialized();
    if (!this.io) return;

    const room = getPatientRoom(patientId);
    this.io.to(room).emit(SERVER_TO_MOBILE_EVENTS.PATIENT_UPDATED, {
      patientId,
      updates,
      timestamp: new Date().toISOString(),
    });
    console.log(`[Broadcaster] Patient update notification sent to patient ${patientId}`);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get count of connected sockets in a room
   */
  async getRoomSize(roomName: string): Promise<number> {
    if (!this.io) return 0;

    const sockets = await this.io.in(roomName).fetchSockets();
    return sockets.length;
  }

  /**
   * Check if patient is currently connected
   */
  async isPatientOnline(patientId: string): Promise<boolean> {
    const room = getPatientRoom(patientId);
    const size = await this.getRoomSize(room);
    return size > 0;
  }

  /**
   * Get all connected patient IDs
   */
  async getConnectedPatients(): Promise<string[]> {
    if (!this.io) return [];

    const rooms = await this.io.fetchSockets();
    const patientIds = new Set<string>();

    for (const socket of rooms) {
      for (const room of socket.rooms) {
        if (room.startsWith('patient:')) {
          const patientId = room.replace('patient:', '');
          patientIds.add(patientId);
        }
      }
    }

    return Array.from(patientIds);
  }
}

// Export singleton instance
export const broadcaster = new Broadcaster();
