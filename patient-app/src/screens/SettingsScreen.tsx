/**
 * SettingsScreen — redesigned
 * Profile card, appearance, permissions status, connection, data management, sign out.
 * All original logic (logout, profile load) preserved.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, Pressable, SafeAreaView,
  ScrollView, Switch, Alert, ActivityIndicator,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import NetInfo from '@react-native-community/netinfo';

import { useTheme } from '../theme/ThemeContext';
import { STORAGE_KEYS } from '../constants/config';
import { PermissionRow } from '../components/PermissionRow';
import { usePermissions } from '../permissions';
import { useFontScale, FontScaleOption } from '../hooks/useFontScale';
import { storage, StorageKeys, clearOfflineQueue } from '../storage';
import { API_BASE_URL } from '../constants/config';

export default function SettingsScreen({ navigation }: { navigation: any }) {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { permissions, refresh: refreshPermissions, openSettings } = usePermissions();
  const { fontScale, setFontScale } = useFontScale();

  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    loadProfile();
    checkNetInfo();
  }, []);

  const loadProfile = async () => {
    const name = await SecureStore.getItemAsync(STORAGE_KEYS.PATIENT_NAME);
    const profileRaw = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_DATA);
    const profile = profileRaw ? JSON.parse(profileRaw) : {};
    setPatientName(name || profile.name || 'Friend');
    setPatientAge(profile.age ? String(profile.age) : '');
  };

  const checkNetInfo = async () => {
    const state = await NetInfo.fetch();
    setIsOnline(!!state.isConnected);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Sign Out?',
      'You will need to scan a QR code again to reconnect with your caretaker.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await SecureStore.deleteItemAsync(STORAGE_KEYS.SESSION_TOKEN);
            await SecureStore.deleteItemAsync(STORAGE_KEYS.PATIENT_ID);
            await SecureStore.deleteItemAsync(STORAGE_KEYS.PATIENT_NAME);
            navigation.reset({ index: 0, routes: [{ name: 'Setup' }] });
          },
        },
      ]
    );
  }, [navigation]);

  const handleTestConnection = useCallback(async () => {
    setConnectionStatus('checking');
    try {
      const res = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, { signal: AbortSignal.timeout(5000) });
      setConnectionStatus(res.ok ? 'ok' : 'error');
    } catch {
      setConnectionStatus('error');
    }
  }, []);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Clear Local Cache?',
      'This removes cached data and offline queue. Your setup and profile won\'t be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearOfflineQueue();
            storage.delete(StorageKeys.REMINDERS_CACHE as string);
            storage.delete(StorageKeys.FAMILY_CACHE as string);
            storage.delete(StorageKeys.VOICE_HISTORY as string);
            Alert.alert('Done', 'Cache cleared.');
          },
        },
      ]
    );
  }, []);

  const fontScaleOptions: { label: string; value: FontScaleOption }[] = [
    { label: 'A', value: 'small' },
    { label: 'A', value: 'medium' },
    { label: 'A', value: 'large' },
  ];

  const initials = patientName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <Text style={[styles.backText, { color: theme.primary }]} allowFontScaling>← Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]} allowFontScaling>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Profile Card ── */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText} allowFontScaling={false}>{initials}</Text>
          </View>
          <Text style={[styles.profileName, { color: theme.text }]} allowFontScaling>{patientName}</Text>
          {patientAge ? (
            <Text style={[styles.profileSub, { color: theme.textSecondary }]} allowFontScaling>Age {patientAge}</Text>
          ) : null}
          <View style={[styles.badge, { backgroundColor: theme.primary + '15' }]}>
            <Text style={[styles.badgeText, { color: theme.primary }]} allowFontScaling>Patient</Text>
          </View>
        </View>

        {/* ── Appearance ── */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]} allowFontScaling>APPEARANCE</Text>

          {/* Dark mode */}
          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <Text style={styles.rowEmoji} accessibilityElementsHidden>{isDarkMode ? '🌙' : '☀️'}</Text>
            <Text style={[styles.rowLabel, { color: theme.text }]} allowFontScaling>Dark Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleTheme();
              }}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={isDarkMode ? theme.primaryLight : '#FFFFFF'}
              accessibilityLabel={`Dark mode is ${isDarkMode ? 'on' : 'off'}`}
              accessibilityRole="switch"
            />
          </View>

          {/* Font size */}
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowEmoji} accessibilityElementsHidden>🔤</Text>
            <Text style={[styles.rowLabel, { color: theme.text }]} allowFontScaling>Text Size</Text>
            <View style={styles.fontToggle}>
              {fontScaleOptions.map(({ label, value }, i) => (
                <Pressable
                  key={value}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFontScale(value); }}
                  style={[
                    styles.fontBtn,
                    { borderColor: fontScale === value ? theme.primary : theme.border, backgroundColor: fontScale === value ? theme.primary : 'transparent' },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${value} text size`}
                  accessibilityState={{ selected: fontScale === value }}
                >
                  <Text style={[
                    styles.fontBtnText,
                    { fontSize: 10 + i * 3, color: fontScale === value ? '#FFFFFF' : theme.text },
                  ]} allowFontScaling={false}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* ── Permissions ── */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]} allowFontScaling>PERMISSIONS</Text>
          <PermissionRow label="Location" emoji="📍" status={permissions.location} onFix={openSettings} />
          <PermissionRow label="Background Location" emoji="🗺️" status={permissions.backgroundLocation} onFix={openSettings} />
          <PermissionRow label="Notifications" emoji="🔔" status={permissions.notifications} onFix={openSettings} />
          <PermissionRow label="Camera" emoji="📷" status={permissions.camera} onFix={openSettings} />
          <PermissionRow label="Microphone" emoji="🎤" status={permissions.microphone} onFix={openSettings} />
          <Pressable
            onPress={() => { refreshPermissions(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[styles.refreshBtn, { borderColor: theme.border }]}
            accessibilityRole="button"
            accessibilityLabel="Refresh permission statuses"
          >
            <Text style={[styles.refreshBtnText, { color: theme.primary }]} allowFontScaling>↻ Refresh Status</Text>
          </Pressable>
        </View>

        {/* ── Connection ── */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]} allowFontScaling>CONNECTION</Text>

          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <Text style={styles.rowEmoji} accessibilityElementsHidden>📡</Text>
            <Text style={[styles.rowLabel, { color: theme.text }]} allowFontScaling>Network</Text>
            <View style={[styles.statusBadge, { backgroundColor: isOnline ? theme.success + '20' : theme.danger + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? theme.success : theme.danger }]} />
              <Text style={[styles.statusText, { color: isOnline ? theme.success : theme.danger }]} allowFontScaling>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>

          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowEmoji} accessibilityElementsHidden>🔗</Text>
            <Text style={[styles.rowLabel, { color: theme.text }]} allowFontScaling>API Server</Text>
            <Pressable
              onPress={handleTestConnection}
              style={[styles.testBtn, { borderColor: theme.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Test API connection"
            >
              {connectionStatus === 'checking' ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={[styles.testBtnText, { color: connectionStatus === 'ok' ? theme.success : connectionStatus === 'error' ? theme.danger : theme.primary }]} allowFontScaling>
                  {connectionStatus === 'ok' ? '✓ OK' : connectionStatus === 'error' ? '✗ Error' : 'Test'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* ── Data ── */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]} allowFontScaling>DATA</Text>

          <Pressable
            onPress={handleClearCache}
            style={[styles.row, styles.rowLast]}
            accessibilityRole="button"
            accessibilityLabel="Clear local cache"
          >
            <Text style={styles.rowEmoji} accessibilityElementsHidden>🗑️</Text>
            <Text style={[styles.rowLabel, { color: theme.text }]} allowFontScaling>Clear Local Cache</Text>
            <Text style={{ color: theme.textMuted, fontSize: 20 }} accessibilityElementsHidden>›</Text>
          </Pressable>
        </View>

        {/* ── Account ── */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]} allowFontScaling>ACCOUNT</Text>

          <Pressable
            onPress={handleLogout}
            style={[styles.row, styles.rowLast]}
            accessibilityRole="button"
            accessibilityLabel="Sign out of Memorii"
            accessibilityHint="You will need to re-scan a QR code to reconnect"
          >
            <Text style={styles.rowEmoji} accessibilityElementsHidden>🚪</Text>
            <Text style={[styles.rowLabel, { color: theme.danger }]} allowFontScaling>Sign Out</Text>
            <Text style={{ color: theme.danger, fontSize: 20 }} accessibilityElementsHidden>›</Text>
          </Pressable>
        </View>

        {/* Version */}
        <Text style={[styles.version, { color: theme.textMuted }]} allowFontScaling>
          Memorii v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn: { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backText: { fontFamily: 'Nunito_600SemiBold', fontSize: 16 },
  headerTitle: { fontFamily: 'Nunito_700Bold', fontSize: 20 },
  content: { padding: 16, gap: 16, paddingBottom: 48 },

  // Profile card
  card: {
    borderRadius: 20, borderWidth: 1, padding: 24,
    alignItems: 'center', gap: 8,
  },
  avatarCircle: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  avatarText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 28, color: '#FFFFFF' },
  profileName: { fontFamily: 'Nunito_700Bold', fontSize: 22 },
  profileSub: { fontFamily: 'Nunito_400Regular', fontSize: 14 },
  badge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginTop: 4 },
  badgeText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13 },

  // Settings sections
  section: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
    paddingHorizontal: 16, paddingTop: 4,
  },
  sectionLabel: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 11,
    letterSpacing: 0.8, textTransform: 'uppercase',
    paddingTop: 14, paddingBottom: 4,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, gap: 12, minHeight: 56,
  },
  rowLast: { borderBottomWidth: 0 },
  rowEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
  rowLabel: { fontFamily: 'Nunito_600SemiBold', fontSize: 16, flex: 1 },

  // Font size toggle
  fontToggle: { flexDirection: 'row', gap: 6 },
  fontBtn: {
    width: 36, height: 36, borderRadius: 8, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  fontBtnText: { fontFamily: 'Nunito_700Bold' },

  // Refresh button
  refreshBtn: {
    margin: 8, marginTop: 4, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, alignItems: 'center',
  },
  refreshBtnText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14 },

  // Status badge
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13 },

  // Test button
  testBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, minWidth: 60, alignItems: 'center', minHeight: 36, justifyContent: 'center',
  },
  testBtnText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13 },

  version: {
    fontFamily: 'Nunito_400Regular', fontSize: 13,
    textAlign: 'center', paddingVertical: 8,
  },
});
