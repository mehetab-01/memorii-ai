/**
 * Memorii Permissions Handler
 *
 * Requests permissions gracefully with user-friendly explanation modals
 * shown BEFORE the system prompt. Remembers permanent denials in MMKV.
 *
 * Camera is requested on demand (at QR scan), microphone on demand (at voice tap).
 * Location (foreground then background) + Notifications are requested on first launch.
 */
import { useState, useEffect, useCallback } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Camera } from 'expo-camera';
import { storage, StorageKeys } from '../storage';

export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'undetermined';

export interface PermissionsState {
  location: PermissionStatus;
  backgroundLocation: PermissionStatus;
  notifications: PermissionStatus;
  camera: PermissionStatus;
  microphone: PermissionStatus;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function openSettings(): void {
  Linking.openSettings().catch(() => {});
}

function showBlockedAlert(permissionName: string, reason: string): void {
  Alert.alert(
    `${permissionName} Permission Needed`,
    `${reason}\n\nPlease go to Settings and enable it for Memorii.`,
    [
      { text: 'Not Now', style: 'cancel' },
      { text: 'Go to Settings', onPress: openSettings },
    ]
  );
}

function showExplanationAlert(title: string, message: string, onContinue: () => void): void {
  Alert.alert(title, message, [
    { text: 'Not Now', style: 'cancel' },
    { text: 'Continue', onPress: onContinue },
  ]);
}

function expoStatusToPermStatus(status: string): PermissionStatus {
  switch (status) {
    case 'granted': return 'granted';
    case 'denied': return 'denied';
    case 'undetermined': return 'undetermined';
    default: return 'denied';
  }
}

// ─── Individual permission requesters ─────────────────────────────────────────

export async function requestLocationPermission(): Promise<PermissionStatus> {
  const blocked = storage.getBoolean(StorageKeys.PERM_LOCATION_DENIED as string);
  if (blocked) {
    showBlockedAlert(
      'Location',
      'Memorii uses your location to keep you safe within your home zone.'
    );
    return 'blocked';
  }

  return new Promise((resolve) => {
    showExplanationAlert(
      'Share Your Location',
      'Memorii monitors your location to make sure you stay safe near home. Your location is only shared with your caretaker.',
      async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        const result = expoStatusToPermStatus(status);
        if (result === 'denied') {
          storage.set(StorageKeys.PERM_LOCATION_DENIED as string, true);
        }
        resolve(result);
      }
    );
  });
}

export async function requestBackgroundLocationPermission(): Promise<PermissionStatus> {
  // Only ask if foreground is already granted
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'denied';

  const blocked = storage.getBoolean(StorageKeys.PERM_BG_LOCATION_DENIED as string);
  if (blocked) {
    showBlockedAlert(
      'Background Location',
      'Memorii needs background location to alert your caretaker if you wander beyond your safe zone.'
    );
    return 'blocked';
  }

  return new Promise((resolve) => {
    showExplanationAlert(
      'Always-On Location',
      'To keep you safe even when the app is in the background, Memorii needs permission to check your location at all times. This only alerts your caretaker — no data is sold or shared.',
      async () => {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        const result = expoStatusToPermStatus(status);
        if (result === 'denied') {
          storage.set(StorageKeys.PERM_BG_LOCATION_DENIED as string, true);
        }
        resolve(result);
      }
    );
  });
}

export async function requestNotificationsPermission(): Promise<PermissionStatus> {
  const blocked = storage.getBoolean(StorageKeys.PERM_NOTIFICATIONS_DENIED as string);
  if (blocked) {
    showBlockedAlert(
      'Notifications',
      'Your caretaker sends reminders for medications and appointments through notifications.'
    );
    return 'blocked';
  }

  return new Promise((resolve) => {
    showExplanationAlert(
      'Enable Reminders',
      'Your caretaker will send you gentle reminders for medications, meals, and appointments. Allow notifications so you never miss them.',
      async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        const result = expoStatusToPermStatus(status);
        if (result === 'denied') {
          storage.set(StorageKeys.PERM_NOTIFICATIONS_DENIED as string, true);
        }
        resolve(result);
      }
    );
  });
}

export async function requestCameraPermission(): Promise<PermissionStatus> {
  const blocked = storage.getBoolean(StorageKeys.PERM_CAMERA_DENIED as string);
  if (blocked) {
    showBlockedAlert(
      'Camera',
      'Camera access is needed to scan your caretaker\'s QR code and connect your account.'
    );
    return 'blocked';
  }

  const { status } = await Camera.requestCameraPermissionsAsync();
  const result = expoStatusToPermStatus(status);
  if (result === 'denied') {
    storage.set(StorageKeys.PERM_CAMERA_DENIED as string, true);
  }
  return result;
}

export async function requestMicrophonePermission(): Promise<PermissionStatus> {
  const blocked = storage.getBoolean(StorageKeys.PERM_MICROPHONE_DENIED as string);
  if (blocked) {
    showBlockedAlert(
      'Microphone',
      'Memorii\'s voice assistant needs microphone access to hear your questions.'
    );
    return 'blocked';
  }

  const { status } = await Camera.requestMicrophonePermissionsAsync();
  const result = expoStatusToPermStatus(status);
  if (result === 'denied') {
    storage.set(StorageKeys.PERM_MICROPHONE_DENIED as string, true);
  }
  return result;
}

// ─── On-launch bundle (location + notifications) ──────────────────────────────

export async function requestAllPermissions(): Promise<PermissionsState> {
  const locationStatus = await requestLocationPermission();
  const backgroundLocationStatus = locationStatus === 'granted'
    ? await requestBackgroundLocationPermission()
    : 'undetermined';
  const notificationsStatus = await requestNotificationsPermission();

  // Check current camera + mic status without prompting
  const camPerm = await Camera.getCameraPermissionsAsync();
  const micPerm = await Camera.getMicrophonePermissionsAsync();

  return {
    location: locationStatus,
    backgroundLocation: backgroundLocationStatus,
    notifications: notificationsStatus,
    camera: expoStatusToPermStatus(camPerm.status),
    microphone: expoStatusToPermStatus(micPerm.status),
  };
}

// ─── usePermissions hook ──────────────────────────────────────────────────────

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionsState>({
    location: 'undetermined',
    backgroundLocation: 'undetermined',
    notifications: 'undetermined',
    camera: 'undetermined',
    microphone: 'undetermined',
  });

  const refresh = useCallback(async () => {
    const [loc, bgLoc, notif, cam, mic] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Location.getBackgroundPermissionsAsync(),
      Notifications.getPermissionsAsync(),
      Camera.getCameraPermissionsAsync(),
      Camera.getMicrophonePermissionsAsync(),
    ]);
    setPermissions({
      location: expoStatusToPermStatus(loc.status),
      backgroundLocation: expoStatusToPermStatus(bgLoc.status),
      notifications: expoStatusToPermStatus(notif.status),
      camera: expoStatusToPermStatus(cam.status),
      microphone: expoStatusToPermStatus(mic.status),
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestCamera = useCallback(async (): Promise<PermissionStatus> => {
    const result = await requestCameraPermission();
    setPermissions(prev => ({ ...prev, camera: result }));
    return result;
  }, []);

  const requestMicrophone = useCallback(async (): Promise<PermissionStatus> => {
    const result = await requestMicrophonePermission();
    setPermissions(prev => ({ ...prev, microphone: result }));
    return result;
  }, []);

  return {
    permissions,
    refresh,
    requestCamera,
    requestMicrophone,
    openSettings,
  };
}
