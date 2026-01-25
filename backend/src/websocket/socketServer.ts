/**
 * WebSocket Server
 * Handles all real-time communication using Socket.io
 */

import { Server, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import supabase from '../config/supabase';
import { broadcaster } from './broadcaster';
import {
  joinPatientRoom,
  joinDashboardRoom,
  joinCaregiverRoom,
  leavePatientRoom,
  leaveCaregiverRoom,
  leaveDashboardRoom,
} from './rooms';
import {
  MOBILE_EVENTS,
  DASHBOARD_EVENTS,
  ADK_EVENTS,
  MobileConnectData,
  MobileMessageData,
  TaskCompleteData,
  LocationUpdateData,
  DistressSignalData,
  HeartbeatData,
  MedicationTakenData,
  CaregiverConnectData,
  CaregiverSendMessageData,
  CaregiverUpdateReminderData,
  ADKResponseGeneratedData,
  ADKConcernDetectedData,
} from './events';

class SocketServer {
  private io: Server;
  private patientSockets: Map<string, Set<string>> = new Map(); // patientId → Set of socket IDs
  private caregiverSockets: Map<string, Set<string>> = new Map(); // caregiverId → Set of socket IDs

  constructor(httpServer: HTTPServer) {
    // Initialize Socket.io server
    this.io = new Server(httpServer, {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:8081', '*'], // Allow frontend, Expo dev, and mobile apps
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'], // Support both transports
    });

    // Set up event handlers
    this.setupEventHandlers();

    // Initialize broadcaster with Socket.io instance
    broadcaster.setIO(this.io);

    console.log('[WebSocket] Server initialized');
  }

  /**
   * Get Socket.io server instance
   */
  getIO(): Server {
    return this.io;
  }

  /**
   * Set up all WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[WebSocket] Client connected: ${socket.id}`);

      // Mobile app events
      socket.on(MOBILE_EVENTS.CONNECT, (data: MobileConnectData) => this.handleMobileConnect(socket, data));
      socket.on(MOBILE_EVENTS.MESSAGE, (data: MobileMessageData) => this.handleMobileMessage(socket, data));
      socket.on(MOBILE_EVENTS.TASK_COMPLETE, (data: TaskCompleteData) => this.handleTaskComplete(socket, data));
      socket.on(MOBILE_EVENTS.LOCATION_UPDATE, (data: LocationUpdateData) => this.handleLocationUpdate(socket, data));
      socket.on(MOBILE_EVENTS.DISTRESS_SIGNAL, (data: DistressSignalData) => this.handleDistressSignal(socket, data));
      socket.on(MOBILE_EVENTS.HEARTBEAT, (data: HeartbeatData) => this.handleHeartbeat(socket, data));
      socket.on(MOBILE_EVENTS.MEDICATION_TAKEN, (data: MedicationTakenData) => this.handleMedicationTaken(socket, data));

      // Dashboard/Caregiver events
      socket.on(DASHBOARD_EVENTS.CAREGIVER_CONNECT, (data: CaregiverConnectData) => this.handleCaregiverConnect(socket, data));
      socket.on(DASHBOARD_EVENTS.SEND_MESSAGE, (data: CaregiverSendMessageData) => this.handleCaregiverSendMessage(socket, data));
      socket.on(DASHBOARD_EVENTS.UPDATE_REMINDER, (data: CaregiverUpdateReminderData) => this.handleCaregiverUpdateReminder(socket, data));

      // Python ADK events
      socket.on(ADK_EVENTS.RESPONSE_GENERATED, (data: ADKResponseGeneratedData) => this.handleADKResponseGenerated(socket, data));
      socket.on(ADK_EVENTS.CONCERN_DETECTED, (data: ADKConcernDetectedData) => this.handleADKConcernDetected(socket, data));

      // Disconnect
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  // ============================================
  // Mobile App Event Handlers
  // ============================================

  private async handleMobileConnect(socket: Socket, data: MobileConnectData): Promise<void> {
    console.log(`[Mobile] Patient ${data.patientId} connected (${data.deviceType})`);

    // Join patient-specific room
    joinPatientRoom(socket, data.patientId);

    // Track socket
    if (!this.patientSockets.has(data.patientId)) {
      this.patientSockets.set(data.patientId, new Set());
    }
    this.patientSockets.get(data.patientId)!.add(socket.id);

    // Store patient ID in socket data
    socket.data.patientId = data.patientId;
    socket.data.deviceType = data.deviceType;

    // Notify dashboard that patient is online
    broadcaster.notifyPatientOnlineStatus({
      patientId: data.patientId,
      online: true,
      lastSeen: new Date().toISOString(),
    });

    // Update last_seen in database
    await supabase
      .from('patients')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', data.patientId);
  }

  private async handleMobileMessage(socket: Socket, data: MobileMessageData): Promise<void> {
    console.log(`[Mobile] Message from patient ${data.patientId}: ${data.message.substring(0, 50)}...`);

    try {
      // 1. Save conversation to Supabase
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          patient_id: data.patientId,
          message: data.message,
          timestamp: data.timestamp,
          // Response will be added when AI responds
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Notify dashboard about activity
      broadcaster.notifyPatientActivity({
        patientId: data.patientId,
        activityType: 'message_sent',
        details: {
          message: data.message,
          conversationId: conversation.id,
        },
        timestamp: data.timestamp,
      });

      // Note: AI response will be handled by the AI controller
      // which will call broadcaster.sendAIResponseToPatient()
    } catch (error) {
      console.error('[Mobile] Error handling message:', error);
      socket.emit('error', { message: 'Failed to process message' });
    }
  }

  private async handleTaskComplete(socket: Socket, data: TaskCompleteData): Promise<void> {
    console.log(`[Mobile] Task ${data.taskId} completed by patient ${data.patientId}`);

    try {
      // Update task in database
      const { data: task, error } = await supabase
        .from('reminders')
        .update({
          completed: true,
          completed_at: data.completedAt,
        })
        .eq('id', data.taskId)
        .select()
        .single();

      if (error) throw error;

      // Notify dashboard immediately
      broadcaster.notifyPatientActivity({
        patientId: data.patientId,
        activityType: 'task_completed',
        details: {
          taskId: data.taskId,
          title: task.title,
          completedAt: data.completedAt,
        },
        timestamp: data.completedAt,
      });
    } catch (error) {
      console.error('[Mobile] Error completing task:', error);
      socket.emit('error', { message: 'Failed to complete task' });
    }
  }

  private async handleLocationUpdate(socket: Socket, data: LocationUpdateData): Promise<void> {
    console.log(`[Mobile] Location update from patient ${data.patientId}`);

    try {
      // Update patient location in database
      await supabase
        .from('patients')
        .update({
          last_location: data.location,
          last_location_update: data.timestamp,
        })
        .eq('id', data.patientId);

      // Notify dashboard
      broadcaster.notifyPatientActivity({
        patientId: data.patientId,
        activityType: 'location_update',
        details: data.location,
        timestamp: data.timestamp,
      });
    } catch (error) {
      console.error('[Mobile] Error updating location:', error);
    }
  }

  private async handleDistressSignal(socket: Socket, data: DistressSignalData): Promise<void> {
    console.log(`[Mobile] ⚠️ DISTRESS SIGNAL from patient ${data.patientId}: ${data.type}`);

    try {
      // Create urgent alert
      const { data: alert, error } = await supabase
        .from('alerts')
        .insert({
          patient_id: data.patientId,
          type: 'distress',
          priority: 'urgent',
          message: data.message || `Patient triggered ${data.type} signal`,
          created_at: data.timestamp,
        })
        .select()
        .single();

      if (error) throw error;

      // Send HIGH PRIORITY alert to dashboard
      broadcaster.notifyAlertCreated({
        alertId: alert.id,
        patientId: data.patientId,
        type: 'distress',
        priority: 'urgent',
        message: alert.message,
        timestamp: data.timestamp,
      });

      // Also log as activity
      broadcaster.notifyPatientActivity({
        patientId: data.patientId,
        activityType: 'distress_signal',
        details: {
          type: data.type,
          message: data.message,
        },
        timestamp: data.timestamp,
      });
    } catch (error) {
      console.error('[Mobile] Error handling distress signal:', error);
    }
  }

  private async handleHeartbeat(socket: Socket, data: HeartbeatData): Promise<void> {
    // Update last_seen timestamp (silently, no broadcast needed)
    await supabase
      .from('patients')
      .update({ last_seen: data.timestamp })
      .eq('id', data.patientId);
  }

  private async handleMedicationTaken(socket: Socket, data: MedicationTakenData): Promise<void> {
    console.log(`[Mobile] Medication taken by patient ${data.patientId}`);

    try {
      // Log medication adherence
      await supabase
        .from('medication_logs')
        .insert({
          patient_id: data.patientId,
          medication_id: data.medicationId,
          taken_at: data.takenAt,
          notes: data.notes,
        });

      // Notify dashboard
      broadcaster.notifyPatientActivity({
        patientId: data.patientId,
        activityType: 'medication_taken',
        details: {
          medicationId: data.medicationId,
          takenAt: data.takenAt,
        },
        timestamp: data.takenAt,
      });
    } catch (error) {
      console.error('[Mobile] Error logging medication:', error);
    }
  }

  // ============================================
  // Caregiver Dashboard Event Handlers
  // ============================================

  private handleCaregiverConnect(socket: Socket, data: CaregiverConnectData): void {
    console.log(`[Dashboard] Caregiver ${data.caregiverId} connected`);

    // Join dashboard room (all caregivers)
    joinDashboardRoom(socket);

    // Join caregiver-specific room
    joinCaregiverRoom(socket, data.caregiverId);

    // Track socket
    if (!this.caregiverSockets.has(data.caregiverId)) {
      this.caregiverSockets.set(data.caregiverId, new Set());
    }
    this.caregiverSockets.get(data.caregiverId)!.add(socket.id);

    // Store caregiver ID in socket data
    socket.data.caregiverId = data.caregiverId;
  }

  private handleCaregiverSendMessage(socket: Socket, data: CaregiverSendMessageData): void {
    console.log(`[Dashboard] Message from caregiver to patient ${data.patientId}`);

    // Send message to patient's mobile app
    broadcaster.sendFamilyMessageToPatient(data.patientId, {
      from: data.caregiverId,
      fromName: data.caregiverName,
      message: data.message,
      timestamp: new Date().toISOString(),
    });
  }

  private async handleCaregiverUpdateReminder(socket: Socket, data: CaregiverUpdateReminderData): Promise<void> {
    console.log(`[Dashboard] Reminder ${data.reminderId} updated by caregiver`);

    try {
      // Update reminder in database
      const { data: reminder, error } = await supabase
        .from('reminders')
        .update(data.updates)
        .eq('id', data.reminderId)
        .select()
        .single();

      if (error) throw error;

      // If reminder is enabled, notify patient
      if (reminder.enabled && data.updates.time) {
        broadcaster.sendReminderToPatient(reminder.patient_id, {
          taskId: reminder.id,
          title: reminder.title,
          description: reminder.description,
          time: reminder.time,
        });
      }
    } catch (error) {
      console.error('[Dashboard] Error updating reminder:', error);
      socket.emit('error', { message: 'Failed to update reminder' });
    }
  }

  // ============================================
  // Python ADK Event Handlers
  // ============================================

  private handleADKResponseGenerated(socket: Socket, data: ADKResponseGeneratedData): void {
    console.log(`[ADK] AI response generated for patient ${data.patientId}`);

    // Send AI response to patient
    broadcaster.sendAIResponseToPatient(data.patientId, {
      message: data.message,
      response: data.response,
      agent: data.agent,
      sentiment: data.sentiment,
      confidence: data.confusionScore,
      timestamp: data.timestamp,
    });

    // Notify dashboard about conversation
    broadcaster.notifyConversationLogged({
      conversationId: '', // Will be set by database
      patientId: data.patientId,
      message: data.message,
      response: data.response,
      sentiment: data.sentiment,
      confusionScore: data.confusionScore,
      timestamp: data.timestamp,
    });
  }

  private handleADKConcernDetected(socket: Socket, data: ADKConcernDetectedData): void {
    console.log(`[ADK] ⚠️ Concern detected for patient ${data.patientId}: ${data.concernType}`);

    // Create alert and notify dashboard
    broadcaster.notifyAlertCreated({
      alertId: '', // Will be generated
      patientId: data.patientId,
      type: 'unusual_behavior',
      priority: data.priority,
      message: `AI detected: ${data.concernType}`,
      timestamp: data.timestamp,
    });
  }

  // ============================================
  // Disconnect Handler
  // ============================================

  private async handleDisconnect(socket: Socket): Promise<void> {
    console.log(`[WebSocket] Client disconnected: ${socket.id}`);

    // Handle patient disconnect
    if (socket.data.patientId) {
      const patientId = socket.data.patientId;
      const sockets = this.patientSockets.get(patientId);

      if (sockets) {
        sockets.delete(socket.id);

        // If this was the last socket for this patient
        if (sockets.size === 0) {
          this.patientSockets.delete(patientId);

          // Notify dashboard that patient is offline
          broadcaster.notifyPatientOnlineStatus({
            patientId,
            online: false,
            lastSeen: new Date().toISOString(),
          });

          // Update last_seen in database
          await supabase
            .from('patients')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', patientId);
        }
      }
    }

    // Handle caregiver disconnect
    if (socket.data.caregiverId) {
      const caregiverId = socket.data.caregiverId;
      const sockets = this.caregiverSockets.get(caregiverId);

      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          this.caregiverSockets.delete(caregiverId);
        }
      }
    }
  }
}

export default SocketServer;
