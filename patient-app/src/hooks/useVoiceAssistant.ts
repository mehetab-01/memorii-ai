/**
 * useVoiceAssistant Hook
 * Sends voice queries to the backend which uses Claude (Haiku) as primary AI
 * and Gemini Flash as fallback. Maintains session context across queries.
 * 
 * Designed for Alzheimer's patients with offline fallback support
 * Ensures compassionate, supportive responses with repetition handling
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import * as Speech from 'expo-speech';
import * as SecureStore from 'expo-secure-store';
import { Animated } from 'react-native';
import { api } from '../services/api';
import { storage, StorageKeys } from '../storage';

// ── Offline keyword fallback (no network at all) ──────────────────────────────
// Comprehensive offline responses following Alzheimer's care guidelines
async function getOfflineResponse(query: string, patientName: string): Promise<string> {
  const lower = query.toLowerCase();
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // ── IDENTITY RESPONSES ──
  if (lower.includes('who am i') || lower.includes('my name') || lower.includes('what is my name')) {
    return `You are ${patientName}. You are safe and at home. Everything is okay.`;
  }

  if (lower.includes('where am i') || lower.includes('where am') || lower.includes('location')) {
    return `You are at your home. This is a safe place. You are not alone. I am here with you.`;
  }

  // ── CONFUSION & ANXIETY ──
  if (lower.includes('confused') || lower.includes('confused') || lower.includes('lost') || lower.includes('disoriented')) {
    return `It's okay to feel confused, ${patientName}. That's alright. I'm here with you. You are safe. You are at home with people who care about you.`;
  }

  if (lower.includes('scared') || lower.includes('afraid') || lower.includes('frightened') || lower.includes('anxious')) {
    return `You are safe, ${patientName}. There is nothing to worry about. I am here with you. Take a deep breath. Everything is alright.`;
  }

  if (lower.includes('help') || lower.includes('assist')) {
    return `I'm here to help you, ${patientName}. You are safe. Tell me what you need, and I will guide you. You are not alone.`;
  }

  if (lower.includes('lost')) {
    return `It's okay, ${patientName}. You are safe. You are at home. Help is available if you need it. I am here with you.`;
  }

  // ── TIME & DATE ──
  if (lower.includes('what time') || lower.includes('what is the time') || lower.includes('time now') || lower.includes('current time')) {
    return `It's okay, ${patientName}. The time is ${currentTime} right now. You are doing well.`;
  }

  if (lower.includes('what day') || lower.includes('what is the day') || lower.includes('today') || lower.includes('current day') || lower.includes('date')) {
    return `Today is ${currentDay}, ${patientName}. You are doing wonderfully. Everything is okay.`;
  }

  // ── FAMILY & LOVED ONES ──
  if (lower.includes('family') || lower.includes('loved ones') || lower.includes('my family') || lower.includes('loved') || lower.includes('children') || lower.includes('grandchildren')) {
    return `Your family loves you very much, ${patientName}. They care about you deeply and are nearby. You can see them in the Loved Ones section on your screen. You are never alone.`;
  }

  if (lower.includes('lonely') || lower.includes('alone') || lower.includes('need company')) {
    return `You are not alone, ${patientName}. I am here with you. Your loved ones care about you and think about you. You are surrounded by care and support.`;
  }

  // ── MEDICATION ──
  if (lower.includes('medication') || lower.includes('medicine') || lower.includes('pill') || lower.includes('tablets') || lower.includes('when do i take')) {
    return `It's okay, ${patientName}. Your medicine schedule is taken care of. Check the Today's Schedule on your screen to see your medication times. I will remind you gently when it's time. Don't worry.`;
  }

  // ── ACTIVITIES & DAILY TASKS ──
  if (lower.includes('what should i do') || lower.includes('what can i do') || lower.includes('bored') || lower.includes('activity')) {
    return `You can relax, ${patientName}. Maybe sit comfortably, have some water, or look at photos of your loved ones. Your schedule shows helpful activities. Take your time. Everything is okay.`;
  }

  if (lower.includes('breakfast') || lower.includes('lunch') || lower.includes('dinner') || lower.includes('eat') || lower.includes('food') || lower.includes('hungry')) {
    return `That's a good idea, ${patientName}. Let's check your schedule to see meal times. Make sure you have water nearby. You are doing great taking care of yourself.`;
  }

  // ── REPETITION HANDLING ──
  if (lower.includes('again') || lower.includes('repeat') || lower.includes('say again') || lower.includes('what did you say')) {
    return `That's okay, ${patientName}. I'm happy to help you again. You are safe. What would you like to know?`;
  }

  // ── EMERGENCY/URGENT ──
  if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('pain') || lower.includes('hurt')) {
    return `If you are in pain or need urgent help, press the red emergency button on your screen right now. Your caretaker will be notified immediately and will help you right away. You are safe.`;
  }

  // ── REASSURANCE ──
  if (lower.includes('okay') || lower.includes('alright') || lower.includes('fine')) {
    return `I'm glad you're feeling okay, ${patientName}. You are safe and doing well. I am here if you need anything. Everything is alright.`;
  }

  // ── GREETINGS ──
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('good morning') || lower.includes('good afternoon') || lower.includes('good evening')) {
    return `Hello, ${patientName}! I'm so glad you're here. You are safe and cared for. How can I help you today?`;
  }

  // ── DEFAULT COMPASSIONATE RESPONSE ──
  return `I'm here with you, ${patientName}. You are safe and loved. Tell me what's on your mind, and I'll do my best to help you feel better. Everything is okay.`;
}

// ── Hook ────────────────────────────────────────────────────────────────────
export function useVoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceResponse, setVoiceResponse] = useState('');
  const [queryHistory, setQueryHistory] = useState<Array<{ query: string; response: string }>>([]);

  const voiceRecognitionRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Stable session ID — persists across queries within one session
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);

  // Compassionate demo queries that simulate what an Alzheimer's patient might ask
  const demoQueries = [
    'Who am I?',
    'Where am I?',
    'What time is it?',
    'What day is today?',
    'Tell me about my family',
    'When is my medication?',
    'I feel scared, help me',
    'What should I do?',
    'Am I safe?',
    'Are my loved ones nearby?',
  ];

  // ── Process a single query through the backend with fallback to offline ────
  const processQuery = useCallback(async (query: string) => {
    const patientName =
      storage.getString(StorageKeys.PATIENT_NAME) ||
      (await SecureStore.getItemAsync('patient_name')) ||
      'friend';

    setVoiceResponse(`You asked: "${query}"\n\nThinking...`);

    try {
      // Try to connect to backend with Gemini API
      const result = await api.voiceChat(query, patientName, sessionIdRef.current);
      const reply = result.response;
      
      setVoiceResponse(`You asked: "${query}"\n\n${reply}`);
      setQueryHistory(prev => [...prev, { query, response: reply }]);
      
      // Speak the response with compassionate tone
      Speech.speak(reply, { 
        language: 'en-IN', 
        rate: 0.85, 
        pitch: 1.0,
        onDone: () => {
          // Keep listening for follow-up questions
        }
      });
    } catch (error) {
      // Network unavailable or API error — use offline keyword fallback
      // This ensures the patient still gets a caring, supportive response
      const fallback = await getOfflineResponse(query, patientName);
      
      setVoiceResponse(`You asked: "${query}"\n\n${fallback}`);
      setQueryHistory(prev => [...prev, { query, response: fallback }]);
      
      // Speak the offline response with compassionate tone
      Speech.speak(fallback, { 
        language: 'en-IN', 
        rate: 0.85, 
        pitch: 1.0,
        onDone: () => {
          // Keep listening for follow-up questions
        }
      });
    }
  }, []);

  // ── Start continuous demo listening ───────────────────────────────────────
  // This simulates real voice input for demo/testing
  const startContinuousListening = useCallback(() => {
    let queryIndex = 0;

    // Process a query every 12 seconds while listening (compassionate pacing)
    voiceRecognitionRef.current = setInterval(async () => {
      const query = demoQueries[queryIndex];
      queryIndex = (queryIndex + 1) % demoQueries.length;
      await processQuery(query);
    }, 12000);

    // Process the first query immediately without waiting
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

  // ── Handle direct user query (not just demo) ─────────────────────────────
  const handleUserQuery = useCallback(async (userInput: string) => {
    if (!userInput.trim()) {
      setVoiceResponse('Please tell me what you need, and I will help you.');
      return;
    }
    
    setIsProcessingVoice(true);
    await processQuery(userInput);
    setIsProcessingVoice(false);
  }, [processQuery]);

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
        setVoiceResponse('Listening... I am here with you. You are safe. Tap again to stop.');
        startContinuousListening();
      } else {
        stopContinuousListening();
        setIsProcessingVoice(false);
        // Don't clear response immediately — let patient read it
      }
    },
    [isListening, startContinuousListening, stopContinuousListening]
  );

  // ── Stop listening convenience alias ─────────────────────────────────────
  const stopListening = useCallback(() => {
    stopContinuousListening();
    setIsListening(false);
    setIsProcessingVoice(false);
    // Keep response visible for patient to read
  }, [stopContinuousListening]);

  // ── Clear response ──────────────────────────────────────────────────────
  const clearResponse = useCallback(() => {
    setVoiceResponse('');
  }, []);

  // ── Reset session (new conversation context) ──────────────────────────────
  const resetSession = useCallback(() => {
    sessionIdRef.current = `session_${Date.now()}`;
    setQueryHistory([]);
  }, []);

  // ── Get conversation history (for context awareness) ────────────────────
  const getConversationHistory = useCallback(() => {
    return queryHistory;
  }, [queryHistory]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => { stopContinuousListening(); };
  }, [stopContinuousListening]);

  return { 
    isListening, 
    isProcessingVoice, 
    voiceResponse, 
    handleMicrophonePress, 
    stopListening, 
    resetSession,
    handleUserQuery,
    clearResponse,
    getConversationHistory,
    queryHistory
  };
}
