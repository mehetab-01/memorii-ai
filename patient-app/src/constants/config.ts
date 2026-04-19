import { Platform } from 'react-native';

export const API_BASE_URL = 'https://memorii-backend.onrender.com/api';

export const SOCKET_URL = __DEV__
  ? Platform.OS === 'ios'
    ? 'http://localhost:8000'
    : 'http://10.0.2.2:8000'
  : 'https://your-production-url.com';

export const LOCATION_TASK_NAME = 'background-location-task';
export const GEOFENCE_RADIUS = 250;
export const MOVEMENT_THRESHOLD = 10;
export const LOCATION_UPDATE_INTERVAL = 60000;

export const NOTIFICATION_CHANNELS = {
  alerts: 'memorii-alerts',
  emergency: 'memorii-emergency',
  tasks: 'memorii-tasks',
} as const;

export const STORAGE_KEYS = {
  // SecureStore
  SESSION_TOKEN: 'user_session_token',
  PATIENT_ID: 'patient_id',
  PATIENT_NAME: 'patient_name',
  CARETAKER_CODE: 'caretaker_code',
  // AsyncStorage
  CARETAKER_CODE_ASYNC: 'caretakerCode',
  PROFILE_DATA: 'profileData',
  GEOFENCE_RADIUS: 'geofenceRadius',
  HOME_LOCATION: 'homeLocation',
  LOCATION_HISTORY: 'locationHistory',
  FAMILY_MEMBERS: 'familyMembers',
  PATIENT_MEDICATIONS: 'patientMedications',
  DAILY_STATS: 'dailyStats',
  CARETAKER_TASKS: 'caretakerTasks',
  THEME_PREFERENCE: 'theme_preference',
} as const;

export const INITIAL_FAMILY_MEMBERS = [
  { id: '1', name: 'Sarah', relation: 'daughter', imageUrl: 'https://i.pravatar.cc/300?img=1', media: [] },
  { id: '2', name: 'Michael', relation: 'son', imageUrl: 'https://i.pravatar.cc/300?img=12', media: [] },
  { id: '3', name: 'Emma', relation: 'granddaughter', imageUrl: 'https://i.pravatar.cc/300?img=5', media: [] },
  { id: '4', name: 'Robert', relation: 'brother', imageUrl: 'https://i.pravatar.cc/300?img=15', media: [] },
];

export const DEFAULT_SCHEDULE = [
  { id: 'default-1', title: 'Morning Medication', time: '09:00', icon: 'medical', color: '#5B6ABF', completed: false },
  { id: 'default-2', title: 'Breakfast', time: '09:30', icon: 'restaurant', color: '#E8A87C', completed: false },
  { id: 'default-3', title: 'Morning Walk', time: '10:00', icon: 'walk', color: '#7BC67E', completed: false },
  { id: 'default-4', title: 'Lunch Time', time: '12:30', icon: 'restaurant', color: '#E8A87C', completed: false },
  { id: 'default-5', title: 'Afternoon Medication', time: '14:00', icon: 'medical', color: '#5B6ABF', completed: false },
  { id: 'default-6', title: 'Doctor Appointment', time: '15:00', icon: 'calendar', color: '#F0C75E', completed: false, note: 'Dr. Smith - Room 204' },
  { id: 'default-7', title: 'Evening Walk', time: '17:00', icon: 'walk', color: '#7BC67E', completed: false },
  { id: 'default-8', title: 'Dinner', time: '19:00', icon: 'restaurant', color: '#E8A87C', completed: false },
  { id: 'default-9', title: 'Night Medication', time: '21:00', icon: 'medical', color: '#5B6ABF', completed: false },
];
