/**
 * useLocation Hook
 * Extracts all GPS tracking logic from DashboardScreen
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Platform } from 'react-native';
import {
  LOCATION_TASK_NAME,
  GEOFENCE_RADIUS,
  MOVEMENT_THRESHOLD,
  NOTIFICATION_CHANNELS,
} from '../constants/config';
import { socketService } from '../services/socketService';

// ── Background Location Task (must be defined at module level) ──────────────
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];

    if (location) {

      // Check geofence in background
      try {
        const homeLocationStr = await AsyncStorage.getItem('homeLocation');
        const geofenceRadiusStr = await AsyncStorage.getItem('geofenceRadius');

        if (homeLocationStr) {
          const homeLocation = JSON.parse(homeLocationStr);
          const radius = geofenceRadiusStr ? parseInt(geofenceRadiusStr) : GEOFENCE_RADIUS;

          // Calculate distance (Haversine)
          const R = 6371e3;
          const p1 = (homeLocation.latitude * Math.PI) / 180;
          const p2 = (location.coords.latitude * Math.PI) / 180;
          const dp = ((location.coords.latitude - homeLocation.latitude) * Math.PI) / 180;
          const dl = ((location.coords.longitude - homeLocation.longitude) * Math.PI) / 180;

          const a =
            Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;

          // Send alert if outside geofence
          if (distance > radius) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Safety Alert',
                body: `You are ${Math.round(distance)}m from home (outside safe zone)`,
                sound: 'default',
                channelId: NOTIFICATION_CHANNELS.emergency,
              } as any,
              trigger: null,
            });
          }
        }
      } catch (err) {
        console.error('Background geofence check error:', err);
      }
    }
  }
});

// ── Types ───────────────────────────────────────────────────────────────────
interface HomeLocation {
  latitude: number;
  longitude: number;
}

interface LocationHistoryEntry {
  latitude: number;
  longitude: number;
  timestamp: string;
  address: string;
}

type GpsStatus = 'inactive' | 'tracking';

// ── Hook ────────────────────────────────────────────────────────────────────
export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [distanceFromHome, setDistanceFromHome] = useState(0);
  const [geofenceRadius, setGeofenceRadius] = useState(GEOFENCE_RADIUS);
  const [locationAddress, setLocationAddress] = useState('Fetching location...');
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('inactive');
  const [locationHistory, setLocationHistory] = useState<LocationHistoryEntry[]>([]);

  const lastLocationRef = useRef<Location.LocationObject | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Haversine distance ──────────────────────────────────────────────────
  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3; // Earth radius in metres
      const p1 = (lat1 * Math.PI) / 180;
      const p2 = (lat2 * Math.PI) / 180;
      const dp = ((lat2 - lat1) * Math.PI) / 180;
      const dl = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(dp / 2) * Math.sin(dp / 2) +
        Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    },
    []
  );

  // ── Reverse geocode ─────────────────────────────────────────────────────
  const reverseGeocode = useCallback(async (latitude: number, longitude: number): Promise<string> => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results && results.length > 0) {
        const addr = results[0];
        const formatted = `${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
        setLocationAddress(formatted || 'Unknown location');
        return formatted || 'Unknown location';
      }
      return 'Unknown location';
    } catch (error) {
      console.error('Reverse geocode error:', error);
      setLocationAddress('Unable to get address');
      return 'Unable to get address';
    }
  }, []);

  // ── Save location to history ────────────────────────────────────────────
  const saveLocationToHistory = useCallback(
    async (newLocation: Location.LocationObject) => {
      try {
        const timestamp = new Date().toISOString();
        const historyEntry: LocationHistoryEntry = {
          latitude: newLocation.coords.latitude,
          longitude: newLocation.coords.longitude,
          timestamp,
          address: locationAddress,
        };

        const existingHistory = await AsyncStorage.getItem('locationHistory');
        let history: LocationHistoryEntry[] = existingHistory
          ? JSON.parse(existingHistory)
          : [];

        history.push(historyEntry);
        if (history.length > 100) {
          history = history.slice(-100);
        }

        await AsyncStorage.setItem('locationHistory', JSON.stringify(history));
        setLocationHistory(history);
      } catch (error) {
        console.error('Error saving location history:', error);
      }
    },
    [locationAddress]
  );

  // ── Send caretaker alert ────────────────────────────────────────────────
  const sendCaretakerAlert = useCallback(
    async (
      type: string,
      message: string,
      locationData: {
        latitude: number;
        longitude: number;
        address: string;
        distanceFromHome?: number;
      }
    ) => {
      try {
        // 1. Send Local Notification to Patient App (with smartwatch support)
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Safety Alert',
            body: message,
            sound: 'default',
            channelId: NOTIFICATION_CHANNELS.alerts,
          } as any,
          trigger: null,
        });

        // 2. Get caretaker info from AsyncStorage
        const caretakerCode = await AsyncStorage.getItem('caretakerCode');
        const profileData = await AsyncStorage.getItem('profileData');

        if (caretakerCode && profileData) {
          const profile = JSON.parse(profileData);
          const emergencyContact = profile.emergencyContact;

          // 3. Send SMS (would require backend API in production)
          const smsMessage = `${message}\nPatient: ${profile.name}\nLocation: ${locationData.address}\nCoordinates: ${locationData.latitude}, ${locationData.longitude}\nCaretaker Code: ${caretakerCode}`;

          // Open SMS app with pre-filled message
          if (emergencyContact) {
            const smsUrl = `sms:${emergencyContact}?body=${encodeURIComponent(smsMessage)}`;
            await Linking.openURL(smsUrl);
          }

          // 4. Send WhatsApp Alert (opens WhatsApp with pre-filled message)
          const whatsappMessage = `*Safety Alert*\n\n${message}\n\n*Patient:* ${profile.name}\n*Location:* ${locationData.address}\n*GPS:* ${locationData.latitude}, ${locationData.longitude}\n*Time:* ${new Date().toLocaleString()}`;
          const whatsappUrl = `whatsapp://send?phone=${emergencyContact}&text=${encodeURIComponent(whatsappMessage)}`;

          setTimeout(() => {
            Linking.canOpenURL(whatsappUrl).then(supported => {
              if (supported) {
                Linking.openURL(whatsappUrl);
              }
            });
          }, 2000);

          // 5. Send to Backend (Web App Notification) - Log for now
          console.log('Sending to Backend API:', {
            type,
            caretakerCode,
            patientName: profile.name,
            message,
            location: locationData,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Alert sending error:', error);
      }
    },
    []
  );

  // ── Check geofence breach ──────────────────────────────────────────────
  const checkGeofenceBreach = useCallback(
    async (currentLat: number, currentLon: number) => {
      if (!homeLocation) return;

      const distance = calculateDistance(
        homeLocation.latitude,
        homeLocation.longitude,
        currentLat,
        currentLon
      );

      setDistanceFromHome(Math.round(distance));

      if (distance > geofenceRadius) {
        const address = await Location.reverseGeocodeAsync({
          latitude: currentLat,
          longitude: currentLon,
        });

        const locationData = {
          latitude: currentLat,
          longitude: currentLon,
          address: address[0] ? `${address[0].street}, ${address[0].city}` : 'Unknown',
          distanceFromHome: Math.round(distance),
        };

        await sendCaretakerAlert(
          'geofence_breach',
          `Patient has moved ${Math.round(distance)}m from home location (beyond ${geofenceRadius}m safety zone)`,
          locationData
        );
      }
    },
    [homeLocation, geofenceRadius, calculateDistance, sendCaretakerAlert]
  );

  // ── Load location history ──────────────────────────────────────────────
  const loadLocationHistory = useCallback(async () => {
    try {
      const history = await AsyncStorage.getItem('locationHistory');
      if (history) {
        setLocationHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading location history:', error);
    }
  }, []);

  // ── Start GPS tracking ─────────────────────────────────────────────────
  const startGPSTracking = useCallback(async () => {
    if (isTracking) return;

    setIsTracking(true);
    setGpsStatus('tracking');

    // Show persistent notification for background location
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Location Tracking Active',
        body: 'Memorii is keeping you safe by monitoring your location',
        sound: false,
        channelId: NOTIFICATION_CHANNELS.alerts,
        sticky: true,
      } as any,
      trigger: null,
    });

    // Start Background Location Updates
    try {
      const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
      if (!isTaskDefined) {
        console.log('Background task not defined, using foreground tracking only');
      } else {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (!hasStarted) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.High,
            timeInterval: 60000,
            distanceInterval: 10,
            foregroundService: {
              notificationTitle: 'Memorii Safety Tracking',
              notificationBody: 'Your location is being monitored for safety',
              notificationColor: '#4F46E5',
            },
          });
          console.log('Background location updates started');
        }
      }
    } catch (error) {
      console.error('Error starting background location:', error);
    }

    // Clear any existing interval
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
    }

    // Start foreground location tracking as backup
    locationIntervalRef.current = setInterval(async () => {
      try {
        const newLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setLocation(newLocation);
        await reverseGeocode(newLocation.coords.latitude, newLocation.coords.longitude);

        // Save to location history for route tracking
        await saveLocationToHistory(newLocation);

        // Check if user is moving
        if (lastLocationRef.current) {
          const distanceMoved = calculateDistance(
            lastLocationRef.current.coords.latitude,
            lastLocationRef.current.coords.longitude,
            newLocation.coords.latitude,
            newLocation.coords.longitude
          );

          if (distanceMoved > MOVEMENT_THRESHOLD) {
            setIsMoving(true);
          } else {
            setIsMoving(false);
          }
        }

        // Check geofence
        await checkGeofenceBreach(newLocation.coords.latitude, newLocation.coords.longitude);

        lastLocationRef.current = newLocation;
      } catch (error) {
        console.error('Location update error:', error);
      }
    }, 60000); // Check every minute
  }, [
    isTracking,
    reverseGeocode,
    saveLocationToHistory,
    calculateDistance,
    checkGeofenceBreach,
  ]);

  // ── Stop GPS tracking ──────────────────────────────────────────────────
  const stopGPSTracking = useCallback(async () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }

    // Stop background location updates
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log('Background location updates stopped');
      }
    } catch (error) {
      console.error('Error stopping background location:', error);
    }

    setIsTracking(false);
    setGpsStatus('inactive');
  }, []);

  // ── Set current location as home ───────────────────────────────────────
  const setCurrentAsHome = useCallback(async () => {
    if (!location) {
      Alert.alert('No Location', 'Please wait while we fetch your current location');
      return;
    }

    const homeData: HomeLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    await AsyncStorage.setItem('homeLocation', JSON.stringify(homeData));
    setHomeLocation(homeData);
    setDistanceFromHome(0);

    Alert.alert('Home Location Set', 'Your current location is now set as home');
  }, [location]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, []);

  return {
    // State
    location,
    setLocation,
    homeLocation,
    setHomeLocation,
    isTracking,
    isMoving,
    distanceFromHome,
    geofenceRadius,
    setGeofenceRadius,
    locationAddress,
    setLocationAddress,
    gpsStatus,
    locationHistory,
    lastLocationRef,

    // Functions
    startGPSTracking,
    stopGPSTracking,
    setCurrentAsHome,
    loadLocationHistory,
    calculateDistance,
    reverseGeocode,
    saveLocationToHistory,
    checkGeofenceBreach,
    sendCaretakerAlert,
  };
}
