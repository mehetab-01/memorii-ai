import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, STORAGE_KEYS } from '../constants/config';

async function getPatientId(): Promise<string | null> {
  try {
    const id = await SecureStore.getItemAsync(STORAGE_KEYS.PATIENT_ID);
    if (id) return id;
    return await AsyncStorage.getItem('patientId');
  } catch {
    return null;
  }
}

async function fetchJSON(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export const api = {
  async getPatientProfile() {
    const patientId = await getPatientId();
    if (!patientId) return null;
    return fetchJSON(`${API_BASE_URL}/patient/${patientId}/profile`);
  },

  async getDailyStats() {
    const patientId = await getPatientId();
    if (!patientId) return null;
    return fetchJSON(`${API_BASE_URL}/patient/${patientId}/daily-stats`);
  },

  async getTodaySchedule() {
    const patientId = await getPatientId();
    if (!patientId) return null;
    return fetchJSON(`${API_BASE_URL}/patient/${patientId}/schedule/today`);
  },

  async updateDailyStats(
    statsOrPatientId: { waterGlasses?: number; walkingTimes?: number; medicinesTaken?: number } | string,
    statsArg?: Record<string, number>
  ) {
    let patientId: string | null;
    let stats: Record<string, unknown>;
    if (typeof statsOrPatientId === 'string') {
      patientId = statsOrPatientId;
      stats = statsArg ?? {};
    } else {
      patientId = await getPatientId();
      stats = statsOrPatientId;
    }
    if (!patientId) return null;
    return fetchJSON(`${API_BASE_URL}/patient/${patientId}/daily-stats`, {
      method: 'PUT',
      body: JSON.stringify(stats),
    });
  },

  async completeScheduleItem(itemIdOrPatientId: string, itemIdArg?: string) {
    // Two call signatures:
    // completeScheduleItem(itemId)              — resolves patientId from SecureStore
    // completeScheduleItem(patientId, itemId)   — explicit patientId (used by offline queue)
    let patientId: string | null;
    let itemId: string;
    if (itemIdArg !== undefined) {
      patientId = itemIdOrPatientId;
      itemId = itemIdArg;
    } else {
      patientId = await getPatientId();
      itemId = itemIdOrPatientId;
    }
    if (!patientId) return null;
    return fetchJSON(`${API_BASE_URL}/patient/${patientId}/schedule/${itemId}/complete`, {
      method: 'PUT',
    });
  },

  async sendSOS(data: {
    type: string;
    patientName: string;
    caretakerCode?: string;
    caretakerPhone?: string;
    caretakerName?: string;
    message: string;
    location: { latitude: number; longitude: number; address?: string };
    timestamp: string;
  }) {
    return fetchJSON(`${API_BASE_URL}/emergency/sos`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async chatWithAI(message: string, conversationHistory?: any[]) {
    const patientId = await getPatientId();
    return fetchJSON(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      body: JSON.stringify({ patientId, message, conversationHistory }),
    });
  },

  async voiceChat(message: string, patientName: string, sessionId?: string): Promise<{ response: string; provider: string; sessionId?: string }> {
    return fetchJSON(`${API_BASE_URL}/ai/voice`, {
      method: 'POST',
      body: JSON.stringify({ message, patientName, sessionId }),
    });
  },
};
