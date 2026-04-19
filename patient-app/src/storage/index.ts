/**
 * Memorii Storage Layer
 *
 * Uses AsyncStorage (sync-style wrappers via a synchronous in-memory cache).
 * MMKV was removed — it requires a custom native build and crashed on Expo Go / emulator.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── In-memory sync cache (populated lazily) ──────────────────────────────────
const memCache: Record<string, string> = {};

export const StorageKeys = {
  // Auth / Setup
  THEME: 'app:theme',
  SETUP_COMPLETE: 'app:setupComplete',
  FONT_SCALE: 'app:fontScale',

  // Patient identity
  PATIENT_ID: 'app:patientId',
  PATIENT_NAME: 'app:patientName',
  PATIENT_PHOTO: 'app:patientPhoto',

  // Location
  LAST_KNOWN_LOCATION: 'app:lastLocation',
  GEOFENCE_RADIUS: 'app:geofenceRadius',
  HOME_LOCATION: 'app:homeLocation',

  // Emergency
  EMERGENCY_CONTACT: 'app:emergencyContact',

  // Daily stats (reset at midnight)
  WATER_COUNT: 'app:waterCount',
  WALKING_MINUTES: 'app:walkingMinutes',
  MEDS_TAKEN: 'app:medsTaken',
  DAILY_STATS_DATE: 'app:dailyStatsDate',

  // API cache (JSON stringified)
  REMINDERS_CACHE: 'app:remindersCache',
  REMINDERS_CACHE_TS: 'app:remindersCacheTs',
  FAMILY_CACHE: 'app:familyCache',
  FAMILY_CACHE_TS: 'app:familyCacheTs',
  PROFILE_CACHE: 'app:profileCache',
  PROFILE_CACHE_TS: 'app:profileCacheTs',

  // Voice assistant
  VOICE_HISTORY: 'app:voiceHistory',

  // Offline queue (JSON array)
  OFFLINE_QUEUE: 'app:offlineQueue',

  // Permissions (track permanent denial)
  PERM_LOCATION_DENIED: 'app:permLocationDenied',
  PERM_BG_LOCATION_DENIED: 'app:permBgLocationDenied',
  PERM_NOTIFICATIONS_DENIED: 'app:permNotifDenied',
  PERM_CAMERA_DENIED: 'app:permCameraDenied',
  PERM_MICROPHONE_DENIED: 'app:permMicDenied',
} as const;

export type StorageKey = typeof StorageKeys[keyof typeof StorageKeys];

// Cache TTL in milliseconds
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,
  MEDIUM: 30 * 60 * 1000,
  LONG: 24 * 60 * 60 * 1000,
} as const;

// ─── Async persistence helpers ────────────────────────────────────────────────

async function persist(key: string, value: string): Promise<void> {
  memCache[key] = value;
  await AsyncStorage.setItem(key, value);
}

async function load(key: string): Promise<string | null> {
  if (key in memCache) return memCache[key];
  const val = await AsyncStorage.getItem(key);
  if (val != null) memCache[key] = val;
  return val;
}

async function remove(key: string): Promise<void> {
  delete memCache[key];
  await AsyncStorage.removeItem(key);
}

/** Preload all keys into the in-memory cache. Call once at app startup. */
export async function initStorage(): Promise<void> {
  const allKeys = Object.values(StorageKeys);
  const pairs = await AsyncStorage.multiGet(allKeys);
  for (const [k, v] of pairs) {
    if (v != null) memCache[k] = v;
  }
}

// ─── Typed helpers ────────────────────────────────────────────────────────────

export function mmkvGet<T>(key: StorageKey): T | null {
  try {
    const raw = memCache[key];
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function mmkvGetAsync<T>(key: StorageKey): Promise<T | null> {
  try {
    const raw = await load(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function mmkvSet<T>(key: StorageKey, value: T): void {
  try {
    persist(key, JSON.stringify(value));
  } catch {}
}

export function mmkvDelete(key: StorageKey): void {
  try {
    remove(key);
  } catch {}
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

export function setCached<T>(dataKey: StorageKey, tsKey: StorageKey, data: T): void {
  mmkvSet(dataKey, data);
  mmkvSet(tsKey, Date.now());
}

export function getCached<T>(
  dataKey: StorageKey,
  tsKey: StorageKey,
  ttl: number
): T | null {
  const ts = mmkvGet<number>(tsKey);
  if (!ts || Date.now() - ts > ttl) return null;
  return mmkvGet<T>(dataKey);
}

// ─── Daily stats (auto-reset at midnight) ────────────────────────────────────

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function checkAndResetDailyStats(): void {
  const lastDate = memCache[StorageKeys.DAILY_STATS_DATE];
  const today = todayString();
  if (lastDate !== today) {
    mmkvSet(StorageKeys.WATER_COUNT, '0');
    mmkvSet(StorageKeys.WALKING_MINUTES, '0');
    mmkvSet(StorageKeys.MEDS_TAKEN, '0');
    mmkvSet(StorageKeys.DAILY_STATS_DATE, today);
  }
}

export function getDailyStats(): { water: number; walking: number; meds: number } {
  checkAndResetDailyStats();
  return {
    water: parseInt(mmkvGet<string>(StorageKeys.WATER_COUNT) ?? '0', 10),
    walking: parseInt(mmkvGet<string>(StorageKeys.WALKING_MINUTES) ?? '0', 10),
    meds: parseInt(mmkvGet<string>(StorageKeys.MEDS_TAKEN) ?? '0', 10),
  };
}

export function incrementDailyStat(key: 'water' | 'walking' | 'meds', by = 1): number {
  checkAndResetDailyStats();
  const storageKey = {
    water: StorageKeys.WATER_COUNT,
    walking: StorageKeys.WALKING_MINUTES,
    meds: StorageKeys.MEDS_TAKEN,
  }[key] as StorageKey;
  const current = parseInt(mmkvGet<string>(storageKey) ?? '0', 10);
  const next = current + by;
  mmkvSet(storageKey, String(next));
  return next;
}

// ─── Voice history (last 5 queries) ──────────────────────────────────────────

export interface VoiceEntry {
  query: string;
  response: string;
  provider: string;
  ts: number;
}

export function getVoiceHistory(): VoiceEntry[] {
  return mmkvGet<VoiceEntry[]>(StorageKeys.VOICE_HISTORY) ?? [];
}

export function appendVoiceHistory(entry: VoiceEntry): void {
  const history = getVoiceHistory();
  const updated = [entry, ...history].slice(0, 5);
  mmkvSet(StorageKeys.VOICE_HISTORY, updated);
}

// ─── Offline queue ────────────────────────────────────────────────────────────

export interface OfflineAction {
  id: string;
  type: 'complete_reminder' | 'update_stat' | 'sos_fired';
  payload: Record<string, unknown>;
  ts: number;
}

export function getOfflineQueue(): OfflineAction[] {
  return mmkvGet<OfflineAction[]>(StorageKeys.OFFLINE_QUEUE) ?? [];
}

export function enqueueOfflineAction(action: Omit<OfflineAction, 'id' | 'ts'>): void {
  const queue = getOfflineQueue();
  queue.push({ ...action, id: Math.random().toString(36).slice(2), ts: Date.now() });
  mmkvSet(StorageKeys.OFFLINE_QUEUE, queue);
}

export function clearOfflineQueue(): void {
  mmkvSet(StorageKeys.OFFLINE_QUEUE, []);
}
