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
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    socketService.initialize();

    // Listen for connection status changes
    const handleConnectionStatus = (status) => {
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
  const sendMessage = useCallback((message) => {
    socketService.sendMessage(message);
  }, []);

  // Complete task
  const completeTask = useCallback((taskId) => {
    socketService.completeTask(taskId);
  }, []);

  // Send location
  const sendLocation = useCallback((location) => {
    socketService.sendLocationUpdate(location);
  }, []);

  // Send distress signal
  const sendDistress = useCallback((type, message) => {
    socketService.sendDistressSignal(type, message);
  }, []);

  // Log medication
  const logMedication = useCallback((medicationId, notes) => {
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
export function useSocketEvent(eventName, callback) {
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
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    const handleAIResponse = (data) => {
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
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    const handleReminder = (data) => {
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
  const [medications, setMedications] = useState([]);

  useEffect(() => {
    const handleMedication = (data) => {
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
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const handleMessage = (data) => {
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
