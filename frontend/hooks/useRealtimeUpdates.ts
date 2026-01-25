/**
 * React Hook for Real-time Dashboard Updates
 * Provides real-time updates for the caregiver dashboard
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { dashboardSocket } from '@/lib/socketClient';
import { toast } from 'sonner';

export interface PatientActivity {
  patientId: string;
  patientName?: string;
  activityType: 'message_sent' | 'task_completed' | 'medication_taken' | 'location_update' | 'distress_signal' | 'login' | 'logout';
  details: any;
  timestamp: string;
}

export interface Alert {
  alertId: string;
  patientId: string;
  patientName?: string;
  type: 'medication_missed' | 'unusual_behavior' | 'distress' | 'location_alert' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  message: string;
  timestamp: string;
}

export interface Conversation {
  conversationId: string;
  patientId: string;
  patientName?: string;
  message: string;
  response: string;
  sentiment: string;
  confusionScore?: number;
  timestamp: string;
}

export interface PatientOnlineStatus {
  patientId: string;
  online: boolean;
  lastSeen: string;
}

/**
 * Main hook for real-time dashboard updates
 */
export function useRealtimeUpdates(caregiverId: string) {
  const [connected, setConnected] = useState(false);
  const [activities, setActivities] = useState<PatientActivity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [patientStatuses, setPatientStatuses] = useState<Map<string, PatientOnlineStatus>>(new Map());

  useEffect(() => {
    if (!caregiverId) return;

    // Connect to WebSocket
    dashboardSocket.connect(caregiverId);

    // Listen for connection status
    const handleConnectionStatus = (status: { connected: boolean }) => {
      setConnected(status.connected);
      if (status.connected) {
        toast.success('Live updates connected');
      } else {
        toast.error('Live updates disconnected');
      }
    };

    // Listen for patient activities
    const handleActivity = (activity: PatientActivity) => {
      setActivities(prev => [activity, ...prev].slice(0, 100)); // Keep last 100

      // Show toast notification
      const activityLabels: Record<string, string> = {
        message_sent: 'sent a message',
        task_completed: 'completed a task',
        medication_taken: 'took medication',
        location_update: 'location updated',
        distress_signal: '🚨 needs help',
        login: 'logged in',
        logout: 'logged out',
      };

      const label = activityLabels[activity.activityType] || activity.activityType;
      toast.info(`${activity.patientName || 'Patient'} ${label}`);
    };

    // Listen for alerts
    const handleAlert = (alert: Alert) => {
      setAlerts(prev => [alert, ...prev]);

      // Show toast based on priority
      const toastFn = alert.priority === 'urgent' || alert.priority === 'high'
        ? toast.error
        : toast.warning;

      toastFn(alert.message, {
        duration: alert.priority === 'urgent' ? 10000 : 5000,
      });
    };

    // Listen for conversations
    const handleConversation = (conversation: Conversation) => {
      setConversations(prev => [conversation, ...prev].slice(0, 50)); // Keep last 50
    };

    // Listen for patient online status
    const handleOnlineStatus = (status: PatientOnlineStatus) => {
      setPatientStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(status.patientId, status);
        return newMap;
      });

      // Optional: toast for status changes
      // toast.info(`${status.patientId} is now ${status.online ? 'online' : 'offline'}`);
    };

    // Register listeners
    dashboardSocket.on('connection_status', handleConnectionStatus);
    dashboardSocket.on('patient:activity', handleActivity);
    dashboardSocket.on('alert:created', handleAlert);
    dashboardSocket.on('conversation:logged', handleConversation);
    dashboardSocket.on('patient:online_status', handleOnlineStatus);

    // Cleanup
    return () => {
      dashboardSocket.off('connection_status', handleConnectionStatus);
      dashboardSocket.off('patient:activity', handleActivity);
      dashboardSocket.off('alert:created', handleAlert);
      dashboardSocket.off('conversation:logged', handleConversation);
      dashboardSocket.off('patient:online_status', handleOnlineStatus);
      dashboardSocket.disconnect();
    };
  }, [caregiverId]);

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const clearConversations = useCallback(() => {
    setConversations([]);
  }, []);

  const isPatientOnline = useCallback((patientId: string): boolean => {
    return patientStatuses.get(patientId)?.online || false;
  }, [patientStatuses]);

  const sendMessageToPatient = useCallback((patientId: string, message: string, caregiverName: string) => {
    dashboardSocket.sendMessageToPatient(patientId, message, caregiverName);
  }, []);

  return {
    connected,
    activities,
    alerts,
    conversations,
    patientStatuses,
    clearActivities,
    clearAlerts,
    clearConversations,
    isPatientOnline,
    sendMessageToPatient,
  };
}

/**
 * Hook for listening to specific patient activities
 */
export function usePatientActivities(patientId?: string) {
  const [activities, setActivities] = useState<PatientActivity[]>([]);

  useEffect(() => {
    const handleActivity = (activity: PatientActivity) => {
      // Filter by patient ID if provided
      if (!patientId || activity.patientId === patientId) {
        setActivities(prev => [activity, ...prev].slice(0, 50));
      }
    };

    dashboardSocket.on('patient:activity', handleActivity);

    return () => {
      dashboardSocket.off('patient:activity', handleActivity);
    };
  }, [patientId]);

  return activities;
}

/**
 * Hook for listening to alerts
 */
export function useAlerts(patientId?: string) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const handleAlert = (alert: Alert) => {
      // Filter by patient ID if provided
      if (!patientId || alert.patientId === patientId) {
        setAlerts(prev => [alert, ...prev]);
      }
    };

    dashboardSocket.on('alert:created', handleAlert);

    return () => {
      dashboardSocket.off('alert:created', handleAlert);
    };
  }, [patientId]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return { alerts, clearAlerts };
}
