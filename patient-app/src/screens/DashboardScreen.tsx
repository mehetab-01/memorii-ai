/**
 * DashboardScreen — fully redesigned
 * All original logic (API calls, sockets, permissions, notifications, family, SOS) preserved exactly.
 * Visual layer completely replaced with new design system.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, View, SafeAreaView, ScrollView, Switch, Text,
  TouchableOpacity, Pressable, Modal, Alert, Linking, Platform, RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

// Theme
import { useTheme } from '../theme/ThemeContext';

// Original components (kept — logic layer)
import FamilyDetailModal from '../components/memory/FamilyDetailModal';
import MediaViewer from '../components/memory/MediaViewer';

// New design components
import { ReminderCard } from '../components/ReminderCard';
import { FamilyPhotoCard } from '../components/FamilyPhotoCard';
import { StatCard } from '../components/StatCard';
import { SOSSlider } from '../components/SOSSlider';
import { VoiceSheet } from '../components/VoiceSheet';
import { SkeletonBox, ScheduleItemSkeleton, FamilyCardSkeleton, StatCardSkeleton } from '../components/SkeletonLoader';
import { Toast, useToast } from '../components/Toast';
import { OfflineBanner } from '../components/OfflineBanner';

// Hooks
import { useLocation } from '../hooks/useLocation';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

// Services
import { api } from '../services/api';
import { socketService } from '../services/socketService';

// Storage
import { storage, StorageKeys, getVoiceHistory, appendVoiceHistory, checkAndResetDailyStats } from '../storage';

// Constants
import { INITIAL_FAMILY_MEMBERS, DEFAULT_SCHEDULE, STORAGE_KEYS, NOTIFICATION_CHANNELS } from '../constants/config';

// Set notification handler at module level (unchanged)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as any),
});

export default function DashboardScreen({ navigation }: { navigation: any }) {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { toast, show: showToast, hide: hideToast } = useToast();

  // Time & Greeting
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('');

  // Family Members
  const [familyMembers, setFamilyMembers] = useState(INITIAL_FAMILY_MEMBERS);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Emergency
  const [emergencyContact, setEmergencyContact] = useState<string | null>(null);
  const [emergencyStatus, setEmergencyStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Schedule
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);

  // Daily Stats
  const [dailyStats, setDailyStats] = useState({
    waterGlasses: { current: 0, target: 8 },
    walkingTimes: { current: 0, target: 3 },
    medicines: { current: 0, target: 3 },
  });

  // Tasks & modals
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showVoiceSheet, setShowVoiceSheet] = useState(false);
  const [voiceHistory, setVoiceHistory] = useState(getVoiceHistory());
  const [refreshing, setRefreshing] = useState(false);

  const hasSpokenGreeting = useRef(false);
  const locationHook = useLocation();
  const voiceHook = useVoiceAssistant();
  useOfflineQueue();

  // ── Time & Greeting ──────────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      setCurrentTime(`${h % 12 || 12}:${m < 10 ? '0' + m : m} ${ampm}`);
      setCurrentDate(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
      setGreeting(h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening');
    };
    const loadName = async () => {
      try {
        const name = await SecureStore.getItemAsync(STORAGE_KEYS.PATIENT_NAME);
        const profileRaw = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_DATA);
        setUserName(name || (profileRaw ? JSON.parse(profileRaw).name : 'Friend'));
      } catch { setUserName('Friend'); }
    };
    update();
    loadName();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Greet once ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (userName && !hasSpokenGreeting.current) {
      hasSpokenGreeting.current = true;
      setTimeout(() => {
        Speech.speak(`${greeting}, ${userName}. I hope you're having a wonderful day.`, { rate: 0.9 });
      }, 1500);
    }
  }, [userName, greeting]);

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    checkAndResetDailyStats();
    let cleanupFn: (() => void) | undefined;

    const init = async () => {
      await requestAllPermissions();
      await setupNotifications();
      await loadFamilyMembers();
      await fetchPatientProfile();
      await fetchDailyStats();
      await fetchTodaySchedule();
      setTimeout(() => locationHook.startGPSTracking(), 2000);

      socketService.initialize();
      const handleScheduleUpdated = () => { fetchTodaySchedule(); fetchDailyStats(); };
      const handlePatientUpdated = (data?: any) => {
        if (data?.emergency_contact) {
          setEmergencyContact(data.emergency_contact);
          storage.set(StorageKeys.EMERGENCY_CONTACT, data.emergency_contact);
        }
        if (data?.geofence_radius) {
          locationHook.setGeofenceRadius(data.geofence_radius);
          AsyncStorage.setItem(STORAGE_KEYS.GEOFENCE_RADIUS, String(data.geofence_radius));
        }
        fetchPatientProfile();
      };
      const handleReminderDue = (data: any) => {
        showToast(`🔔 ${data.title}`, 'info');
        Speech.speak(`Reminder: ${data.title}`, { rate: 0.9 });
      };

      socketService.on('schedule:updated', handleScheduleUpdated);
      socketService.on('patient:updated', handlePatientUpdated);
      socketService.on('reminder:due', handleReminderDue);

      const receivedSub = Notifications.addNotificationReceivedListener((n) => {
        showToast(n.request.content.title ?? 'Reminder', 'info');
      });
      const tappedSub = Notifications.addNotificationResponseReceivedListener(() => {});

      const refreshInterval = setInterval(() => {
        fetchDailyStats();
        fetchTodaySchedule();
      }, 300000);

      cleanupFn = () => {
        clearInterval(refreshInterval);
        receivedSub.remove();
        tappedSub.remove();
        socketService.off('schedule:updated', handleScheduleUpdated);
        socketService.off('patient:updated', handlePatientUpdated);
        socketService.off('reminder:due', handleReminderDue);
      };
    };

    init();
    return () => { cleanupFn?.(); };
  }, []);

  // ── Permissions (unchanged) ──────────────────────────────────────────────────
  const requestAllPermissions = async () => {
    try {
      await ImagePicker.requestCameraPermissionsAsync();
      await MediaLibrary.requestPermissionsAsync();
      await Location.requestForegroundPermissionsAsync();
      await Location.requestBackgroundPermissionsAsync();
      if (Platform.OS === 'android') await Notifications.requestPermissionsAsync();
    } catch {}
  };

  // ── Notifications (unchanged) ────────────────────────────────────────────────
  const setupNotifications = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.alerts, {
        name: 'Memorii Alerts', importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250], lightColor: '#4A6FA5',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.emergency, {
        name: 'Emergency Alerts', importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 500], lightColor: '#FF0000', bypassDnd: true,
      });
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.tasks, {
        name: 'Task Reminders', importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250], lightColor: '#4A6FA5',
      });
    }
  };

  const scheduleNotificationsForSchedule = async (schedule: any[]) => {
    const now = new Date();
    for (const item of schedule) {
      if (item.completed) continue;
      const [h, m] = item.time.split(':').map(Number);
      const itemDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
      if (itemDate > now) {
        const secs = Math.floor((itemDate.getTime() - now.getTime()) / 1000);
        await Notifications.scheduleNotificationAsync({
          content: { title: `⏰ ${item.title}`, body: item.note || `Time for: ${item.title}`, sound: 'default', channelId: NOTIFICATION_CHANNELS.alerts } as any,
          trigger: { seconds: secs } as any,
        });
      }
    }
  };

  // ── Data fetching (unchanged logic) ──────────────────────────────────────────
  const fetchPatientProfile = async () => {
    try {
      const profile = await api.getPatientProfile();
      if (profile) {
        if (profile.name) await SecureStore.setItemAsync(STORAGE_KEYS.PATIENT_NAME, profile.name);
        if (profile.medications) await AsyncStorage.setItem(STORAGE_KEYS.PATIENT_MEDICATIONS, JSON.stringify(profile.medications));
        if (profile.geofence_radius && typeof profile.geofence_radius === 'number') {
          await AsyncStorage.setItem(STORAGE_KEYS.GEOFENCE_RADIUS, String(profile.geofence_radius));
          locationHook.setGeofenceRadius(profile.geofence_radius);
        }
        if (profile.emergency_contact !== undefined) {
          setEmergencyContact(profile.emergency_contact ?? null);
          if (profile.emergency_contact) {
            storage.set(StorageKeys.EMERGENCY_CONTACT, profile.emergency_contact);
          }
          const existing = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_DATA);
          const existingData = existing ? JSON.parse(existing) : {};
          await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_DATA, JSON.stringify({
            ...existingData,
            emergencyContact: profile.emergency_contact ?? existingData.emergencyContact,
          }));
        }
      }
    } catch {}
  };

  const fetchDailyStats = async () => {
    try {
      const stats = await api.getDailyStats();
      if (stats) {
        setDailyStats({
          waterGlasses: { current: stats.waterGlasses || 0, target: stats.waterTarget || 8 },
          walkingTimes: { current: stats.walkingTimes || 0, target: stats.walkingTarget || 3 },
          medicines: { current: stats.medicinesTaken || 0, target: stats.medicinesTotal || 3 },
        });
      }
    } catch {}
  };

  const fetchTodaySchedule = async () => {
    setIsLoadingSchedule(true);
    try {
      const data = await api.getTodaySchedule();
      if (data?.schedule) {
        setTodaySchedule(data.schedule);
        await scheduleNotificationsForSchedule(data.schedule);
      } else {
        setTodaySchedule(DEFAULT_SCHEDULE);
      }
    } catch {
      setTodaySchedule(DEFAULT_SCHEDULE);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPatientProfile(), fetchDailyStats(), fetchTodaySchedule()]);
    setRefreshing(false);
    showToast('Refreshed!', 'success');
  }, []);

  const updateDailyStat = async (type: 'water' | 'medicine' | 'walking') => {
    const map = { water: 'waterGlasses', medicine: 'medicines', walking: 'walkingTimes' } as const;
    const key = map[type];
    if (dailyStats[key].current >= dailyStats[key].target) return;
    const newStats = { ...dailyStats, [key]: { ...dailyStats[key], current: dailyStats[key].current + 1 } };
    setDailyStats(newStats);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await api.updateDailyStats({
        waterGlasses: newStats.waterGlasses.current,
        walkingTimes: newStats.walkingTimes.current,
        medicinesTaken: newStats.medicines.current,
      });
    } catch {}
  };

  const completeScheduleItem = async (itemId: string) => {
    setTodaySchedule(prev => prev.map(item => item.id === itemId ? { ...item, completed: true } : item));
    const item = todaySchedule.find(i => i.id === itemId);
    if (item?.icon === 'medical') updateDailyStat('medicine');
    if (item?.icon === 'walk') updateDailyStat('walking');
    try { await api.completeScheduleItem(itemId); } catch {}
  };

  // ── Family Members (unchanged logic) ─────────────────────────────────────────
  const loadFamilyMembers = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.FAMILY_MEMBERS);
      if (saved) setFamilyMembers(JSON.parse(saved));
    } catch {}
  };

  const saveFamilyMembers = async (members: any[]) => {
    setFamilyMembers(members);
    await AsyncStorage.setItem(STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify(members));
  };

  const pickImageFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsMultipleSelection: true, quality: 0.8 });
    if (!result.canceled && selectedMember) addMediaToMember(result.assets);
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && selectedMember) addMediaToMember(result.assets);
  };

  const recordVideo = async () => {
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, videoMaxDuration: 60, videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium });
    if (!result.canceled && selectedMember) addMediaToMember(result.assets);
  };

  const addMediaToMember = (assets: any[]) => {
    const newMedia = assets.map(a => ({ uri: a.uri, type: a.type || 'image', width: a.width, height: a.height, duration: a.duration, addedAt: new Date().toISOString() }));
    const updated = familyMembers.map(m => m.id === selectedMember.id ? { ...m, media: [...m.media, ...newMedia] } : m);
    setSelectedMember(updated.find(m => m.id === selectedMember.id));
    saveFamilyMembers(updated);
  };

  const deleteMedia = (index: number) => {
    if (!selectedMember) return;
    const updatedMedia = selectedMember.media.filter((_: any, i: number) => i !== index);
    const updated = familyMembers.map(m => m.id === selectedMember.id ? { ...m, media: updatedMedia } : m);
    setSelectedMember(updated.find(m => m.id === selectedMember.id));
    saveFamilyMembers(updated);
  };

  const openGooglePhotos = () => {
    if (selectedMember) Linking.openURL(`https://photos.google.com/search/${selectedMember.name}`);
  };

  // ── Emergency (unchanged logic) ───────────────────────────────────────────────
  const triggerEmergency = async () => {
    setEmergencyStatus('sending');
    try {
      let currentLocation = locationHook.location;
      if (!currentLocation) {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        currentLocation = loc;
      }
      const address = currentLocation ? await locationHook.reverseGeocode(currentLocation.coords.latitude, currentLocation.coords.longitude) : 'Unknown';
      const mapsLink = currentLocation ? `https://maps.google.com/?q=${currentLocation.coords.latitude},${currentLocation.coords.longitude}` : '';
      const profileData = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_DATA);
      const profile = profileData ? JSON.parse(profileData) : {};
      const caretakerCode = await AsyncStorage.getItem(STORAGE_KEYS.CARETAKER_CODE_ASYNC);
      const contact = emergencyContact || profile.emergencyContact || storage.getString(StorageKeys.EMERGENCY_CONTACT) || '';
      const message = `🚨 EMERGENCY ALERT\nPatient: ${userName}\nLocation: ${address}\nCoords: ${currentLocation?.coords.latitude?.toFixed(5)}, ${currentLocation?.coords.longitude?.toFixed(5)}\nMaps: ${mapsLink}\nTime: ${new Date().toLocaleString()}`;

      api.sendSOS({ type: 'emergency', patientName: userName, caretakerCode: caretakerCode || '', caretakerPhone: contact, caretakerName: profile.caretakerName || '', message, location: { latitude: currentLocation?.coords.latitude || 0, longitude: currentLocation?.coords.longitude || 0, address }, timestamp: new Date().toISOString() }).catch(() => {});

      if (contact) {
        const phone = contact.replace(/\D/g, '');
        const waAppUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        const canOpen = await Linking.canOpenURL(waAppUrl);
        Linking.openURL(canOpen ? waAppUrl : waUrl).catch(() => {});
      }

      await Notifications.scheduleNotificationAsync({
        content: { title: '🚨 Emergency Alert Sent', body: 'Your caretaker has been notified.', sound: 'default', channelId: NOTIFICATION_CHANNELS.emergency } as any,
        trigger: null,
      });

      Speech.speak('Emergency alert sent. Help is on the way.', { rate: 0.9 });
      setEmergencyStatus('sent');
      setTimeout(() => setEmergencyStatus('idle'), 5000);
    } catch {
      setEmergencyStatus('idle');
    }
  };

  // ── Voice ────────────────────────────────────────────────────────────────────
  const handleVoicePress = async () => {
    setShowVoiceSheet(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await voiceHook.handleMicrophonePress();
  };

  // Track voice responses in MMKV history
  useEffect(() => {
    if (voiceHook.voiceResponse && !voiceHook.isListening) {
      const entry = { query: '', response: voiceHook.voiceResponse, provider: 'memorii', ts: Date.now() };
      appendVoiceHistory(entry);
      setVoiceHistory(getVoiceHistory());
    }
  }, [voiceHook.voiceResponse, voiceHook.isListening]);

  // ── Greeting banner ──────────────────────────────────────────────────────────
  const initials = userName ? userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : '?';

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Offline banner */}
      <OfflineBanner />

      {/* Toast */}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text style={[styles.appTitle, { color: theme.text }]} allowFontScaling>🧠 Memorii</Text>
        <View style={styles.headerRight}>
          <Text style={{ fontSize: 16 }} accessibilityElementsHidden>{isDarkMode ? '☀️' : '🌙'}</Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={isDarkMode ? theme.primaryLight : '#FFFFFF'}
            accessibilityLabel={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            accessibilityRole="switch"
          />
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsBtn}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            hitSlop={8}
          >
            <Text style={{ fontSize: 22 }}>⚙️</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* ── Greeting band ── */}
        <LinearGradient
          colors={[theme.primary, theme.primaryLight]}
          style={styles.greetingBand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.greetingLeft}>
            <Text style={styles.greetingText} allowFontScaling={false} numberOfLines={1}>
              {greeting}, {userName} 👋
            </Text>
            <Text style={styles.greetingDate} allowFontScaling={false}>{currentDate}</Text>
            <Text style={styles.greetingTime} allowFontScaling={false}>{currentTime}</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials} allowFontScaling={false}>{initials}</Text>
          </View>
        </LinearGradient>

        {/* ── Quick Stats ── */}
        <View style={styles.sectionPad}>
          <Text style={[styles.sectionTitle, { color: theme.text }]} allowFontScaling>Today's Progress</Text>
          {isLoadingSchedule ? (
            <View style={styles.statsRow}>
              <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
            </View>
          ) : (
            <View style={styles.statsRow}>
              <StatCard
                emoji="💧" label="Water" value={dailyStats.waterGlasses.current}
                target={dailyStats.waterGlasses.target} unit=" glasses"
                color={theme.primary} onPress={() => updateDailyStat('water')}
              />
              <StatCard
                emoji="🚶" label="Walking" value={dailyStats.walkingTimes.current}
                target={dailyStats.walkingTimes.target}
                color={theme.success} onPress={() => updateDailyStat('walking')}
              />
              <StatCard
                emoji="💊" label="Medicines" value={dailyStats.medicines.current}
                target={dailyStats.medicines.target}
                color={theme.accent} onPress={() => updateDailyStat('medicine')}
              />
            </View>
          )}
        </View>

        {/* ── Memory Lane ── */}
        <View style={styles.sectionPad}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]} allowFontScaling>Your Family ❤️</Text>
            <Text style={[styles.sectionSub, { color: theme.textSecondary }]} allowFontScaling>People who love you</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 8 }}
            decelerationRate="fast"
            snapToInterval={162}
          >
            {familyMembers.length === 0 ? (
              <FamilyCardSkeleton />
            ) : (
              familyMembers.map(member => (
                <FamilyPhotoCard
                  key={member.id}
                  name={member.name}
                  relation={member.relation}
                  imageUrl={member.imageUrl}
                  onPress={() => {
                    Speech.speak(`This is ${member.name}, your ${member.relation}.`, { rate: 0.9 });
                    setSelectedMember(member);
                    setShowMemberModal(true);
                  }}
                />
              ))
            )}
          </ScrollView>
        </View>

        {/* ── Today's Schedule ── */}
        <View style={styles.sectionPad}>
          <Text style={[styles.sectionTitle, { color: theme.text }]} allowFontScaling>Today's Plan 📋</Text>
          {isLoadingSchedule ? (
            <View style={{ gap: 8 }}>
              <ScheduleItemSkeleton /><ScheduleItemSkeleton /><ScheduleItemSkeleton />
            </View>
          ) : todaySchedule.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]} allowFontScaling>
                Nothing left today! You're all done.
              </Text>
            </View>
          ) : (
            todaySchedule.map(item => (
              <ReminderCard
                key={item.id}
                id={item.id}
                title={item.title}
                time={item.time}
                type={item.reminder_type || item.type || 'task'}
                note={item.note}
                completed={item.completed}
                onToggle={completeScheduleItem}
              />
            ))
          )}
        </View>

        {/* ── Voice Assistant Button ── */}
        <View style={styles.sectionPad}>
          <Pressable
            onPress={handleVoicePress}
            accessibilityRole="button"
            accessibilityLabel={voiceHook.isListening ? 'Listening. Tap to stop.' : 'Talk to Memorii voice assistant'}
            accessibilityHint="Tap to ask Memorii a question"
          >
            <LinearGradient
              colors={voiceHook.isListening ? [theme.accent, theme.primary] : [theme.primary, theme.accent]}
              style={styles.voiceBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.voiceBtnIcon} accessibilityElementsHidden>
                {voiceHook.isListening ? '🎤' : '🎙️'}
              </Text>
              <Text style={styles.voiceBtnText} allowFontScaling={false}>
                {voiceHook.isListening ? 'Listening...' : 'Talk to Memorii'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ── SOS Section ── */}
        <View style={[styles.sosSection, { backgroundColor: theme.surface, borderColor: theme.dangerLight }]}>
          <SOSSlider
            emergencyContact={emergencyContact}
            onTriggered={triggerEmergency}
          />
        </View>

        {/* ── Location Status ── */}
        <Pressable
          style={[styles.locationPill, { backgroundColor: locationHook.isTracking ? theme.success + '20' : theme.warning + '20' }]}
          onPress={() => !locationHook.isTracking && locationHook.startGPSTracking()}
          accessibilityRole="button"
          accessibilityLabel={locationHook.isTracking ? 'Location sharing is on' : 'Location sharing is off. Tap to enable.'}
        >
          <View style={[styles.locationDot, { backgroundColor: locationHook.isTracking ? theme.success : theme.warning }]} />
          <Text style={[styles.locationText, { color: locationHook.isTracking ? theme.success : theme.warning }]} allowFontScaling>
            {locationHook.isTracking
              ? `📍 ${locationHook.locationAddress || 'Location tracking on'}`
              : '📍 Tap to enable location'}
          </Text>
        </Pressable>

        {/* Dev buttons (DEV only) */}
        {__DEV__ && (
          <View style={styles.devRow}>
            <Pressable
              style={[styles.devBtn, { backgroundColor: theme.danger + '20' }]}
              onPress={async () => {
                await SecureStore.deleteItemAsync(STORAGE_KEYS.SESSION_TOKEN);
                navigation.reset({ index: 0, routes: [{ name: 'Setup' }] });
              }}
              accessibilityRole="button"
            >
              <Text style={[styles.devText, { color: theme.danger }]}>← Sign Out</Text>
            </Pressable>
            <Pressable
              style={[styles.devBtn, { backgroundColor: theme.warning + '20' }]}
              onPress={() => showToast('Test notification fired!', 'info')}
              accessibilityRole="button"
            >
              <Text style={[styles.devText, { color: theme.warning }]}>🔔 Test Toast</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Voice bottom sheet */}
      <VoiceSheet
        isOpen={showVoiceSheet}
        isListening={voiceHook.isListening}
        currentResponse={voiceHook.voiceResponse || ''}
        history={voiceHistory}
        onClose={() => setShowVoiceSheet(false)}
      />

      {/* Family modals (unchanged) */}
      <FamilyDetailModal
        visible={showMemberModal}
        member={selectedMember}
        onClose={() => setShowMemberModal(false)}
        onPickImage={pickImageFromGallery}
        onTakePhoto={takePhoto}
        onRecordVideo={recordVideo}
        onOpenGooglePhotos={openGooglePhotos}
        onViewMedia={(i) => { setCurrentMediaIndex(i); setShowMediaViewer(true); }}
        onDeleteMedia={deleteMedia}
        onSpeak={() => selectedMember && Speech.speak(`This is ${selectedMember.name}, your ${selectedMember.relation}. They love you very much.`, { rate: 0.9 })}
      />

      <MediaViewer
        visible={showMediaViewer}
        media={selectedMember?.media || []}
        currentIndex={currentMediaIndex}
        onClose={() => setShowMediaViewer(false)}
        onNavigate={(dir) => {
          if (!selectedMember) return;
          if (dir === 'prev' && currentMediaIndex > 0) setCurrentMediaIndex(currentMediaIndex - 1);
          if (dir === 'next' && currentMediaIndex < selectedMember.media.length - 1) setCurrentMediaIndex(currentMediaIndex + 1);
        }}
      />

      {/* Route History Modal (unchanged) */}
      <Modal visible={showRouteModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.sheetContent, { backgroundColor: theme.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: theme.text }]} allowFontScaling>Route History 📍</Text>
            <ScrollView style={{ flex: 1 }}>
              {locationHook.locationHistory.length > 0 ? (
                [...locationHook.locationHistory].reverse().map((entry: any, idx: number) => (
                  <View key={idx} style={[styles.routeItem, { borderLeftColor: theme.primary }]}>
                    <Text style={[styles.routeTime, { color: theme.primary }]} allowFontScaling>
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={[styles.routeAddress, { color: theme.text }]} allowFontScaling>{entry.address || 'Unknown'}</Text>
                    <Pressable onPress={() => Linking.openURL(`https://maps.google.com/?q=${entry.latitude},${entry.longitude}`)}>
                      <Text style={{ color: theme.primary, fontFamily: 'Nunito_600SemiBold', fontSize: 13, marginTop: 2 }} allowFontScaling>View Map →</Text>
                    </Pressable>
                  </View>
                ))
              ) : (
                <Text style={{ color: theme.textSecondary, textAlign: 'center', padding: 40, fontFamily: 'Nunito_400Regular', fontSize: 15 }} allowFontScaling>No location history yet</Text>
              )}
            </ScrollView>
            <Pressable style={[styles.sheetCloseBtn, { backgroundColor: theme.primary }]} onPress={() => setShowRouteModal(false)} accessibilityRole="button" accessibilityLabel="Close route history">
              <Text style={styles.sheetCloseBtnText} allowFontScaling>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  appTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 22 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingsBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 32, gap: 0 },

  // Greeting band
  greetingBand: {
    marginHorizontal: 16, borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  greetingLeft: { flex: 1, gap: 4 },
  greetingText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 22, color: '#FFFFFF', lineHeight: 28 },
  greetingDate: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  greetingTime: { fontFamily: 'Nunito_700Bold', fontSize: 24, color: '#FFFFFF', marginTop: 4 },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontFamily: 'Nunito_800ExtraBold', fontSize: 20, color: '#FFFFFF' },

  // Sections
  sectionPad: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: { gap: 2, marginBottom: 12 },
  sectionTitle: { fontFamily: 'Nunito_700Bold', fontSize: 20 },
  sectionSub: { fontFamily: 'Nunito_400Regular', fontSize: 14 },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },

  // Empty state
  emptyState: {
    borderRadius: 16, borderWidth: 1, padding: 32,
    alignItems: 'center', gap: 8, marginTop: 8,
  },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontFamily: 'Nunito_400Regular', fontSize: 16, textAlign: 'center' },

  // Voice button
  voiceBtn: {
    borderRadius: 32, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 18, gap: 12,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8,
  },
  voiceBtnIcon: { fontSize: 24 },
  voiceBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: '#FFFFFF' },

  // SOS section
  sosSection: {
    margin: 16, marginTop: 24, borderRadius: 20, padding: 20,
    borderWidth: 1.5, alignItems: 'center',
  },

  // Location pill
  locationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, paddingVertical: 10,
    paddingHorizontal: 16, borderRadius: 32,
  },
  locationDot: { width: 8, height: 8, borderRadius: 4 },
  locationText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, flex: 1 },

  // Dev row
  devRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 16 },
  devBtn: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  devText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13 },

  // Modal / sheet
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetContent: { height: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetHandle: { width: 48, height: 5, borderRadius: 3, backgroundColor: '#D0D0D0', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontFamily: 'Nunito_700Bold', fontSize: 20, marginBottom: 16 },
  sheetCloseBtn: { padding: 16, borderRadius: 32, alignItems: 'center', marginTop: 12, minHeight: 56, justifyContent: 'center' },
  sheetCloseBtnText: { fontFamily: 'Nunito_700Bold', color: '#FFFFFF', fontSize: 16 },

  // Route items
  routeItem: { borderLeftWidth: 3, paddingLeft: 14, marginBottom: 16 },
  routeTime: { fontFamily: 'Nunito_700Bold', fontSize: 14 },
  routeAddress: { fontFamily: 'Nunito_400Regular', fontSize: 14, marginTop: 2 },
});
