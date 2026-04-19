/**
 * useVoiceAssistant Hook
 * Sends voice queries to the backend which uses Claude (Haiku) as primary AI
 * and Gemini Flash as fallback. Maintains session context across queries.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import * as Speech from 'expo-speech';
import * as SecureStore from 'expo-secure-store';
import { Animated } from 'react-native';
import { api } from '../services/api';
import { storage, StorageKeys } from '../storage';

// ── Offline keyword fallback (no network at all) ──────────────────────────────
async function getOfflineResponse(query: string, patientName: string): Promise<string> {
  const lower = query.toLowerCase();
  const now = new Date();

  if (lower.includes('day') || lower.includes('date') || lower.includes('today')) {
    return `Today is ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. You're doing wonderfully, ${patientName}!`;
  }
  if (lower.includes('time')) {
    return `It's ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} right now.`;
  }
  if (lower.includes('who am i') || lower.includes('my name')) {
    return `You are ${patientName}. You are safe and loved!`;
  }
  if (lower.includes('family') || lower.includes('loved')) {
    return `Your family loves you very much, ${patientName}. You can see them in the Loved Ones section.`;
  }
  if (lower.includes('medication') || lower.includes('medicine') || lower.includes('pill')) {
    return `Check your Today's Schedule for medication times. I'll remind you when it's time!`;
  }
  if (lower.includes('help') || lower.includes('emergency')) {
    return `Hold the red emergency button if you need urgent help. Your caretaker will be notified right away.`;
  }
  return `I'm here with you, ${patientName}. How can I help you feel better today?`;
}

// ── Hook ────────────────────────────────────────────────────────────────────
export function useVoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceResponse, setVoiceResponse] = useState('');

  const voiceRecognitionRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Stable session ID — persists across queries within one session
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);

  // Demo queries that simulate what an Alzheimer's patient might ask
  const demoQueries = [
    'What day is it today?',
    'What time is it?',
    'Who am I?',
    'Tell me about my family',
    'When is my next medication?',
    'Where am I?',
    'What should I do now?',
  ];

  // ── Process a single query through the backend ────────────────────────────
  const processQuery = useCallback(async (query: string) => {
    const patientName =
      storage.getString(StorageKeys.PATIENT_NAME) ||
      (await SecureStore.getItemAsync('patient_name')) ||
      'friend';

    setVoiceResponse(`You asked: "${query}"\n\nThinking...`);

    try {
      const result = await api.voiceChat(query, patientName, sessionIdRef.current);
      const reply = result.response;
      setVoiceResponse(`You asked: "${query}"\n\n${reply}`);
      Speech.speak(reply, { language: 'en-IN', rate: 0.85, pitch: 1.0 });
    } catch {
      // Network completely unavailable — use offline keyword fallback
      const fallback = await getOfflineResponse(query, patientName);
      setVoiceResponse(`You asked: "${query}"\n\n${fallback}`);
      Speech.speak(fallback, { language: 'en-IN', rate: 0.85, pitch: 1.0 });
    }
  }, []);

  // ── Start continuous demo listening ───────────────────────────────────────
  const startContinuousListening = useCallback(() => {
    let queryIndex = 0;

    // Process a query every 10 seconds while listening
    voiceRecognitionRef.current = setInterval(async () => {
      const query = demoQueries[queryIndex];
      queryIndex = (queryIndex + 1) % demoQueries.length;
      await processQuery(query);
    }, 10000);

    // Process the first query immediately without waiting 10s
    const firstQuery = demoQueries[0];
    processQuery(firstQuery);
  }, [processQuery]);

  // ── Stop continuous listening ──────────────────────────────────────────────
  const stopContinuousListening = useCallback(() => {
    if (voiceRecognitionRef.current) {
      clearInterval(voiceRecognitionRef.current);
      voiceRecognitionRef.current = null;
    }
    Speech.stop();
  }, []);

  // ── Handle microphone press (toggles listening) ────────────────────────────
  const handleMicrophonePress = useCallback(
    (microphoneScale?: Animated.Value) => {
      const newListeningState = !isListening;
      setIsListening(newListeningState);

      if (microphoneScale) {
        Animated.sequence([
          Animated.timing(microphoneScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
          Animated.spring(microphoneScale, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }),
        ]).start();
      }

      if (newListeningState) {
        setIsProcessingVoice(true);
        setVoiceResponse('Listening... Tap again to stop');
        startContinuousListening();
      } else {
        stopContinuousListening();
        setIsProcessingVoice(false);
        setVoiceResponse('');
      }
    },
    [isListening, startContinuousListening, stopContinuousListening]
  );

  // ── Stop listening convenience alias ─────────────────────────────────────
  const stopListening = useCallback(() => {
    stopContinuousListening();
    setIsListening(false);
    setIsProcessingVoice(false);
    setVoiceResponse('');
  }, [stopContinuousListening]);

  // ── Reset session (new conversation context) ──────────────────────────────
  const resetSession = useCallback(() => {
    sessionIdRef.current = `session_${Date.now()}`;
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => { stopContinuousListening(); };
  }, [stopContinuousListening]);

  return { isListening, isProcessingVoice, voiceResponse, handleMicrophonePress, stopListening, resetSession };
}
