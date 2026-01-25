/**
 * WebSocket Event Type Definitions
 * Defines all event types and payloads for real-time communication
 */

// ============================================
// Mobile App → Server Events
// ============================================

export interface MobileConnectData {
  patientId: string;
  deviceId: string;
  deviceType: 'ios' | 'android';
}

export interface MobileMessageData {
  patientId: string;
  message: string;
  timestamp: string;
}

export interface TaskCompleteData {
  patientId: string;
  taskId: string;
  completedAt: string;
}

export interface LocationUpdateData {
  patientId: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  timestamp: string;
}

export interface DistressSignalData {
  patientId: string;
  type: 'help' | 'emergency' | 'confused' | 'other';
  timestamp: string;
  message?: string;
}

export interface HeartbeatData {
  patientId: string;
  timestamp: string;
}

export interface MedicationTakenData {
  patientId: string;
  medicationId: string;
  takenAt: string;
  notes?: string;
}

// ============================================
// Server → Mobile App Events
// ============================================

export interface ReminderDueData {
  taskId: string;
  title: string;
  description: string;
  time: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface AIResponseData {
  message: string;
  response: string;
  agent: string;
  sentiment: string;
  confidence?: number;
  timestamp: string;
}

export interface MedicationReminderData {
  medicationId: string;
  name: string;
  dosage: string;
  time: string;
  instructions?: string;
}

export interface FamilyMessageData {
  from: string;
  fromName: string;
  message: string;
  timestamp: string;
}

// ============================================
// Server → Caregiver Dashboard Events
// ============================================

export interface PatientActivityData {
  patientId: string;
  patientName?: string;
  activityType: 'message_sent' | 'task_completed' | 'medication_taken' | 'location_update' | 'distress_signal' | 'login' | 'logout';
  details: any;
  timestamp: string;
}

export interface PatientStatusChangeData {
  patientId: string;
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
}

export interface AlertCreatedData {
  alertId: string;
  patientId: string;
  patientName?: string;
  type: 'medication_missed' | 'unusual_behavior' | 'distress' | 'location_alert' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  message: string;
  timestamp: string;
}

export interface ConversationLoggedData {
  conversationId: string;
  patientId: string;
  patientName?: string;
  message: string;
  response: string;
  sentiment: string;
  confusionScore?: number;
  timestamp: string;
}

export interface PatientOnlineStatusData {
  patientId: string;
  online: boolean;
  lastSeen: string;
}

// ============================================
// Caregiver Dashboard → Server Events
// ============================================

export interface CaregiverConnectData {
  caregiverId: string;
  caregiverName?: string;
}

export interface CaregiverSendMessageData {
  patientId: string;
  message: string;
  caregiverId: string;
  caregiverName: string;
}

export interface CaregiverUpdateReminderData {
  reminderId: string;
  updates: {
    title?: string;
    description?: string;
    time?: string;
    enabled?: boolean;
  };
  caregiverId: string;
}

// ============================================
// Python ADK → Server Events
// ============================================

export interface ADKResponseGeneratedData {
  patientId: string;
  message: string;
  response: string;
  agent: string;
  sentiment: string;
  confusionScore?: number;
  timestamp: string;
}

export interface ADKConcernDetectedData {
  patientId: string;
  concernType: 'emotional_distress' | 'cognitive_decline' | 'medication_confusion' | 'safety_risk' | 'other';
  details: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: string;
}

// ============================================
// Event Names (Constants)
// ============================================

export const MOBILE_EVENTS = {
  CONNECT: 'mobile:connect',
  DISCONNECT: 'mobile:disconnect',
  MESSAGE: 'mobile:message',
  TASK_COMPLETE: 'mobile:task_complete',
  LOCATION_UPDATE: 'mobile:location_update',
  DISTRESS_SIGNAL: 'mobile:distress_signal',
  HEARTBEAT: 'mobile:heartbeat',
  MEDICATION_TAKEN: 'mobile:medication_taken',
} as const;

export const SERVER_TO_MOBILE_EVENTS = {
  REMINDER_DUE: 'reminder:due',
  AI_RESPONSE: 'ai:response',
  MEDICATION_REMINDER: 'medication:reminder',
  FAMILY_MESSAGE: 'family:message',
  SCHEDULE_UPDATED: 'schedule:updated',
  PATIENT_UPDATED: 'patient:updated',
} as const;

export const DASHBOARD_EVENTS = {
  CAREGIVER_CONNECT: 'caregiver:connect',
  CAREGIVER_DISCONNECT: 'caregiver:disconnect',
  SEND_MESSAGE: 'caregiver:send_message',
  UPDATE_REMINDER: 'caregiver:update_reminder',
} as const;

export const SERVER_TO_DASHBOARD_EVENTS = {
  PATIENT_ACTIVITY: 'patient:activity',
  PATIENT_STATUS_CHANGE: 'patient:status_change',
  ALERT_CREATED: 'alert:created',
  CONVERSATION_LOGGED: 'conversation:logged',
  PATIENT_ONLINE_STATUS: 'patient:online_status',
} as const;

export const ADK_EVENTS = {
  RESPONSE_GENERATED: 'adk:response_generated',
  CONCERN_DETECTED: 'adk:concern_detected',
} as const;
