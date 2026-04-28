import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  Dimensions,
  Image,
  Switch,
  Alert,
  Linking,
  PanResponder,
  FlatList,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { socketService } from '../services/socketService';

const { width, height } = Dimensions.get('window');

// Color Themes
const THEMES = {
  light: {
    background: '#F5F7FA',
    cardBackground: '#FFFFFF',
    primaryText: '#1A1A2E',
    secondaryText: '#6B7280',
    accent: '#4F46E5',
    accentLight: '#818CF8',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    border: '#E5E7EB',
    shadow: 'rgba(0, 0, 0, 0.1)',
    gradient1: '#667EEA',
    gradient2: '#764BA2',
    micGradient1: '#4F46E5',
    micGradient2: '#7C3AED',
  },
  dark: {
    background: '#0F172A',
    cardBackground: '#1E293B',
    primaryText: '#F8FAFC',
    secondaryText: '#94A3B8',
    accent: '#818CF8',
    accentLight: '#A5B4FC',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    border: '#334155',
    shadow: 'rgba(0, 0, 0, 0.3)',
    gradient1: '#4C1D95',
    gradient2: '#5B21B6',
    micGradient1: '#6366F1',
    micGradient2: '#8B5CF6',
  },
};

// Mock Data: Family Members (initial data - will be loaded from storage)
const INITIAL_FAMILY_MEMBERS = [
  {
    id: '1',
    name: 'Sarah',
    relation: 'daughter',
    imageUrl: 'https://i.pravatar.cc/300?img=1',
    media: [], // Array of { uri, type: 'image' | 'video', thumbnail? }
  },
  {
    id: '2',
    name: 'Michael',
    relation: 'son',
    imageUrl: 'https://i.pravatar.cc/300?img=12',
    media: [],
  },
  {
    id: '3',
    name: 'Emma',
    relation: 'granddaughter',
    imageUrl: 'https://i.pravatar.cc/300?img=5',
    media: [],
  },
  {
    id: '4',
    name: 'Robert',
    relation: 'brother',
    imageUrl: 'https://i.pravatar.cc/300?img=15',
    media: [],
  },
];

// GPS Tracking Configuration
const LOCATION_TASK_NAME = 'background-location-task';
const GEOFENCE_RADIUS = 500; // 500 meters default
const MOVEMENT_THRESHOLD = 10; // 10 meters to detect movement
const STATIONARY_CHECK_INTERVAL = 60000; // 1 minute
const MOVING_CHECK_INTERVAL = 60000; // 1 minute when moving

// Define Background Location Task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    
    if (location) {
      console.log('📍 Background location update:', location.coords.latitude, location.coords.longitude);
      
      // Check geofence in background
      try {
        const homeLocationStr = await AsyncStorage.getItem('homeLocation');
        const geofenceRadiusStr = await AsyncStorage.getItem('geofenceRadius');
        
        if (homeLocationStr) {
          const homeLocation = JSON.parse(homeLocationStr);
          const radius = geofenceRadiusStr ? parseInt(geofenceRadiusStr) : GEOFENCE_RADIUS;
          
          // Calculate distance
          const R = 6371e3;
          const φ1 = (homeLocation.latitude * Math.PI) / 180;
          const φ2 = (location.coords.latitude * Math.PI) / 180;
          const Δφ = ((location.coords.latitude - homeLocation.latitude) * Math.PI) / 180;
          const Δλ = ((location.coords.longitude - homeLocation.longitude) * Math.PI) / 180;
          
          const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          
          // Send alert if outside geofence
          if (distance > radius) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '⚠️ Safety Alert',
                body: `You are ${Math.round(distance)}m from home (outside safe zone)`,
                sound: 'default',
                channelId: 'memorii-emergency',
              },
              trigger: null,
            });
          }
        }
      } catch (error) {
        console.error('Background geofence check error:', error);
      }
    }
  }
});

// Set notification handler globally (ensures notifications show even when app is backgrounded)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority?.MAX ?? 'max',
  }),
});

export default function DashboardScreen({ navigation }) {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [emergencyPressed, setEmergencyPressed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // GPS Tracking States
  const [location, setLocation] = useState(null);
  const [homeLocation, setHomeLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [distanceFromHome, setDistanceFromHome] = useState(0);
  const [geofenceRadius, setGeofenceRadius] = useState(GEOFENCE_RADIUS);
  const [locationAddress, setLocationAddress] = useState('Fetching location...');
  const [gpsStatus, setGpsStatus] = useState('inactive');
  const lastLocationRef = useRef(null);
  const locationIntervalRef = useRef(null);

  // Location History for Route Tracking
  const [locationHistory, setLocationHistory] = useState([]);
  const [showRouteModal, setShowRouteModal] = useState(false);

  // Family Members State
  const [familyMembers, setFamilyMembers] = useState(INITIAL_FAMILY_MEMBERS);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Emergency Slider State
  const sliderX = useRef(new Animated.Value(0)).current;
  const [isSliderComplete, setIsSliderComplete] = useState(false);
  const [emergencyStatus, setEmergencyStatus] = useState('idle'); // idle, sending, sent
  const SLIDER_WIDTH = width - 120; // Total slider track width
  const SLIDER_THRESHOLD = SLIDER_WIDTH - 60; // Threshold to trigger emergency

  // Voice Assistant State
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceResponse, setVoiceResponse] = useState('');
  const voiceRecognitionRef = useRef(null);

  // Caretaker Tasks State
  const [tasks, setTasks] = useState([]);
  const [showTasksModal, setShowTasksModal] = useState(false);

  // Daily Stats - Fetched from Backend
  const [dailyStats, setDailyStats] = useState({
    waterGlasses: { current: 0, target: 8 },
    walkingTimes: { current: 0, target: 3 },
    medicines: { current: 0, target: 3 },
  });

  // Today's Schedule - Dynamic from Backend
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);

  // Speech control - only speak greeting once per session
  const hasSpokenGreeting = useRef(false);

  // Notification Popup State
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [activeNotification, setActiveNotification] = useState(null);

  // Backend API Base URL (shared with caretaker app)
  const API_BASE_URL = 'https://memorii-backend.onrender.com/api'; // Replace with actual backend

  const theme = isDarkMode ? THEMES.dark : THEMES.light;

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const microphoneScale = useRef(new Animated.Value(1)).current;

  // Update Time, Date & Greeting
  useEffect(() => {
    const updateTimeAndGreeting = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;

      setCurrentTime(`${displayHours}:${displayMinutes} ${ampm}`);
      setCurrentDate(now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      }));

      if (hours < 12) {
        setGreeting('Good Morning');
      } else if (hours < 18) {
        setGreeting('Good Afternoon');
      } else {
        setGreeting('Good Evening');
      }
    };

    // Load user name from storage
    const loadUserName = async () => {
      try {
        const patientName = await SecureStore.getItemAsync('patient_name');
        const profileData = await AsyncStorage.getItem('profileData');
        const name = patientName || (profileData ? JSON.parse(profileData).name : 'Friend');
        setUserName(name);
      } catch (e) {
        setUserName('Friend');
      }
    };

    updateTimeAndGreeting();
    loadUserName();
    const interval = setInterval(updateTimeAndGreeting, 1000);
    return () => clearInterval(interval);
  }, []);

  // Speak Greeting on App Start - ONLY ONCE per session
  useEffect(() => {
    const speakGreeting = async () => {
      // Skip if already spoken
      if (hasSpokenGreeting.current) return;
      
      try {
        const profileData = await AsyncStorage.getItem('profileData');
        const patientName = await SecureStore.getItemAsync('patient_name');
        const userName = patientName || (profileData ? JSON.parse(profileData).name : 'friend');
        
        const now = new Date();
        const hours = now.getHours();
        let greetingMsg = '';
        
        if (hours < 12) {
          greetingMsg = `Good morning ${userName}! Welcome to Memorii.`;
        } else if (hours < 18) {
          greetingMsg = `Good afternoon ${userName}! Welcome to Memorii.`;
        } else {
          greetingMsg = `Good evening ${userName}! Welcome to Memorii.`;
        }
        
        // Wait 1.5 seconds then speak greeting ONCE
        setTimeout(() => {
          if (!hasSpokenGreeting.current) {
            hasSpokenGreeting.current = true;
            Speech.speak(greetingMsg, { language: 'en', rate: 0.95 });
          }
        }, 1500);
      } catch (error) {
        console.error('Error loading profile for greeting:', error);
      }
    };

    speakGreeting();
  }, []);

  // Pulsing Animation for Microphone Button
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // GPS Tracking Setup - Auto-start on app load
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Request all permissions at start
        await requestAllPermissions();
        
        // Setup notifications first (non-blocking)
        setupNotifications().catch(e => console.log('Notification setup error:', e));
        
        // Load saved data
        await loadGeofenceRadius();
        await loadLocationHistory();
        await loadFamilyMembers();
        await loadTasks();
        
        // Fetch data from backend
        await fetchPatientProfile();
        await fetchDailyStats();
        await fetchTodaySchedule();
        
        // Request location permissions and get initial location
        const permissionGranted = await requestLocationPermissions();
        
        if (permissionGranted) {
          // Auto-start GPS tracking after a short delay
          setTimeout(() => {
            startGPSTracking();
          }, 2000);
        }
      } catch (error) {
        console.error('App initialization error:', error);
        setLocationAddress('Location unavailable');
      }
    };

    initializeApp();
    
    // Listen for notification received while app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received:', notification);
      const title = notification.request?.content?.title || '';
      const body = notification.request?.content?.body || '';
      const data = notification.request?.content?.data || {};
      
      // Show popup for the notification
      setActiveNotification({
        title: title,
        body: body,
        icon: data?.icon || 'notifications',
        color: data?.color || '#4F46E5',
        itemId: data?.itemId,
        type: data?.type,
      });
      setShowNotificationPopup(true);
      
      // Only speak for important schedule/medication notifications
      if (data?.type === 'schedule' || data?.type === 'medication') {
        Speech.speak(`Reminder: ${title}`, { language: 'en', rate: 0.9 });
      }
    });
    
    // Listen for user interaction with notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Notification tapped:', response);
      const data = response.notification.request?.content?.data;
      if (data?.type === 'schedule' && data?.itemId) {
        // Mark the schedule item as complete when notification is tapped
        completeScheduleItem(data.itemId);
      }
    });
    
    // Initialize WebSocket connection for real-time updates
    socketService.initialize();
    
    // Listen for schedule updates from caretaker
    const handleScheduleUpdate = (data) => {
      console.log('📅 Schedule updated by caretaker, refreshing...');
      fetchTodaySchedule();
      fetchDailyStats();
      // Show a brief notification that the plan was updated
      if (data && data.taskTitle) {
        setActiveNotification({
          title: '📋 New Task Added',
          body: `Your caretaker added: "${data.taskTitle}" to your plan.`,
          icon: 'checkbox',
          color: '#8B5CF6',
          itemId: data.taskId,
          type: 'task_added',
        });
        setShowNotificationPopup(true);
        Speech.speak(`Your caretaker added a new task: ${data.taskTitle}`, { language: 'en', rate: 0.9 });
      }
    };
    
    // Listen for patient profile updates from caretaker
    const handlePatientUpdate = (data) => {
      console.log('👤 Patient profile updated, refreshing...');
      fetchPatientProfile();
    };
    
    // Listen for immediate reminders
    const handleReminderDue = (data) => {
      console.log('⏰ Reminder due:', data.title);
      // Show notification popup
      setActiveNotification({
        title: `⏰ ${data.title}`,
        body: data.description || `It's time for: ${data.title}`,
        icon: 'notifications',
        color: '#4F46E5',
        itemId: data.taskId,
        type: 'schedule',
      });
      setShowNotificationPopup(true);
      Speech.speak(`Reminder: ${data.title}`, { language: 'en', rate: 0.9 });
    };

    // Listen for new tasks added by caretaker via AI chat
    const handleTaskAdded = (data) => {
      console.log('✅ New task added by caretaker:', data.title);
      // Refresh the schedule so the new task appears in "Today's Schedule"
      fetchTodaySchedule();
      // Show a persistent in-app notification popup
      setActiveNotification({
        title: '📋 New Task Added to Your Plan',
        body: `${data.title}${data.time ? ' at ' + data.time : ''}${data.description ? '\n' + data.description : ''}`,
        icon: data.icon || 'checkbox',
        color: data.color || '#8B5CF6',
        itemId: data.taskId,
        type: 'task_added',
      });
      setShowNotificationPopup(true);
      // Voice announcement for the patient
      Speech.speak(`Your caretaker added a new task: ${data.title}${data.time ? ' at ' + data.time : ''}`, { language: 'en', rate: 0.9 });
    };
    
    socketService.on('schedule:updated', handleScheduleUpdate);
    socketService.on('patient:updated', handlePatientUpdate);
    socketService.on('reminder:due', handleReminderDue);
    socketService.on('task:added', handleTaskAdded);
    
    // Refresh data every 5 minutes
    const refreshInterval = setInterval(() => {
      fetchPatientProfile();
      fetchDailyStats();
      fetchTodaySchedule();
    }, 5 * 60 * 1000);
    
    return () => {
      clearInterval(refreshInterval);
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
      // Remove socket listeners
      socketService.off('schedule:updated', handleScheduleUpdate);
      socketService.off('patient:updated', handlePatientUpdate);
      socketService.off('reminder:due', handleReminderDue);
      socketService.off('task:added', handleTaskAdded);
    };
  }, []);

  // Load Geofence Radius from Caretaker Settings
  const loadGeofenceRadius = async () => {
    try {
      const savedRadius = await AsyncStorage.getItem('geofenceRadius');
      if (savedRadius) {
        setGeofenceRadius(parseInt(savedRadius));
      }
    } catch (error) {
      console.error('Error loading geofence radius:', error);
    }
  };

  // Request All Permissions at App Start
  const requestAllPermissions = async () => {
    try {
      // Camera permission for QR scanning
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        console.log('Camera permission not granted');
      }

      // Media library permission
      const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
      if (mediaStatus !== 'granted') {
        console.log('Media library permission not granted');
      }

      // Notification permission (Android 13+)
      const { status: notifStatus } = await Notifications.requestPermissionsAsync();
      if (notifStatus !== 'granted') {
        Alert.alert(
          'Notifications Required',
          'Please enable notifications to receive important reminders and safety alerts.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }

      // Request battery optimization exemption for background tasks
      if (Platform.OS === 'android') {
        Alert.alert(
          'Background Access',
          'For your safety, Memorii needs to run in the background to track your location and send reminders even when the app is closed.\n\nPlease disable battery optimization for Memorii in the next screen.',
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Allow', 
              onPress: () => {
                Linking.openSettings();
              }
            }
          ]
        );
      }

      console.log('✅ All permissions requested');
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  // Fetch Patient Profile from Backend (syncs name, medications, etc from caretaker dashboard)
  const fetchPatientProfile = async () => {
    try {
      const patientId = await SecureStore.getItemAsync('patient_id');
      
      if (!patientId) {
        console.log('No patient ID for profile fetch');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/patient/${patientId}/profile`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📥 Patient profile synced:', data.name);
        
        // Update user name if different from what we have
        if (data.name) {
          const currentName = await SecureStore.getItemAsync('patient_name');
          if (currentName !== data.name) {
            await SecureStore.setItemAsync('patient_name', data.name);
            setUserName(data.name);
            console.log('✅ Patient name updated:', data.name);
          }
        }
        
        // Store medications for display
        if (data.medications && data.medications.length > 0) {
          await AsyncStorage.setItem('patientMedications', JSON.stringify(data.medications));
          console.log('💊 Medications synced:', data.medications.length);
        }
        
        // Update profile data
        await AsyncStorage.setItem('profileData', JSON.stringify({
          name: data.name,
          age: data.age,
          diagnosis: data.diagnosis,
          location: data.location,
          safety_status: data.safety_status,
        }));
      }
    } catch (error) {
      console.log('Profile fetch error:', error.message);
    }
  };

  // Fetch Daily Stats from Backend
  const fetchDailyStats = async () => {
    try {
      const patientId = await SecureStore.getItemAsync('patient_id');
      const caretakerCode = await AsyncStorage.getItem('caretakerCode');
      
      if (!patientId && !caretakerCode) {
        // Use mock data if not connected to backend
        setDailyStats({
          waterGlasses: { current: 4, target: 8 },
          walkingTimes: { current: 1, target: 3 },
          medicines: { current: 2, target: 3 },
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/patient/${patientId || caretakerCode}/daily-stats`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setDailyStats({
          waterGlasses: { current: data.waterGlasses || 0, target: data.waterTarget || 8 },
          walkingTimes: { current: data.walkingTimes || 0, target: data.walkingTarget || 3 },
          medicines: { current: data.medicinesTaken || 0, target: data.medicinesTotal || 3 },
        });
      }
    } catch (error) {
      console.log('Using local daily stats:', error.message);
      // Keep existing or default stats
    }
  };

  // Update Daily Stat (Water/Walking/Medicine)
  const updateDailyStat = async (statType, increment = 1) => {
    try {
      const newStats = { ...dailyStats };
      
      if (statType === 'water') {
        newStats.waterGlasses.current = Math.min(
          newStats.waterGlasses.current + increment,
          newStats.waterGlasses.target
        );
        // Visual feedback only - no speech to avoid interruption
      } else if (statType === 'walking') {
        newStats.walkingTimes.current = Math.min(
          newStats.walkingTimes.current + increment,
          newStats.walkingTimes.target
        );
        // Visual feedback only
      } else if (statType === 'medicine') {
        newStats.medicines.current = Math.min(
          newStats.medicines.current + increment,
          newStats.medicines.target
        );
        // Visual feedback only
      }
      
      setDailyStats(newStats);
      
      // Sync to backend
      const patientId = await SecureStore.getItemAsync('patient_id');
      if (patientId) {
        fetch(`${API_BASE_URL}/patient/${patientId}/daily-stats`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            waterGlasses: newStats.waterGlasses.current,
            walkingTimes: newStats.walkingTimes.current,
            medicinesTaken: newStats.medicines.current,
          }),
        }).catch(e => console.log('Sync error:', e));
      }
      
      // Save locally as backup
      await AsyncStorage.setItem('dailyStats', JSON.stringify(newStats));
    } catch (error) {
      console.error('Error updating stat:', error);
    }
  };

  // Fetch Today's Schedule from Backend (set by caretaker)
  const fetchTodaySchedule = async () => {
    try {
      setIsLoadingSchedule(true);
      const patientId = await SecureStore.getItemAsync('patient_id');
      const caretakerCode = await AsyncStorage.getItem('caretakerCode');
      
      if (!patientId && !caretakerCode) {
        // Use default schedule if not connected
        setTodaySchedule([
          { id: '1', title: 'Morning Medication', time: '09:00', icon: 'medical', color: '#10B981', completed: true },
          { id: '2', title: 'Breakfast', time: '09:30', icon: 'restaurant', color: '#F59E0B', completed: true },
          { id: '3', title: 'Morning Walk', time: '10:00', icon: 'walk', color: '#3B82F6', completed: false },
          { id: '4', title: 'Lunch Time', time: '12:30', icon: 'restaurant', color: '#F59E0B', completed: false },
          { id: '5', title: 'Afternoon Medication', time: '14:00', icon: 'medical', color: '#10B981', completed: false },
          { id: '6', title: 'Doctor Appointment', time: '15:00', icon: 'calendar', color: '#4F46E5', completed: false, note: 'Dr. Sarah Mitchell' },
          { id: '7', title: 'Evening Walk', time: '17:00', icon: 'walk', color: '#3B82F6', completed: false },
          { id: '8', title: 'Dinner', time: '19:00', icon: 'restaurant', color: '#F59E0B', completed: false },
          { id: '9', title: 'Night Medication', time: '21:00', icon: 'medical', color: '#10B981', completed: false },
        ]);
        setIsLoadingSchedule(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/patient/${patientId || caretakerCode}/schedule/today`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setTodaySchedule(data.schedule || []);
        
        // Schedule notifications for upcoming items
        scheduleNotificationsForSchedule(data.schedule || []);
      }
    } catch (error) {
      console.log('Using local schedule:', error.message);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  // Schedule Notifications for Today's Schedule Items
  const scheduleNotificationsForSchedule = async (schedule) => {
    try {
      // Cancel all previously scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      const now = new Date();
      
      for (const item of schedule) {
        if (item.completed) continue;
        
        const [hours, minutes] = item.time.split(':').map(Number);
        const itemDate = new Date();
        itemDate.setHours(hours, minutes, 0, 0);
        
        // Only schedule if in the future
        if (itemDate > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `⏰ ${item.title}`,
              body: item.note || `It's time for: ${item.title}`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority?.MAX ?? 'max',
              channelId: 'memorii-alerts',
              data: { type: 'schedule', itemId: item.id },
              vibrate: [0, 250, 250, 250, 250, 250],
              sticky: false,
              autoDismiss: false,
            },
            trigger: { 
              date: itemDate,
              channelId: 'memorii-alerts',
            },
          });
          console.log(`📅 Scheduled: ${item.title} at ${item.time}`);
        }
      }
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  };

  // Mark Schedule Item as Complete
  const completeScheduleItem = async (itemId) => {
    // Close popup if open
    setShowNotificationPopup(false);
    setActiveNotification(null);
    
    const updatedSchedule = todaySchedule.map(item =>
      item.id === itemId ? { ...item, completed: true } : item
    );
    setTodaySchedule(updatedSchedule);
    
    const item = todaySchedule.find(i => i.id === itemId);
    if (item) {
      // Update medicine count if it's a medication item
      if (item.icon === 'medical') {
        updateDailyStat('medicine');
      } else if (item.icon === 'walk') {
        updateDailyStat('walking');
      }
    }
    
    // Sync to backend
    const patientId = await SecureStore.getItemAsync('patient_id');
    if (patientId) {
      fetch(`${API_BASE_URL}/patient/${patientId}/schedule/${itemId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      }).catch(e => console.log('Sync error:', e));
    }
  };

  // Test Notification - Shows the popup
  const testNotification = () => {
    const testTasks = [
      { title: '💊 Take Morning Medicine', body: 'It\'s time for your morning medication', icon: 'medical', color: '#10B981' },
      { title: '💧 Drink Water', body: 'Stay hydrated! Please drink a glass of water', icon: 'water', color: '#3B82F6' },
      { title: '🚶 Time for Walk', body: 'Let\'s take a short walk for your health', icon: 'walk', color: '#F59E0B' },
      { title: '🍽️ Lunch Time', body: 'It\'s time to have your lunch', icon: 'restaurant', color: '#EF4444' },
    ];
    
    const randomTask = testTasks[Math.floor(Math.random() * testTasks.length)];
    
    setActiveNotification({
      title: randomTask.title,
      body: randomTask.body,
      icon: randomTask.icon,
      color: randomTask.color,
      itemId: null,
      type: 'test',
    });
    setShowNotificationPopup(true);
    
    // Speak the notification
    Speech.speak(`${randomTask.title}. ${randomTask.body}`, { language: 'en', pitch: 1.0, rate: 0.9 });
  };

  // Setup Notifications with Smartwatch-compatible channels
  const setupNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please enable notifications for safety alerts');
        return;
      }
      
      // Create notification channels for Android (required for smartwatch mirroring)
      // Using raw importance values: MAX=5, HIGH=4, DEFAULT=3, LOW=2, MIN=1
      if (Platform.OS === 'android') {
        // Main alerts channel - High priority for watch mirroring
        await Notifications.setNotificationChannelAsync('memorii-alerts', {
          name: 'Memorii Alerts',
          importance: Notifications.AndroidImportance?.MAX ?? 5,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC ?? 1,
        });

        // Emergency channel - Critical priority
        await Notifications.setNotificationChannelAsync('memorii-emergency', {
          name: 'Emergency Alerts',
          importance: Notifications.AndroidImportance?.MAX ?? 5,
          vibrationPattern: [0, 500, 200, 500, 200, 500],
          lightColor: '#FF0000',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
          bypassDnd: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC ?? 1,
        });

        // Task reminders channel
        await Notifications.setNotificationChannelAsync('memorii-tasks', {
          name: 'Task Reminders',
          importance: Notifications.AndroidImportance?.HIGH ?? 4,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC ?? 1,
        });
        
        console.log('✅ Android notification channels created');
      }
      
      console.log('✅ Notifications setup complete');
    } catch (error) {
      console.error('❌ Error setting up notifications:', error);
      // Don't throw - allow app to continue without notifications
    }
  };

  // Request Location Permissions
  const requestLocationPermissions = async () => {
    try {
      console.log('📍 Requesting location permissions...');
      
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      console.log('Foreground permission status:', foregroundStatus);
      
      if (foregroundStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required for safety tracking');
        setLocationAddress('Location permission denied');
        return false;
      }

      // Try to get background permission (non-blocking)
      try {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.log('Background location not granted');
        }
      } catch (bgError) {
        console.log('Background permission error:', bgError);
      }

      // Get initial location with timeout
      console.log('📍 Getting current position...');
      setLocationAddress('Getting your location...');
      
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Use Balanced for faster response
        timeout: 15000, // 15 second timeout
      });
      
      console.log('📍 Location received:', currentLocation.coords);
      setLocation(currentLocation);
      lastLocationRef.current = currentLocation;
      
      // Set this as home location if not set
      const savedHome = await AsyncStorage.getItem('homeLocation');
      if (!savedHome) {
        const homeData = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        };
        await AsyncStorage.setItem('homeLocation', JSON.stringify(homeData));
        setHomeLocation(homeData);
      } else {
        setHomeLocation(JSON.parse(savedHome));
      }

      // Get address
      await reverseGeocode(currentLocation.coords.latitude, currentLocation.coords.longitude);
      
      return true;
    } catch (error) {
      console.error('❌ Location permission/fetch error:', error);
      setLocationAddress('Unable to get location');
      return false;
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Reverse Geocode to get address
  const reverseGeocode = async (latitude, longitude) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results && results.length > 0) {
        const address = results[0];
        const formattedAddress = `${address.street || ''}, ${address.city || ''}, ${address.region || ''}`.trim();
        setLocationAddress(formattedAddress || 'Unknown location');
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
      setLocationAddress('Unable to get address');
    }
  };

  // Send Alert to Caretaker
  const sendCaretakerAlert = async (type, message, locationData) => {
    try {
      // 1. Send Local Notification to Patient App (with smartwatch support)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Safety Alert',
          body: message,
          sound: 'default',
          channelId: 'memorii-alerts',
        },
        trigger: null, // Immediate
      });

      // 2. Get caretaker info from AsyncStorage
      const caretakerCode = await AsyncStorage.getItem('caretakerCode');
      const profileData = await AsyncStorage.getItem('profileData');
      
      if (caretakerCode && profileData) {
        const profile = JSON.parse(profileData);
        const emergencyContact = profile.emergencyContact;

        // 3. Send SMS (would require backend API in production)
        const smsMessage = `🚨 ${message}\\nPatient: ${profile.name}\\nLocation: ${locationData.address}\\nCoordinates: ${locationData.latitude}, ${locationData.longitude}\\nCaretaker Code: ${caretakerCode}`;
        
        // Open SMS app with pre-filled message
        if (emergencyContact) {
          const smsUrl = `sms:${emergencyContact}?body=${encodeURIComponent(smsMessage)}`;
          await Linking.openURL(smsUrl);
        }

        // 4. Send WhatsApp Alert (opens WhatsApp with pre-filled message)
        const whatsappMessage = `🚨 *Safety Alert*\\n\\n${message}\\n\\n*Patient:* ${profile.name}\\n*Location:* ${locationData.address}\\n*GPS:* ${locationData.latitude}, ${locationData.longitude}\\n*Time:* ${new Date().toLocaleString()}`;
        const whatsappUrl = `whatsapp://send?phone=${emergencyContact}&text=${encodeURIComponent(whatsappMessage)}`;
        
        setTimeout(() => {
          Linking.canOpenURL(whatsappUrl).then(supported => {
            if (supported) {
              Linking.openURL(whatsappUrl);
            }
          });
        }, 2000);

        // 5. Send to Backend (Web App Notification) - Simulate API call
        console.log('📤 Sending to Backend API:', {
          type: type,
          caretakerCode: caretakerCode,
          patientName: profile.name,
          message: message,
          location: locationData,
          timestamp: new Date().toISOString(),
        });

        // In production, this would be an actual API call:
        // await fetch('https://your-backend.com/api/alerts', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ ... })
        // });
      }

    } catch (error) {
      console.error('Alert sending error:', error);
    }
  };

  // Check Geofence Breach
  const checkGeofenceBreach = async (currentLat, currentLon) => {
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

      // Show notification popup for geofence breach
      setActiveNotification({
        title: '⚠️ Safety Alert',
        body: 'You have moved far from home. Your caretaker has been notified.',
        icon: 'warning',
        color: '#EF4444',
        type: 'safety',
      });
      setShowNotificationPopup(true);
      // Safety alert shown in popup - no speech needed
    }
  };

  // Start GPS Tracking
  const startGPSTracking = async () => {
    if (isTracking) return;

    setIsTracking(true);
    setGpsStatus('tracking');
    // GPS tracking started - no speech needed (visual indicator shown)

    // Show persistent notification for background location
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📍 Location Tracking Active',
        body: 'Memorii is keeping you safe by monitoring your location',
        sound: false,
        channelId: 'memorii-alerts',
        sticky: true,
      },
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
            timeInterval: 60000, // Update every 1 minute
            distanceInterval: 10, // Or when moved 10 meters
            foregroundService: {
              notificationTitle: 'Memorii Safety Tracking',
              notificationBody: '📍 Your location is being monitored for safety',
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
  };

  // Stop GPS Tracking (disabled for auto-tracking)
  const stopGPSTracking = async () => {
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
    // GPS stopped - visual indicator only
  };

  // Set Home Location
  const setCurrentAsHome = async () => {
    if (!location) {
      Alert.alert('No Location', 'Please wait while we fetch your current location');
      return;
    }

    const homeData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    await AsyncStorage.setItem('homeLocation', JSON.stringify(homeData));
    setHomeLocation(homeData);
    setDistanceFromHome(0);

    Alert.alert('Home Location Set', 'Your current location is now set as home');
    // No speech - Alert already provides feedback
  };

  // Medication Reminder Modal - DISABLED auto-show to prevent interruption
  // Reminders now come from the schedule notifications
  useEffect(() => {
    // Disabled auto medication modal
    // const timer = setTimeout(() => {
    //   setShowMedicationModal(true);
    // }, 5000);
    // return () => clearTimeout(timer);
  }, []);

  // Handle Family Card Press
  const handleCardPress = (member) => {
    const message = `This is your ${member.relation}, ${member.name}`;
    Speech.speak(message, { language: 'en' });
  };

  // Handle Family Card Long Press - Open Member Modal
  const handleCardLongPress = (member) => {
    setSelectedMember(member);
    setShowMemberModal(true);
  };

  // Load Family Members from Storage
  const loadFamilyMembers = async () => {
    try {
      const storedMembers = await AsyncStorage.getItem('familyMembers');
      if (storedMembers) {
        setFamilyMembers(JSON.parse(storedMembers));
      }
    } catch (error) {
      console.error('Error loading family members:', error);
    }
  };

  // Save Family Members to Storage
  const saveFamilyMembers = async (members) => {
    try {
      await AsyncStorage.setItem('familyMembers', JSON.stringify(members));
      setFamilyMembers(members);
    } catch (error) {
      console.error('Error saving family members:', error);
    }
  };

  // Pick Image from Gallery
  const pickImageFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        addMediaToMember(result.assets);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  // Take Photo with Camera
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        addMediaToMember(result.assets);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  // Record Video
  const recordVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoMaxDuration: 60,
        quality: 0.7,
      });

      if (!result.canceled && result.assets) {
        addMediaToMember(result.assets);
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'Failed to record video');
    }
  };

  // Add Media to Selected Member
  const addMediaToMember = (assets) => {
    if (!selectedMember) return;

    const newMedia = assets.map((asset) => ({
      uri: asset.uri,
      type: asset.type === 'video' ? 'video' : 'image',
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
      addedAt: new Date().toISOString(),
    }));

    const updatedMembers = familyMembers.map((member) => {
      if (member.id === selectedMember.id) {
        return {
          ...member,
          media: [...(member.media || []), ...newMedia],
        };
      }
      return member;
    });

    saveFamilyMembers(updatedMembers);
    setSelectedMember({
      ...selectedMember,
      media: [...(selectedMember.media || []), ...newMedia],
    });
  };

  // Delete Media from Member
  const deleteMedia = (mediaIndex) => {
    if (!selectedMember) return;

    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedMedia = selectedMember.media.filter((_, index) => index !== mediaIndex);
            const updatedMembers = familyMembers.map((member) => {
              if (member.id === selectedMember.id) {
                return { ...member, media: updatedMedia };
              }
              return member;
            });
            saveFamilyMembers(updatedMembers);
            setSelectedMember({ ...selectedMember, media: updatedMedia });
          },
        },
      ]
    );
  };

  // Open Google Photos and Search by Person Name
  const openGooglePhotos = async () => {
    if (!selectedMember) return;

    try {
      // Request media library permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photos to import images of ' + selectedMember.name,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      // Show options for Google Photos integration
      Alert.alert(
        `Import Photos of ${selectedMember.name}`,
        'Choose how to find photos:',
        [
          {
            text: 'Open Google Photos',
            onPress: async () => {
              // Open Google Photos app with search query
              const searchQuery = encodeURIComponent(selectedMember.name);
              const googlePhotosUrl = `googlephotos://search?q=${searchQuery}`;
              const googlePhotosWebUrl = `https://photos.google.com/search/${searchQuery}`;

              const canOpen = await Linking.canOpenURL(googlePhotosUrl);
              if (canOpen) {
                await Linking.openURL(googlePhotosUrl);
              } else {
                await Linking.openURL(googlePhotosWebUrl);
              }
            }
          },
          {
            text: 'Search Device Gallery',
            onPress: async () => {
              await searchDevicePhotos(selectedMember.name);
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error with Google Photos:', error);
      Alert.alert('Error', 'Could not open Google Photos');
    }
  };

  // Search Device Photos (using Media Library)
  const searchDevicePhotos = async (personName) => {
    try {
      // Get recent photos from device
      const { assets } = await MediaLibrary.getAssetsAsync({
        first: 50,
        mediaType: 'photo',
        sortBy: MediaLibrary.SortBy.creationTime,
      });

      if (assets.length > 0) {
        Alert.alert(
          `Found ${assets.length} Recent Photos`,
          `Would you like to add some of these to ${personName}'s album? You can select which ones belong to ${personName}.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Pick Photos',
              onPress: () => pickImageFromGallery()
            }
          ]
        );
      } else {
        Alert.alert('No Photos Found', 'Try taking a new photo or using Google Photos.');
      }
    } catch (error) {
      console.error('Error searching photos:', error);
    }
  };

  // View Media Full Screen
  const viewMedia = (index) => {
    setCurrentMediaIndex(index);
    setShowMediaViewer(true);
  };

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // Visual feedback only
  };

  // Handle Microphone Press - Gemini Voice Assistant (Continuous Listening)
  const handleMicrophonePress = async () => {
    // Toggle listening state
    const newListeningState = !isListening;
    setIsListening(newListeningState);

    // Button press animation
    Animated.sequence([
      Animated.timing(microphoneScale, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(microphoneScale, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (newListeningState) {
      // Start continuous listening mode
      setIsProcessingVoice(true);
      setVoiceResponse('Listening... Tap again to stop');
      
      // Start continuous listening loop
      startContinuousListening();
    } else {
      // Stop listening
      stopContinuousListening();
      setIsProcessingVoice(false);
      setVoiceResponse('');
    }
  };

  // Start Continuous Listening (Demo mode - processes sample queries)
  const startContinuousListening = () => {
    // Demo queries that simulate what an Alzheimer's patient might ask
    const demoQueries = [
      "What day is it today?",
      "What time is it?",
      "Who am I?",
      "Tell me about my family",
      "When is my next medication?",
      "Where am I?",
      "What should I do now?",
    ];

    let queryIndex = 0;

    // Process a query every 10 seconds while listening
    voiceRecognitionRef.current = setInterval(async () => {
      // Use the current query and cycle through
      const currentQuery = demoQueries[queryIndex];
      queryIndex = (queryIndex + 1) % demoQueries.length;
      
      setVoiceResponse(`🎤 You asked: "${currentQuery}"\n\n⏳ Processing...`);
      
      try {
        // Call Gemini API
        const response = await callGeminiAPI(currentQuery);
        
        setVoiceResponse(`🎤 You asked: "${currentQuery}"\n\n🤖 ${response}`);
        Speech.speak(response, { language: 'en', rate: 0.9 });
      } catch (error) {
        console.error('Voice processing error:', error);
        const fallback = await getLocalResponse(currentQuery);
        setVoiceResponse(`🎤 You asked: "${currentQuery}"\n\n🤖 ${fallback}`);
        Speech.speak(fallback, { language: 'en', rate: 0.9 });
      }
    }, 10000); // Process every 10 seconds
  };

  // Stop Continuous Listening
  const stopContinuousListening = () => {
    if (voiceRecognitionRef.current) {
      clearInterval(voiceRecognitionRef.current);
      voiceRecognitionRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopContinuousListening();
    };
  }, []);

  // Gemini API Call with retry logic
  const callGeminiAPI = async (query, retryCount = 0) => {
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 8000;
    
    try {
      // Get patient context
      const patientName = await SecureStore.getItemAsync('patient_name') || 'friend';
      const now = new Date();
      
      const systemPrompt = `You are a caring, warm AI assistant named Memorii for ${patientName}, who has Alzheimer's disease. 
Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
The current time is ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.

Guidelines:
- Keep responses VERY short (1-2 sentences max)
- Be warm, reassuring, and patient
- Use simple, clear language
- Address ${patientName} by name occasionally
- If asked about family, mention they love them
- If asked about time/date, give the current info
- If they seem confused, be extra gentle and reassuring`;

      const GEMINI_API_KEY = 'AIzaSyDrusd7knPYvziu_1LjsRtWsFLOWYztrwQ';
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      
      // Use gemini-1.5-flash as it's the stable model
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `${systemPrompt}\n\nPatient asks: "${query}"` }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 80,
              topP: 0.9,
            },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
          })
        }
      );

      clearTimeout(timeoutId);
      console.log('Gemini API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (answer) {
          return answer.trim();
        }
      } else if (response.status >= 500 && retryCount < MAX_RETRIES) {
        // Server error - retry
        console.log(`Gemini API server error, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return callGeminiAPI(query, retryCount + 1);
      }
      
      // Fall back to local response
      return await getLocalResponse(query);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Gemini API timeout');
      } else {
        console.error('Gemini API error:', error);
      }
      
      // Retry on network errors
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying Gemini API... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return callGeminiAPI(query, retryCount + 1);
      }
      
      return await getLocalResponse(query);
    }
  };

  // Local fallback responses (when API fails)
  const getLocalResponse = async (query) => {
    const lowerQuery = query.toLowerCase();
    const now = new Date();
    const patientName = await SecureStore.getItemAsync('patient_name') || 'friend';
    
    if (lowerQuery.includes('day') || lowerQuery.includes('date') || lowerQuery.includes('today')) {
      return `Today is ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. It's a beautiful day, ${patientName}!`;
    } else if (lowerQuery.includes('time')) {
      return `It's ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} right now. You're doing great!`;
    } else if (lowerQuery.includes('who am i') || lowerQuery.includes('my name')) {
      return `You are ${patientName}. You're safe and loved!`;
    } else if (lowerQuery.includes('family') || lowerQuery.includes('loved')) {
      return `${patientName}, your family loves you very much. You can see them in the "Loved Ones" section.`;
    } else if (lowerQuery.includes('medication') || lowerQuery.includes('medicine') || lowerQuery.includes('pill')) {
      return `Check the Today's Schedule section for your medication times. I'll remind you when it's time!`;
    } else if (lowerQuery.includes('where') || lowerQuery.includes('location')) {
      return `You're safe at home, ${patientName}. Your location is being tracked to keep you safe.`;
    } else if (lowerQuery.includes('help') || lowerQuery.includes('emergency')) {
      return `If you need help, slide the red emergency button at the bottom. Your caretaker will be notified right away.`;
    } else if (lowerQuery.includes('what should') || lowerQuery.includes('do now')) {
      return `You could check your daily schedule, drink some water, or take a short walk. Whatever feels right, ${patientName}!`;
    }
    return `I'm here with you, ${patientName}. How can I help you feel better today?`;
  };

  // Handle Emergency Long Press
  const handleEmergencyLongPress = () => {
    setEmergencyPressed(true);
    Speech.speak('Emergency Alert Activated. Calling emergency contact.', {
      language: 'en',
    });
    console.log('🚨 EMERGENCY ALERT: Calling emergency contact...');
    console.log('🚨 Sending SMS to caregiver with GPS location...');

    setTimeout(() => {
      setEmergencyPressed(false);
    }, 3000);
  };

  // Save Location to History
  const saveLocationToHistory = async (newLocation) => {
    try {
      const timestamp = new Date().toISOString();
      const historyEntry = {
        latitude: newLocation.coords.latitude,
        longitude: newLocation.coords.longitude,
        timestamp: timestamp,
        address: locationAddress,
      };

      // Get existing history
      const existingHistory = await AsyncStorage.getItem('locationHistory');
      let history = existingHistory ? JSON.parse(existingHistory) : [];
      
      // Add new entry (keep last 100 entries)
      history.push(historyEntry);
      if (history.length > 100) {
        history = history.slice(-100);
      }
      
      await AsyncStorage.setItem('locationHistory', JSON.stringify(history));
      setLocationHistory(history);
    } catch (error) {
      console.error('Error saving location history:', error);
    }
  };

  // Load Location History
  const loadLocationHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('locationHistory');
      if (history) {
        setLocationHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading location history:', error);
    }
  };

  // Clear Location History
  const clearLocationHistory = async () => {
    Alert.alert(
      'Clear Route History',
      'Are you sure you want to delete all route history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('locationHistory');
            setLocationHistory([]);
            Alert.alert('Cleared', 'Route history has been cleared');
          },
        },
      ]
    );
  };

  // Emergency Slider Handler
  const emergencyPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        sliderX.setOffset(sliderX._value);
        sliderX.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(0, Math.min(gestureState.dx, SLIDER_WIDTH - 60));
        sliderX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        sliderX.flattenOffset();
        
        if (gestureState.dx > SLIDER_THRESHOLD) {
          // Trigger emergency
          triggerEmergency();
        } else {
          // Reset slider
          Animated.spring(sliderX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  // Trigger Emergency - Send WhatsApp via Twilio and Alert Caretaker
  const triggerEmergency = async () => {
    setIsSliderComplete(true);
    setEmergencyStatus('sending');
    Speech.speak('Sending emergency alert...', { language: 'en' });

    try {
      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const lat = currentLocation.coords.latitude;
      const lon = currentLocation.coords.longitude;

      // Get address
      const addressResults = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      const address = addressResults[0] 
        ? `${addressResults[0].street || ''}, ${addressResults[0].city || ''}, ${addressResults[0].region || ''}`
        : 'Unknown location';

      // Get patient and caretaker info
      const profileData = await AsyncStorage.getItem('profileData');
      const caretakerCode = await AsyncStorage.getItem('caretakerCode');
      const patientName = await SecureStore.getItemAsync('patient_name');
      
      const profile = profileData ? JSON.parse(profileData) : {};
      // Emergency contact is the caretaker phone from QR code
      const emergencyContact = profile.emergencyContact || '';
      const caretakerName = profile.caretakerName || 'Caretaker';

      // Create the emergency message
      const emergencyMessage = `🚨 *EMERGENCY SOS - MEMORII*\n\n*Patient:* ${patientName || profile.name || 'Patient'}\n*Status:* NEEDS IMMEDIATE HELP\n\n📍 *Current Location:*\n${address}\n\n🗺️ *Google Maps:*\nhttps://maps.google.com/?q=${lat},${lon}\n\n⏰ *Time:* ${new Date().toLocaleString()}\n\n_Please respond immediately_`;

      // 1. Send WhatsApp via Twilio Backend API
      const twilioPayload = {
        type: 'emergency_sos',
        patientName: patientName || profile.name || 'Patient',
        caretakerCode: caretakerCode,
        caretakerPhone: emergencyContact,
        caretakerName: caretakerName,
        message: emergencyMessage,
        location: {
          latitude: lat,
          longitude: lon,
          address: address,
          googleMapsUrl: `https://maps.google.com/?q=${lat},${lon}`,
        },
        timestamp: new Date().toISOString(),
      };

      console.log('🚨 EMERGENCY SOS - Sending to Twilio Backend:', twilioPayload);

      // Send to backend which will trigger Twilio WhatsApp
      try {
        const response = await fetch(`${API_BASE_URL}/emergency/sos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(twilioPayload),
        });
        
        if (response.ok) {
          console.log('✅ Emergency SOS sent via Twilio');
        } else {
          console.log('⚠️ Backend error, falling back to direct WhatsApp');
          // Fallback: Open WhatsApp directly if backend fails
          const whatsappUrl = `whatsapp://send?phone=${emergencyContact}&text=${encodeURIComponent(emergencyMessage)}`;
          const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
          if (canOpenWhatsApp) {
            await Linking.openURL(whatsappUrl);
          }
        }
      } catch (apiError) {
        console.log('⚠️ API Error, falling back to direct WhatsApp:', apiError);
        // Fallback: Open WhatsApp directly if API call fails
        const whatsappUrl = `whatsapp://send?phone=${emergencyContact}&text=${encodeURIComponent(emergencyMessage)}`;
        const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
        if (canOpenWhatsApp) {
          await Linking.openURL(whatsappUrl);
        }
      }

      // 2. Send Local Notification (with smartwatch priority)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 EMERGENCY SOS SENT',
          body: `Alert sent to ${caretakerName}: ${address}`,
          sound: 'default',
          channelId: 'memorii-emergency',
        },
        trigger: null,
      });

      // Update status to SENT
      setEmergencyStatus('sent');
      Speech.speak(`Emergency alert sent to ${caretakerName}! Help is on the way.`, { language: 'en' });

      // Reset after 3 seconds
      setTimeout(() => {
        resetEmergencySlider();
      }, 3000);

    } catch (error) {
      console.error('Emergency alert error:', error);
      Speech.speak('Failed to send alert. Please try again.', { language: 'en' });
      resetEmergencySlider();
    }
  };

  // Reset Emergency Slider
  const resetEmergencySlider = () => {
    setEmergencyStatus('idle');
    setIsSliderComplete(false);
    Animated.spring(sliderX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  // ==================== CARETAKER TASKS ====================
  
  // Load Tasks from Storage
  const loadTasks = async () => {
    try {
      const storedTasks = await AsyncStorage.getItem('caretakerTasks');
      if (storedTasks) {
        const parsedTasks = JSON.parse(storedTasks);
        setTasks(parsedTasks);
        // Schedule notifications for pending tasks
        scheduleTasks(parsedTasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  // Save Tasks to Storage
  const saveTasks = async (newTasks) => {
    try {
      await AsyncStorage.setItem('caretakerTasks', JSON.stringify(newTasks));
      setTasks(newTasks);
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  };

  // Schedule Task Notifications (works with smartwatch via system notifications)
  const scheduleTasks = async (taskList) => {
    try {
      // Cancel all existing task notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      for (const task of taskList) {
        if (!task.completed && task.scheduledTime) {
          const triggerDate = new Date(task.scheduledTime);
          const now = new Date();

          if (triggerDate > now) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `⏰ ${task.title}`,
                body: task.description || 'Time for your scheduled task!',
                sound: 'default',
                channelId: 'memorii-tasks',
                data: { taskId: task.id, type: 'caretaker_task' },
              },
              trigger: { date: triggerDate },
            });

            console.log(`📅 Scheduled notification for: ${task.title} at ${triggerDate}`);
          }
        }
      }
    } catch (error) {
      console.error('Error scheduling tasks:', error);
    }
  };

  // Mark Task as Complete
  const completeTask = async (taskId) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, completed: true, completedAt: new Date().toISOString() } : task
    );
    await saveTasks(updatedTasks);
  };

  // Get upcoming tasks
  const getUpcomingTasks = () => {
    const now = new Date();
    return tasks
      .filter(task => !task.completed && new Date(task.scheduledTime) > now)
      .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime))
      .slice(0, 3);
  };

  // Get today's tasks
  const getTodaysTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tasks.filter(task => {
      const taskDate = new Date(task.scheduledTime);
      return taskDate >= today && taskDate < tomorrow;
    });
  };

  // Format time for route display
  const formatRouteTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for route display
  const formatRouteDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Handle Medication Modal
  const handleMedicationTaken = () => {
    setShowMedicationModal(false);
  };

  const handleMedicationSkip = () => {
    setShowMedicationModal(false);
  };

  // Dev Logout - Clear auth token for testing
  const handleDevLogout = async () => {
    Alert.alert(
      '🔓 Developer Mode',
      'Clear authentication and return to setup screen?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Auth',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear SecureStore
              await SecureStore.deleteItemAsync('user_session_token');
              await SecureStore.deleteItemAsync('patient_name');
              await SecureStore.deleteItemAsync('caretaker_code');
              
              // Clear AsyncStorage
              await AsyncStorage.clear();
              
              // Stop GPS tracking
              if (locationIntervalRef.current) {
                clearInterval(locationIntervalRef.current);
              }
              
              Alert.alert('✅ Auth Cleared', 'Restart the app to see setup screen');
            } catch (error) {
              console.error('Error clearing auth:', error);
              Alert.alert('Error', 'Failed to clear authentication');
            }
          },
        },
      ]
    );
  };

  // Test Notification - For testing smartwatch sync
  const handleTestNotification = async () => {
    try {
      // Build notification content with smartwatch-compatible settings
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Test Notification',
          body: 'This is a test notification from Memorii! If you see this on your smartwatch, notifications are working correctly.',
          sound: 'default',
          channelId: 'memorii-alerts',
          data: { type: 'test', timestamp: Date.now() },
        },
        trigger: null, // Immediate notification
      });
      
      Alert.alert(
        '✅ Notification Sent', 
        'Check your phone and smartwatch for the test notification.\n\n' +
        '📱 Smartwatch Tips:\n' +
        '• Make sure "Show notifications on watch" is enabled in your phone\'s watch app\n' +
        '• Check that Memorii is not blocked in notification settings\n' +
        '• Ensure your watch is connected via Bluetooth'
      );
    } catch (error) {
      console.error('Test notification error:', error);
      Alert.alert('Error', 'Failed to send test notification: ' + error.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="heart-circle" size={32} color={theme.accent} />
          <Text style={[styles.appTitle, { color: theme.primaryText }]}>
            Memorii
          </Text>
        </View>
        <View style={styles.darkModeToggle}>
          <Ionicons
            name={isDarkMode ? 'sunny' : 'moon'}
            size={20}
            color={theme.secondaryText}
          />
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#D1D5DB', true: theme.accent }}
            thumbColor={isDarkMode ? theme.accentLight : '#FFFFFF'}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        bounces={true}
      >
        {/* HERO SECTION: Greeting & Clock */}
        <LinearGradient
          colors={[theme.gradient1, theme.gradient2]}
          style={styles.heroSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroContent}>
            <View style={styles.greetingContainer}>
              <Ionicons name="sunny" size={40} color="rgba(255,255,255,0.9)" />
              <Text style={styles.greetingText}>{greeting}</Text>
            </View>
            <Text style={styles.userName}>{userName}</Text>
            <View style={styles.clockContainer}>
              <Text style={styles.clockText}>{currentTime}</Text>
            </View>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={18} color="rgba(255,255,255,0.85)" />
              <Text style={styles.dateText}>{currentDate}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* QUICK STATS SECTION - Dynamic from Backend */}
        <View style={[styles.quickStatsSection, { backgroundColor: theme.background }]}>
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.cardBackground }]}
            onPress={() => updateDailyStat('water')}
            activeOpacity={0.7}
          >
            <Ionicons name="water" size={32} color="#3B82F6" />
            <Text style={[styles.statNumber, { color: theme.primaryText }]}>
              {dailyStats.waterGlasses.current}/{dailyStats.waterGlasses.target}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Glasses</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.cardBackground }]}
            onPress={() => updateDailyStat('medicine')}
            activeOpacity={0.7}
          >
            <Ionicons name="medical" size={32} color="#10B981" />
            <Text style={[styles.statNumber, { color: theme.primaryText }]}>
              {dailyStats.medicines.current}/{dailyStats.medicines.target}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Pills</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.cardBackground }]}
            onPress={() => updateDailyStat('walking')}
            activeOpacity={0.7}
          >
            <Ionicons name="walk" size={32} color="#F59E0B" />
            <Text style={[styles.statNumber, { color: theme.primaryText }]}>
              {dailyStats.walkingTimes.current}/{dailyStats.walkingTimes.target}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Walking</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION DIVIDER */}
        <View style={styles.sectionDivider} />

        {/* MEMORY LANE SECTION */}
        <View style={[styles.memorySection, { backgroundColor: theme.background }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="people-circle" size={32} color={theme.accent} />
              <View style={styles.sectionTextContainer}>
                <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
                  Your Loved Ones
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.secondaryText }]}>
                  Tap to hear • Hold for photos
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsContainer}
          >
            {familyMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.cardBackground,
                    shadowColor: theme.shadow,
                  },
                ]}
                onPress={() => handleCardPress(member)}
                onLongPress={() => handleCardLongPress(member)}
                delayLongPress={500}
                activeOpacity={0.8}
              >
                <View style={styles.cardContent}>
                  <Image
                    source={{ uri: member.imageUrl }}
                    style={[styles.cardImage, { borderColor: theme.accent }]}
                  />
                  <Text style={[styles.cardName, { color: theme.primaryText }]}>
                    {member.name}
                  </Text>
                  <View
                    style={[
                      styles.cardRelationBadge,
                      { backgroundColor: theme.accent },
                    ]}
                  >
                    <Text style={styles.cardRelation}>{member.relation}</Text>
                  </View>
                  <View style={styles.cardIconsRow}>
                    <View style={styles.cardSoundIcon}>
                      <Ionicons name="volume-high" size={16} color={theme.accent} />
                    </View>
                    {member.media && member.media.length > 0 && (
                      <View style={[styles.cardMediaBadge, { backgroundColor: theme.primary }]}>
                        <Ionicons name="images" size={12} color="#FFFFFF" />
                        <Text style={styles.cardMediaCount}>{member.media.length}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* SECTION DIVIDER */}
        <View style={styles.sectionDivider} />

        {/* VOICE ASSISTANT SECTION */}
        <View style={[styles.voiceSectionWrapper, { backgroundColor: theme.background }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="mic-circle" size={32} color={theme.accent} />
              <View style={styles.sectionTextContainer}>
                <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
                  Voice Assistant
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.secondaryText }]}>
                  Powered by Gemini AI
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.voiceSection,
              { backgroundColor: theme.cardBackground, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.voicePrompt, { color: theme.secondaryText }]}>
              {isProcessingVoice ? '🤔 Thinking...' : 
               isListening ? '🎤 Listening...' : 
               'Tap the microphone to ask me anything'}
            </Text>

          <View style={styles.microphoneWrapper}>
            {/* Pulse rings behind the button */}
            {(isListening || isProcessingVoice) && (
              <View style={styles.listeningIndicator}>
                <View style={[styles.pulseRing, styles.pulseRing3, { borderColor: isProcessingVoice ? '#FF9800' : theme.danger }]} />
                <View style={[styles.pulseRing, styles.pulseRing2, { borderColor: isProcessingVoice ? '#FF9800' : theme.danger }]} />
                <View style={[styles.pulseRing, { borderColor: isProcessingVoice ? '#FF9800' : theme.danger }]} />
              </View>
            )}
            
            <Animated.View
              style={[
                styles.microphoneContainer,
                {
                  transform: [{ scale: microphoneScale }],
                },
              ]}
            >
              <TouchableOpacity
                onPress={handleMicrophonePress}
                activeOpacity={0.7}
                disabled={isProcessingVoice}
              >
                <LinearGradient
                  colors={
                    isProcessingVoice
                      ? ['#FF9800', '#FFB74D']
                      : isListening
                      ? [theme.danger, '#FCA5A5']
                      : [theme.micGradient1, theme.micGradient2]
                  }
                  style={[
                    styles.microphoneButton,
                    isProcessingVoice && { opacity: 0.8 }
                  ]}
                >
                  <Ionicons
                    name={
                      isProcessingVoice ? 'hourglass' :
                      isListening ? 'radio' : 'mic'
                    }
                    size={56}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {voiceResponse && !isListening && !isProcessingVoice && (
            <View style={[styles.voiceResponseBox, { backgroundColor: theme.accent + '15', borderColor: theme.accent }]}>
              <Ionicons name="chatbubble" size={18} color={theme.accent} />
              <Text style={[styles.voiceResponseText, { color: theme.primaryText }]} numberOfLines={3}>
                {voiceResponse}
              </Text>
            </View>
          )}

          <Text style={[styles.voiceHint, { color: theme.secondaryText }]}>
            Try: "What day is today?" or "Who is Sarah?"
          </Text>
        </View>
        </View>

        {/* SECTION DIVIDER */}
        <View style={styles.sectionDivider} />

        {/* DAILY REMINDERS SECTION - Dynamic from Backend */}
        <View style={[styles.remindersSection, { backgroundColor: theme.background }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="notifications-circle" size={32} color={theme.accent} />
              <View style={styles.sectionTextContainer}>
                <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
                  Today's Schedule
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.secondaryText }]}>
                  {isLoadingSchedule ? 'Loading...' : `${todaySchedule.filter(i => !i.completed).length} tasks remaining`}
                </Text>
              </View>
            </View>
          </View>

          {isLoadingSchedule ? (
            <View style={[styles.reminderCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.reminderTitle, { color: theme.secondaryText, textAlign: 'center' }]}>
                Loading schedule...
              </Text>
            </View>
          ) : (
            todaySchedule.slice(0, 5).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.reminderCard, 
                  { 
                    backgroundColor: theme.cardBackground,
                    opacity: item.completed ? 0.6 : 1,
                  }
                ]}
                onPress={() => !item.completed && completeScheduleItem(item.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.reminderIcon, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <View style={styles.reminderContent}>
                  <Text style={[
                    styles.reminderTitle, 
                    { 
                      color: theme.primaryText,
                      textDecorationLine: item.completed ? 'line-through' : 'none',
                    }
                  ]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.reminderTime, { color: theme.secondaryText }]}>
                    {item.time} • {item.completed ? 'Completed ✓' : (item.note || 'Upcoming')}
                  </Text>
                </View>
                {!item.completed && (
                  <TouchableOpacity
                    onPress={() => completeScheduleItem(item.id)}
                    style={[styles.completeButton, { backgroundColor: theme.success }]}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))
          )}

          {todaySchedule.length > 5 && (
            <TouchableOpacity
              style={[styles.viewAllButton, { borderColor: theme.accent }]}
              onPress={() => setShowTasksModal(true)}
            >
              <Text style={[styles.viewAllText, { color: theme.accent }]}>
                View All ({todaySchedule.length} items)
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.accent} />
            </TouchableOpacity>
          )}
        </View>

        {/* SECTION DIVIDER */}
        <View style={styles.sectionDivider} />

        {/* GPS LOCATION TRACKING SECTION */}
        <View style={[styles.gpsSection, { backgroundColor: theme.background }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="navigate-circle" size={32} color={theme.accent} />
              <View style={styles.sectionTextContainer}>
                <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
                  GPS Location Tracking
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.secondaryText }]}>
                  {isTracking ? (isMoving ? 'Updating every 1 min (Moving)' : 'Monitoring your location') : 'Keep you safe with location monitoring'}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.gpsCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            {/* Status Badge */}
            <View style={[styles.gpsStatusBadge, { backgroundColor: isTracking ? theme.success : theme.secondaryText }]}>
              <Ionicons name={isTracking ? 'radio-button-on' : 'radio-button-off'} size={16} color="#FFFFFF" />
              <Text style={styles.gpsStatusText}>
                {isTracking ? 'TRACKING ACTIVE' : 'TRACKING INACTIVE'}
              </Text>
            </View>

            {/* Current Location */}
            {location && (
              <View style={styles.gpsInfoContainer}>
                <View style={styles.gpsInfoRow}>
                  <Ionicons name="location-outline" size={20} color={theme.accent} />
                  <View style={styles.gpsInfoTextContainer}>
                    <Text style={[styles.gpsInfoLabel, { color: theme.secondaryText }]}>Current Location</Text>
                    <Text style={[styles.gpsInfoValue, { color: theme.primaryText }]} numberOfLines={2}>
                      {locationAddress}
                    </Text>
                  </View>
                </View>

                <View style={styles.gpsInfoRow}>
                  <Ionicons name="navigate-outline" size={20} color={theme.accent} />
                  <View style={styles.gpsInfoTextContainer}>
                    <Text style={[styles.gpsInfoLabel, { color: theme.secondaryText }]}>Coordinates</Text>
                    <Text style={[styles.gpsInfoValue, { color: theme.primaryText }]}>
                      {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
                    </Text>
                  </View>
                </View>

                {homeLocation && (
                  <View style={styles.gpsInfoRow}>
                    <Ionicons name="home-outline" size={20} color={theme.success} />
                    <View style={styles.gpsInfoTextContainer}>
                      <Text style={[styles.gpsInfoLabel, { color: theme.secondaryText }]}>Distance from Home</Text>
                      <Text style={[styles.gpsInfoValue, { color: distanceFromHome > geofenceRadius ? theme.danger : theme.success }]}>
                        {distanceFromHome}m {distanceFromHome > geofenceRadius && '⚠️ Out of safe zone'}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.gpsInfoRow}>
                  <Ionicons name={isMoving ? 'walk' : 'hand-right-outline'} size={20} color={isMoving ? theme.warning : theme.success} />
                  <View style={styles.gpsInfoTextContainer}>
                    <Text style={[styles.gpsInfoLabel, { color: theme.secondaryText }]}>Movement Status</Text>
                    <Text style={[styles.gpsInfoValue, { color: theme.primaryText }]}>
                      {isMoving ? '🚶 Moving' : '🛑 Stationary'}
                    </Text>
                  </View>
                </View>

                <View style={styles.gpsInfoRow}>
                  <Ionicons name="shield-outline" size={20} color={theme.accent} />
                  <View style={styles.gpsInfoTextContainer}>
                    <Text style={[styles.gpsInfoLabel, { color: theme.secondaryText }]}>Safe Zone Radius</Text>
                    <Text style={[styles.gpsInfoValue, { color: theme.primaryText }]}>
                      {geofenceRadius} meters (Set by Caretaker)
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {!location && (
              <View style={styles.gpsLoadingContainer}>
                <Ionicons name="location-outline" size={48} color={theme.secondaryText} />
                <Text style={[styles.gpsLoadingText, { color: theme.secondaryText }]}>
                  Fetching your location...
                </Text>
              </View>
            )}

            {/* Alert Info */}
            <View style={[styles.gpsAlertInfo, { backgroundColor: `${theme.accent}15`, borderColor: theme.accent }]}>
              <Ionicons name="information-circle" size={20} color={theme.accent} />
              <Text style={[styles.gpsAlertInfoText, { color: theme.primaryText }]}>
                ✓ Background tracking is always active{"\n"}
                ✓ Caretaker will be notified if you move beyond the safe zone{"\n"}
                ✓ Safe zone radius is managed by your caretaker
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION DIVIDER */}
        <View style={styles.sectionDivider} />

        {/* SAFETY STATUS SECTION */}
        <View style={[styles.safetySection, { backgroundColor: theme.background }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="shield-checkmark-outline" size={32} color={theme.success} />
              <View style={styles.sectionTextContainer}>
                <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
                  Safety Status
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.secondaryText }]}>
                  You're safe and monitored
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.safetyCard, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.safetyItem}>
              <Ionicons name="location" size={20} color={theme.success} />
              <Text style={[styles.safetyText, { color: theme.primaryText }]}>
                Location Tracking: Active
              </Text>
            </View>
            <View style={styles.safetyItem}>
              <Ionicons name="call" size={20} color={theme.success} />
              <Text style={[styles.safetyText, { color: theme.primaryText }]}>
                Emergency Contact: Ready
              </Text>
            </View>
            <View style={styles.safetyItem}>
              <Ionicons name="heart" size={20} color={theme.success} />
              <Text style={[styles.safetyText, { color: theme.primaryText }]}>
                Health Monitoring: Normal
              </Text>
            </View>
          </View>
        </View>

        {/* BOTTOM SPACING */}
        <View style={{ height: 40 }} />

        {/* DEV BUTTONS - Hidden at bottom */}
        <View style={styles.devButtonsRow}>
          <TouchableOpacity
            style={styles.devLogoutButton}
            onPress={handleDevLogout}
          >
            <Text style={styles.devLogoutText}>🔓 Clear Auth</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.devLogoutButton, styles.devTestNotifButton]}
            onPress={handleTestNotification}
          >
            <Text style={styles.devTestNotifText}>🔔 Test Notif</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* EMERGENCY SOS SLIDER - Bottom Section */}
      <View style={[styles.bottomSection, { backgroundColor: theme.background }]}>
        <View style={styles.emergencySliderContainer}>
          {/* Slider Track */}
          <LinearGradient
            colors={
              emergencyStatus === 'sent' ? ['#00C853', '#00E676'] :
              emergencyStatus === 'sending' ? ['#FF9800', '#FFB74D'] :
              ['#FF3B30', '#FF6B6B']
            }
            style={styles.emergencySliderTrack}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {/* Animated Arrow Hints - only show when idle */}
            {emergencyStatus === 'idle' && (
              <View style={styles.sliderArrowHints}>
                <Animated.View style={[styles.sliderArrow, { opacity: 0.3 }]}>
                  <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
                </Animated.View>
                <Animated.View style={[styles.sliderArrow, { opacity: 0.5 }]}>
                  <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
                </Animated.View>
                <Animated.View style={[styles.sliderArrow, { opacity: 0.7 }]}>
                  <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
                </Animated.View>
              </View>
            )}

            {/* Slider Text - Dynamic based on status */}
            <View style={styles.sliderTextContainer}>
              <Ionicons 
                name={
                  emergencyStatus === 'sent' ? "checkmark-circle" :
                  emergencyStatus === 'sending' ? "sync" :
                  "alert-circle"
                } 
                size={28} 
                color="#FFFFFF" 
              />
              <Text style={styles.sliderText}>
                {emergencyStatus === 'sent' ? '✓ ALERT SENT!' :
                 emergencyStatus === 'sending' ? 'SENDING...' :
                 'SLIDE FOR EMERGENCY'}
              </Text>
            </View>

            {/* Draggable Slider Thumb - hidden when sending/sent */}
            {emergencyStatus === 'idle' && (
              <Animated.View
                style={[
                  styles.sliderThumb,
                  { transform: [{ translateX: sliderX }] },
                ]}
                {...emergencyPanResponder.panHandlers}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F5F5F5']}
                  style={styles.sliderThumbInner}
                >
                  <View style={styles.sliderThumbIcon}>
                    <Ionicons name="arrow-forward" size={28} color="#FF3B30" />
                  </View>
                  <Text style={[styles.sliderThumbText, { color: '#FF3B30' }]}>SOS</Text>
                </LinearGradient>
              </Animated.View>
            )}

            {/* Right Side Icon */}
            <View style={styles.sliderEndIcon}>
              <Ionicons 
                name={emergencyStatus === 'sent' ? "checkmark-done" : "shield-checkmark"} 
                size={32} 
                color="rgba(255,255,255,0.7)" 
              />
            </View>
          </LinearGradient>

          {/* Bottom Row: Route & Tasks */}
          <View style={styles.bottomButtonsRow}>
            <TouchableOpacity
              style={[styles.bottomActionBtn, { backgroundColor: theme.cardBackground }]}
              onPress={() => {
                loadLocationHistory();
                setShowRouteModal(true);
              }}
            >
              <Ionicons name="map-outline" size={20} color={theme.primary} />
              <Text style={[styles.bottomActionText, { color: theme.primary }]}>Route</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bottomActionBtn, { backgroundColor: theme.cardBackground }]}
              onPress={testNotification}
            >
              <Ionicons name="notifications-outline" size={20} color="#F59E0B" />
              <Text style={[styles.bottomActionText, { color: '#F59E0B' }]}>Test</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bottomActionBtn, { backgroundColor: theme.cardBackground }]}
              onPress={() => setShowTasksModal(true)}
            >
              <Ionicons name="list-outline" size={20} color={theme.accent} />
              <Text style={[styles.bottomActionText, { color: theme.accent }]}>Tasks</Text>
              {getTodaysTasks().filter(t => !t.completed).length > 0 && (
                <View style={styles.taskBadge}>
                  <Text style={styles.taskBadgeText}>
                    {getTodaysTasks().filter(t => !t.completed).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Notification Popup Modal - Half Screen */}
      <Modal
        visible={showNotificationPopup}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNotificationPopup(false)}
      >
        <View style={styles.notificationPopupOverlay}>
          <View style={[styles.notificationPopupContent, { backgroundColor: theme.cardBackground }]}>
            {/* Handle bar */}
            <View style={styles.popupHandle} />
            
            {activeNotification && (
              <>
                {/* Icon Circle */}
                <View style={[styles.notificationIconCircle, { backgroundColor: activeNotification.color + '20' }]}>
                  <Ionicons 
                    name={activeNotification.icon || 'notifications'} 
                    size={64} 
                    color={activeNotification.color || theme.accent} 
                  />
                </View>
                
                {/* Title */}
                <Text style={[styles.notificationPopupTitle, { color: theme.primaryText }]}>
                  {activeNotification.title}
                </Text>
                
                {/* Body */}
                <Text style={[styles.notificationPopupBody, { color: theme.secondaryText }]}>
                  {activeNotification.body}
                </Text>
                
                {/* Action Buttons */}
                <View style={styles.notificationPopupActions}>
                  <TouchableOpacity
                    style={[styles.notificationDismissBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={() => {
                      setShowNotificationPopup(false);
                      setActiveNotification(null);
                      Speech.stop();
                    }}
                  >
                    <Ionicons name="close" size={24} color={theme.secondaryText} />
                    <Text style={[styles.notificationBtnText, { color: theme.secondaryText }]}>Dismiss</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.notificationCompleteBtn, { backgroundColor: activeNotification.color || theme.success }]}
                    onPress={() => {
                      if (activeNotification.itemId) {
                        completeScheduleItem(activeNotification.itemId);
                      } else {
                        setShowNotificationPopup(false);
                        setActiveNotification(null);
                      }
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                    <Text style={[styles.notificationBtnText, { color: '#FFFFFF' }]}>Done</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Route History Modal */}
      <Modal
        visible={showRouteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRouteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.routeModalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.routeModalHeader}>
              <View style={styles.routeModalTitleRow}>
                <Ionicons name="footsteps" size={28} color={theme.primary} />
                <Text style={[styles.routeModalTitle, { color: theme.primaryText }]}>
                  Route History
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowRouteModal(false)}>
                <Ionicons name="close-circle" size={32} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.routeModalSubtitle, { color: theme.secondaryText }]}>
              {locationHistory.length} locations tracked today
            </Text>

            <ScrollView style={styles.routeListContainer} showsVerticalScrollIndicator={false}>
              {locationHistory.length > 0 ? (
                [...locationHistory].reverse().map((item, index) => (
                  <View key={index} style={[styles.routeItem, { backgroundColor: theme.background }]}>
                    <View style={styles.routeItemTimeline}>
                      <View style={[styles.routeItemDot, { backgroundColor: index === 0 ? theme.primary : theme.border }]} />
                      {index < locationHistory.length - 1 && (
                        <View style={[styles.routeItemLine, { backgroundColor: theme.border }]} />
                      )}
                    </View>
                    <View style={styles.routeItemContent}>
                      <Text style={[styles.routeItemTime, { color: theme.primaryText }]}>
                        {formatRouteTime(item.timestamp)}
                      </Text>
                      <Text style={[styles.routeItemDate, { color: theme.secondaryText }]}>
                        {formatRouteDate(item.timestamp)}
                      </Text>
                      <Text style={[styles.routeItemAddress, { color: theme.secondaryText }]} numberOfLines={2}>
                        {item.address || `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`}
                      </Text>
                      <TouchableOpacity
                        style={[styles.routeItemMapBtn, { borderColor: theme.primary }]}
                        onPress={() => {
                          Linking.openURL(`https://maps.google.com/?q=${item.latitude},${item.longitude}`);
                        }}
                      >
                        <Ionicons name="map" size={14} color={theme.primary} />
                        <Text style={[styles.routeItemMapText, { color: theme.primary }]}>View Map</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noRouteData}>
                  <Ionicons name="location-outline" size={48} color={theme.secondaryText} />
                  <Text style={[styles.noRouteText, { color: theme.secondaryText }]}>
                    No route history yet
                  </Text>
                  <Text style={[styles.noRouteSubtext, { color: theme.tertiaryText }]}>
                    Location tracking will record your path
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.routeModalActions}>
              <TouchableOpacity
                style={[styles.routeClearBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={clearLocationHistory}
              >
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                <Text style={styles.routeClearText}>Clear History</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.routeCloseBtn, { backgroundColor: theme.primary }]}
                onPress={() => setShowRouteModal(false)}
              >
                <Text style={styles.routeCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FAMILY MEMBER MODAL - Photos & Videos */}
      <Modal
        visible={showMemberModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMemberModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.memberModalContent, { backgroundColor: theme.cardBackground }]}>
            {/* Modal Header */}
            <View style={styles.memberModalHeader}>
              <View style={styles.memberModalTitleRow}>
                {selectedMember && (
                  <Image
                    source={{ uri: selectedMember.imageUrl }}
                    style={styles.memberModalAvatar}
                  />
                )}
                <View>
                  <Text style={[styles.memberModalName, { color: theme.primaryText }]}>
                    {selectedMember?.name}
                  </Text>
                  <Text style={[styles.memberModalRelation, { color: theme.secondaryText }]}>
                    Your {selectedMember?.relation}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowMemberModal(false)}>
                <Ionicons name="close-circle" size={32} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.memberModalActions}>
              <TouchableOpacity
                style={[styles.memberActionBtn, { backgroundColor: '#4CAF50' }]}
                onPress={pickImageFromGallery}
              >
                <Ionicons name="images" size={24} color="#FFFFFF" />
                <Text style={styles.memberActionText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.memberActionBtn, { backgroundColor: '#2196F3' }]}
                onPress={takePhoto}
              >
                <Ionicons name="camera" size={24} color="#FFFFFF" />
                <Text style={styles.memberActionText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.memberActionBtn, { backgroundColor: '#FF5722' }]}
                onPress={recordVideo}
              >
                <Ionicons name="videocam" size={24} color="#FFFFFF" />
                <Text style={styles.memberActionText}>Video</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.memberActionBtn, { backgroundColor: '#E91E63' }]}
                onPress={openGooglePhotos}
              >
                <Ionicons name="logo-google" size={24} color="#FFFFFF" />
                <Text style={styles.memberActionText}>Google</Text>
              </TouchableOpacity>
            </View>

            {/* Media Gallery */}
            <Text style={[styles.memberGalleryTitle, { color: theme.primaryText }]}>
              Photos & Videos ({selectedMember?.media?.length || 0})
            </Text>

            <ScrollView style={styles.memberGalleryScroll} showsVerticalScrollIndicator={false}>
              {selectedMember?.media && selectedMember.media.length > 0 ? (
                <View style={styles.memberGalleryGrid}>
                  {selectedMember.media.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.memberGalleryItem}
                      onPress={() => viewMedia(index)}
                      onLongPress={() => deleteMedia(index)}
                    >
                      <Image
                        source={{ uri: item.uri }}
                        style={styles.memberGalleryImage}
                      />
                      {item.type === 'video' && (
                        <View style={styles.videoOverlay}>
                          <Ionicons name="play-circle" size={32} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.noMediaContainer}>
                  <Ionicons name="images-outline" size={64} color={theme.secondaryText} />
                  <Text style={[styles.noMediaText, { color: theme.secondaryText }]}>
                    No photos yet
                  </Text>
                  <Text style={[styles.noMediaSubtext, { color: theme.tertiaryText }]}>
                    Add photos to remember {selectedMember?.name}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Speak Button */}
            <TouchableOpacity
              style={[styles.memberSpeakBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                if (selectedMember) {
                  Speech.speak(
                    `This is ${selectedMember.name}, your ${selectedMember.relation}. You have ${selectedMember.media?.length || 0} photos together.`,
                    { language: 'en' }
                  );
                }
              }}
            >
              <Ionicons name="volume-high" size={22} color="#FFFFFF" />
              <Text style={styles.memberSpeakText}>Hear About {selectedMember?.name}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MEDIA VIEWER MODAL */}
      <Modal
        visible={showMediaViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMediaViewer(false)}
      >
        <View style={styles.mediaViewerContainer}>
          <TouchableOpacity
            style={styles.mediaViewerClose}
            onPress={() => setShowMediaViewer(false)}
          >
            <Ionicons name="close-circle" size={40} color="#FFFFFF" />
          </TouchableOpacity>

          {selectedMember?.media && selectedMember.media[currentMediaIndex] && (
            <Image
              source={{ uri: selectedMember.media[currentMediaIndex].uri }}
              style={styles.mediaViewerImage}
              resizeMode="contain"
            />
          )}

          {/* Navigation Arrows */}
          {selectedMember?.media && selectedMember.media.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.mediaNavBtn, styles.mediaNavLeft]}
                onPress={() => setCurrentMediaIndex((prev) => 
                  prev > 0 ? prev - 1 : selectedMember.media.length - 1
                )}
              >
                <Ionicons name="chevron-back" size={40} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mediaNavBtn, styles.mediaNavRight]}
                onPress={() => setCurrentMediaIndex((prev) => 
                  prev < selectedMember.media.length - 1 ? prev + 1 : 0
                )}
              >
                <Ionicons name="chevron-forward" size={40} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}

          {/* Image Counter */}
          <View style={styles.mediaCounter}>
            <Text style={styles.mediaCounterText}>
              {currentMediaIndex + 1} / {selectedMember?.media?.length || 0}
            </Text>
          </View>
        </View>
      </Modal>

      {/* TASKS MODAL */}
      <Modal
        visible={showTasksModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTasksModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.tasksModalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.tasksModalHeader}>
              <View style={styles.tasksModalTitleRow}>
                <Ionicons name="clipboard-outline" size={28} color={theme.accent} />
                <Text style={[styles.tasksModalTitle, { color: theme.primaryText }]}>
                  Today's Tasks
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowTasksModal(false)}>
                <Ionicons name="close-circle" size={32} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.tasksSubtitle, { color: theme.secondaryText }]}>
              Tasks set by your caretaker
            </Text>

            <ScrollView style={styles.tasksList} showsVerticalScrollIndicator={false}>
              {getTodaysTasks().length > 0 ? (
                getTodaysTasks().map((task) => (
                  <View 
                    key={task.id} 
                    style={[
                      styles.taskItem, 
                      { backgroundColor: theme.background },
                      task.completed && styles.taskItemCompleted
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.taskCheckbox,
                        { borderColor: task.completed ? theme.success : theme.accent }
                      ]}
                      onPress={() => !task.completed && completeTask(task.id)}
                    >
                      {task.completed && (
                        <Ionicons name="checkmark" size={18} color={theme.success} />
                      )}
                    </TouchableOpacity>
                    <View style={styles.taskContent}>
                      <Text 
                        style={[
                          styles.taskTitle, 
                          { color: theme.primaryText },
                          task.completed && styles.taskTitleCompleted
                        ]}
                      >
                        {task.title}
                      </Text>
                      {task.description && (
                        <Text style={[styles.taskDescription, { color: theme.secondaryText }]}>
                          {task.description}
                        </Text>
                      )}
                      <View style={styles.taskTimeRow}>
                        <Ionicons name="time-outline" size={14} color={theme.secondaryText} />
                        <Text style={[styles.taskTime, { color: theme.secondaryText }]}>
                          {new Date(task.scheduledTime).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.taskSpeakBtn}
                      onPress={() => Speech.speak(`${task.title}. ${task.description || ''}`, { language: 'en' })}
                    >
                      <Ionicons name="volume-high" size={20} color={theme.accent} />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.noTasksContainer}>
                  <Ionicons name="checkmark-done-circle" size={64} color={theme.success} />
                  <Text style={[styles.noTasksText, { color: theme.primaryText }]}>
                    All done for today!
                  </Text>
                  <Text style={[styles.noTasksSubtext, { color: theme.secondaryText }]}>
                    Your caretaker can add new tasks
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.tasksCloseBtn, { backgroundColor: theme.accent }]}
              onPress={() => setShowTasksModal(false)}
            >
              <Text style={styles.tasksCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMedicationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMedicationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.modalIconContainer,
                { backgroundColor: theme.warning + '20' },
              ]}
            >
              <Ionicons name="medical" size={48} color={theme.warning} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.primaryText }]}>
              Medication Reminder
            </Text>
            <Text style={[styles.modalMessage, { color: theme.secondaryText }]}>
              It's time to take your afternoon medication. Have you taken your pills?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  { backgroundColor: theme.success },
                ]}
                onPress={handleMedicationTaken}
              >
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.modalButtonText}>Yes, I Took It</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSecondary,
                  { borderColor: theme.border },
                ]}
                onPress={handleMedicationSkip}
              >
                <Ionicons name="time-outline" size={24} color={theme.primaryText} />
                <Text
                  style={[
                    styles.modalButtonTextSecondary,
                    { color: theme.primaryText },
                  ]}
                >
                  Remind Me Later
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  darkModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // HERO SECTION
  heroSection: {
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 24,
  },
  heroContent: {
    alignItems: 'center',
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  greetingText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 24,
  },
  clockContainer: {
    marginBottom: 16,
  },
  clockText: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  dateText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
  },

  // QUICK STATS SECTION
  quickStatsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },

  // SECTION DIVIDER
  sectionDivider: {
    height: 8,
    backgroundColor: 'transparent',
  },

  // SECTION HEADERS
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTextContainer: {
    flexDirection: 'column',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.8,
  },

  // MEMORY/FAMILY SECTION
  memorySection: {
    paddingTop: 16,
    paddingBottom: 24,
  },

  // FAMILY CARDS
  cardsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    width: width * 0.45,
    borderRadius: 24,
    marginHorizontal: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  cardContent: {
    padding: 20,
    alignItems: 'center',
  },
  cardImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 5,
  },
  cardName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  cardRelationBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 6,
  },
  cardRelation: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  cardSoundIcon: {
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    padding: 8,
    borderRadius: 16,
  },
  
  // VOICE ASSISTANT SECTION
  voiceSectionWrapper: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  voiceSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  voiceTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  voicePrompt: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
  },
  microphoneWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    height: 220,
    width: 220,
    alignSelf: 'center',
  },
  microphoneContainer: {
    zIndex: 10,
  },
  microphoneButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  listeningIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    opacity: 0.6,
  },
  pulseRing2: {
    width: 190,
    height: 190,
    borderRadius: 95,
    opacity: 0.4,
  },
  pulseRing3: {
    width: 220,
    height: 220,
    borderRadius: 110,
    marginTop: -30,
    opacity: 0.2,
  },
  voiceHint: {
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
  },
  voiceResponseBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
  },
  voiceResponseText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },

  // REMINDERS SECTION
  remindersSection: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 18,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  reminderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  reminderTime: {
    fontSize: 14,
    fontWeight: '500',
  },
  completeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // SAFETY SECTION
  safetySection: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  safetyCard: {
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  safetyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  safetyText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },

  // EMERGENCY SLIDER STYLES
  emergencySliderContainer: {
    alignItems: 'center',
  },
  emergencySliderTrack: {
    width: '100%',
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sliderArrowHints: {
    position: 'absolute',
    left: 80,
    flexDirection: 'row',
    gap: 0,
  },
  sliderArrow: {
    marginLeft: -8,
  },
  sliderTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sliderText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    left: 4,
    width: 72,
    height: 72,
    borderRadius: 36,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  sliderThumbInner: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  sliderThumbIcon: {
    marginBottom: -4,
  },
  sliderThumbText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FF3B30',
    letterSpacing: 1,
  },
  sliderEndIcon: {
    position: 'absolute',
    right: 16,
  },
  routeHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  routeHistoryText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ROUTE MODAL STYLES
  routeModalContent: {
    width: width,
    height: height * 0.75,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  routeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeModalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  routeModalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  routeListContainer: {
    flex: 1,
    marginBottom: 16,
  },
  routeItem: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
  },
  routeItemTimeline: {
    width: 30,
    alignItems: 'center',
  },
  routeItemDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeItemLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  routeItemContent: {
    flex: 1,
    marginLeft: 8,
  },
  routeItemTime: {
    fontSize: 18,
    fontWeight: '700',
  },
  routeItemDate: {
    fontSize: 13,
    marginBottom: 4,
  },
  routeItemAddress: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  routeItemMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  routeItemMapText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noRouteData: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noRouteText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  noRouteSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  routeModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  routeClearBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  routeClearText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
  routeCloseBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  routeCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: width,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: 48,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  modalButtons: {
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalButtonPrimary: {},
  modalButtonSecondary: {
    borderWidth: 2,
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalButtonTextSecondary: {
    fontSize: 18,
    fontWeight: '600',
  },
  // GPS Tracking Section Styles
  gpsSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  gpsCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  gpsStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    gap: 6,
  },
  gpsStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gpsInfoContainer: {
    gap: 16,
    marginBottom: 20,
  },
  gpsInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  gpsInfoTextContainer: {
    flex: 1,
  },
  gpsInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  gpsInfoValue: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  gpsLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  gpsLoadingText: {
    fontSize: 15,
    marginTop: 12,
    fontWeight: '500',
  },
  gpsButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  gpsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  gpsButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  gpsAlertInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  gpsAlertInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  // Dev Buttons Row
  devButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  devLogoutButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  devLogoutText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  devTestNotifButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  devTestNotifText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },

  // Card Icons Row
  cardIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  cardMediaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  cardMediaCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // MEMBER MODAL STYLES
  memberModalContent: {
    width: width,
    height: height * 0.85,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  memberModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  memberModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  memberModalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#6366F1',
  },
  memberModalName: {
    fontSize: 24,
    fontWeight: '700',
  },
  memberModalRelation: {
    fontSize: 16,
    textTransform: 'capitalize',
  },
  memberModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  memberActionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 6,
  },
  memberActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  memberGalleryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  memberGalleryScroll: {
    flex: 1,
  },
  memberGalleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberGalleryItem: {
    width: (width - 64) / 3,
    height: (width - 64) / 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  memberGalleryImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMediaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noMediaText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  noMediaSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  memberSpeakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  memberSpeakText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // MEDIA VIEWER STYLES
  mediaViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  mediaViewerImage: {
    width: width,
    height: height * 0.7,
  },
  mediaNavBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
  },
  mediaNavLeft: {
    left: 10,
  },
  mediaNavRight: {
    right: 10,
  },
  mediaCounter: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  mediaCounterText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // BOTTOM BUTTONS ROW
  bottomButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  bottomActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bottomActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // TASKS MODAL STYLES
  tasksModalContent: {
    width: width,
    height: height * 0.7,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  tasksModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tasksModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tasksModalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  tasksSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  tasksList: {
    flex: 1,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
  },
  taskItemCompleted: {
    opacity: 0.6,
  },
  taskCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
  },
  taskDescription: {
    fontSize: 14,
    marginBottom: 6,
  },
  taskTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskTime: {
    fontSize: 13,
  },
  taskSpeakBtn: {
    padding: 8,
  },
  noTasksContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noTasksText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  noTasksSubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  tasksCloseBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  tasksCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // NOTIFICATION POPUP STYLES
  notificationPopupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  notificationPopupContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    minHeight: height * 0.5,
    alignItems: 'center',
  },
  popupHandle: {
    width: 48,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    marginBottom: 24,
  },
  notificationIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  notificationPopupTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  notificationPopupBody: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  notificationPopupActions: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    paddingHorizontal: 16,
  },
  notificationDismissBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    gap: 8,
  },
  notificationCompleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  notificationBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
