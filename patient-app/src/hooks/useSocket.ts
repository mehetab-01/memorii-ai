/**
 * React Hook for WebSocket
 * Provides easy access to WebSocket functionality in React components
 */

import { useEffect, useState, useCallback } from 'react';
import { socketService } from '../services/socketService';

/**
 * Hook for WebSocket connection and real-time updates
 */
export function useSocket() {
  const [connected, setConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    // Initialize socket connection
    socketService.initialize();

    // Listen for connection status changes
    const handleConnectionStatus = (status: { connected: boolean }) => {
      setConnected(status.connected);
    };

    socketService.on('connection_status', handleConnectionStatus);

    // Cleanup on unmount
    return () => {
      socketService.off('connection_status', handleConnectionStatus);
      // Don't disconnect here - keep connection alive across components
    };
  }, []);

  // Get connection status
  const isConnected = useCallback(() => {
    return connected;
  }, [connected]);

  // Send message
  const sendMessage = useCallback((message: string) => {
    socketService.sendMessage(message);
  }, []);

  // Complete task
  const completeTask = useCallback((taskId: string) => {
    socketService.completeTask(taskId);
  }, []);

  // Send location
  const sendLocation = useCallback((location: { latitude: number; longitude: number; address?: string }) => {
    socketService.sendLocationUpdate(location);
  }, []);

  // Send distress signal
  const sendDistress = useCallback((type: string, message: string) => {
    socketService.sendDistressSignal(type, message);
  }, []);

  // Log medication
  const logMedication = useCallback((medicationId: string, notes: string) => {
    socketService.logMedicationTaken(medicationId, notes);
  }, []);

  return {
    connected,
    isConnected,
    sendMessage,
    completeTask,
    sendLocation,
    sendDistress,
    logMedication,
    lastMessage,
  };
}

/**
 * Hook for listening to specific WebSocket events
 */
export function useSocketEvent(eventName: string, callback: (data: any) => void) {
  useEffect(() => {
    socketService.on(eventName, callback);

    return () => {
      socketService.off(eventName, callback);
    };
  }, [eventName, callback]);
}

/**
 * Hook for AI responses
 */
export function useAIResponses() {
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(() => {
    const handleAIResponse = (data: any) => {
      setResponses(prev => [...prev, data]);
    };

    socketService.on('ai:response', handleAIResponse);

    return () => {
      socketService.off('ai:response', handleAIResponse);
    };
  }, []);

  return responses;
}

/**
 * Hook for reminders
 */
export function useReminders() {
  const [reminders, setReminders] = useState<any[]>([]);

  useEffect(() => {
    const handleReminder = (data: any) => {
      setReminders(prev => [...prev, data]);
    };

    socketService.on('reminder:due', handleReminder);

    return () => {
      socketService.off('reminder:due', handleReminder);
    };
  }, []);

  const clearReminders = useCallback(() => {
    setReminders([]);
  }, []);

  return { reminders, clearReminders };
}

/**
 * Hook for medication reminders
 */
export function useMedicationReminders() {
  const [medications, setMedications] = useState<any[]>([]);

  useEffect(() => {
    const handleMedication = (data: any) => {
      setMedications(prev => [...prev, data]);
    };

    socketService.on('medication:reminder', handleMedication);

    return () => {
      socketService.off('medication:reminder', handleMedication);
    };
  }, []);

  const clearMedications = useCallback(() => {
    setMedications([]);
  }, []);

  return { medications, clearMedications };
}

/**
 * Hook for family messages
 */
export function useFamilyMessages() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const handleMessage = (data: any) => {
      setMessages(prev => [...prev, data]);
    };

    socketService.on('family:message', handleMessage);

    return () => {
      socketService.off('family:message', handleMessage);
    };
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, clearMessages };
}
