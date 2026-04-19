/**
 * SetupScreen — redesigned
 * Two-option landing: Scan QR or Enter Code.
 * All existing QR + backend validation logic preserved exactly.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  Pressable,
  ActivityIndicator,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { API_BASE_URL, STORAGE_KEYS } from '../constants/config';
import { storage, StorageKeys } from '../storage';
import { requestCameraPermission } from '../permissions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_FRAME_SIZE = SCREEN_WIDTH * 0.65;

type Mode = 'landing' | 'qr' | 'manual';

export default function SetupScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const [mode, setMode] = useState<Mode>('landing');
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Animations
  const scanLineY = useSharedValue(0);
  const cornerPulse = useSharedValue(1);
  const pageFade = useSharedValue(0);

  useEffect(() => {
    pageFade.value = withTiming(1, { duration: 500 });
  }, [pageFade]);

  useEffect(() => {
    if (mode !== 'qr') return;
    scanLineY.value = withRepeat(
      withTiming(SCAN_FRAME_SIZE - 4, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    cornerPulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      true
    );
  }, [mode, scanLineY, cornerPulse]);

  const scanLineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scanLineY.value }] }));
  const cornerPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: cornerPulse.value }] }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: pageFade.value }));

  // ── QR parsing & validation (unchanged logic) ──────────────────────────────

  const parseQRData = (data: string) => {
    try {
      return JSON.parse(data);
    } catch {
      return { caretakerCode: data };
    }
  };

  const validateQRCode = async (qrData: string) => {
    const parsed = parseQRData(qrData);

    // New format: memorii_pair JSON from backend pairing endpoint
    if (parsed.type === 'memorii_pair' && (parsed.token || parsed.shortCode)) {
      try {
        const verifyRes = await fetch(`${API_BASE_URL}/patients/verify-pairing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: parsed.token || qrData.trim() }),
        });
        if (verifyRes.ok) {
          const data = await verifyRes.json();
          const p = data.patient;
          return {
            success: true,
            token: parsed.token || 'paired-' + Date.now(),
            patientId: p.id,
            patientName: p.name,
            caretakerCode: parsed.shortCode || '',
            caretakerName: '',
            caretakerPhone: p.emergency_contact || '',
            emergencyContact: p.emergency_contact || '',
            geofenceRadius: p.geofence_radius || 250,
          };
        }
        const errData = await verifyRes.json().catch(() => ({}));
        return { success: false, error: (errData as any).message || 'Invalid or expired code' };
      } catch {
        return { success: false, error: 'Could not reach server. Check your connection.' };
      }
    }

    // Manual short code entry (6 digits or raw token)
    const rawCode = qrData.trim();
    if (rawCode.length >= 4) {
      try {
        const verifyRes = await fetch(`${API_BASE_URL}/patients/verify-pairing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: rawCode }),
        });
        if (verifyRes.ok) {
          const data = await verifyRes.json();
          const p = data.patient;
          return {
            success: true,
            token: rawCode,
            patientId: p.id,
            patientName: p.name,
            caretakerCode: rawCode,
            caretakerName: '',
            caretakerPhone: p.emergency_contact || '',
            emergencyContact: p.emergency_contact || '',
            geofenceRadius: p.geofence_radius || 250,
          };
        }
      } catch {}
    }

    // Legacy fallback: old QR format with caretakerCode/patientId directly encoded
    if (parsed.caretakerCode || parsed.patientId) {
      return {
        success: true,
        token: 'local-token-' + Date.now(),
        patientId: parsed.patientId || 'patient-' + Date.now(),
        patientName: parsed.patientName || 'John Anderson',
        caretakerCode: parsed.caretakerCode || 'CT-' + Date.now(),
        caretakerName: parsed.caretakerName || 'Caretaker',
        caretakerPhone: parsed.caretakerPhone || '',
        emergencyContact: parsed.emergencyContact || '',
        geofenceRadius: parsed.geofenceRadius || 250,
      };
    }

    return { success: false, error: 'Invalid QR code format' };
  };

  const saveAndNavigate = async (response: any) => {
    await SecureStore.setItemAsync(STORAGE_KEYS.SESSION_TOKEN, response.token);
    await SecureStore.setItemAsync(STORAGE_KEYS.PATIENT_ID, response.patientId || '');
    await SecureStore.setItemAsync(STORAGE_KEYS.PATIENT_NAME, response.patientName);
    await AsyncStorage.setItem(STORAGE_KEYS.CARETAKER_CODE_ASYNC, response.caretakerCode);
    const emergencyContact = response.emergencyContact || response.caretakerPhone || '';
    await AsyncStorage.setItem(
      STORAGE_KEYS.PROFILE_DATA,
      JSON.stringify({
        name: response.patientName,
        emergencyContact,
        caretakerName: response.caretakerName,
      })
    );
    // Store in MMKV for fast synchronous access
    storage.set(StorageKeys.PATIENT_NAME, response.patientName);
    storage.set(StorageKeys.PATIENT_ID, response.patientId || '');
    if (emergencyContact) storage.set(StorageKeys.EMERGENCY_CONTACT, emergencyContact);
    if (response.geofenceRadius) {
      await AsyncStorage.setItem(STORAGE_KEYS.GEOFENCE_RADIUS, String(response.geofenceRadius));
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      '✓ Connected!',
      `Welcome, ${response.patientName}!\nYou're now connected to ${response.caretakerName || 'your caretaker'}.`,
      [{ text: 'Start', onPress: () => navigation.replace('Dashboard') }]
    );
  };

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await validateQRCode(data);
      if (result.success) {
        await saveAndNavigate(result);
      } else {
        Alert.alert('Invalid Code', 'Ask your caretaker for the correct setup code.', [
          { text: 'Try Again', onPress: () => { setScanned(false); setIsProcessing(false); } },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.', [
        { text: 'Try Again', onPress: () => { setScanned(false); setIsProcessing(false); } },
      ]);
    }
  };

  const handleManualConnect = async () => {
    if (manualCode.length < 4) {
      Alert.alert('Enter your code', 'Please enter the code your caretaker gave you.');
      return;
    }
    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await validateQRCode(manualCode.trim());
      if (result.success) {
        await saveAndNavigate(result);
      } else {
        Alert.alert('Invalid Code', 'That code wasn\'t found. Please check with your caretaker.', [
          { text: 'OK', onPress: () => setIsProcessing(false) },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.', [
        { text: 'OK', onPress: () => setIsProcessing(false) },
      ]);
    }
  };

  const handleDevSkip = async () => {
    await SecureStore.setItemAsync(STORAGE_KEYS.SESSION_TOKEN, 'dev-token-skip-123');
    await SecureStore.setItemAsync(STORAGE_KEYS.PATIENT_ID, 'dev-patient-001');
    await SecureStore.setItemAsync(STORAGE_KEYS.PATIENT_NAME, 'John Anderson');
    await AsyncStorage.setItem(STORAGE_KEYS.CARETAKER_CODE_ASYNC, 'DEV123');
    await AsyncStorage.setItem(
      STORAGE_KEYS.PROFILE_DATA,
      JSON.stringify({ name: 'John Anderson', emergencyContact: '+919876543210', caretakerName: 'Sarah Anderson' })
    );
    await AsyncStorage.setItem(STORAGE_KEYS.GEOFENCE_RADIUS, '250');
    navigation.replace('Dashboard');
  };

  const openQR = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const status = await requestCameraPermission();
    if (status === 'granted') {
      setHasCamera(true);
      setMode('qr');
    } else {
      setHasCamera(false);
    }
  }, []);

  // ── Landing screen ──────────────────────────────────────────────────────────

  if (mode === 'landing') {
    return (
      <LinearGradient colors={['#4A6FA5', '#2E4D7B']} style={styles.gradientFull}>
        <Animated.View style={[styles.landingContent, fadeStyle]}>
          <Text style={styles.landingIcon}>🤝</Text>
          <Text style={styles.landingTitle} allowFontScaling>Let's get you connected</Text>
          <Text style={styles.landingSub} allowFontScaling>
            Your caretaker will show you a code or QR to scan
          </Text>

          {/* QR option */}
          <Pressable
            onPress={openQR}
            style={[styles.optionCard, { backgroundColor: '#FFFFFF' }]}
            accessibilityRole="button"
            accessibilityLabel="Scan QR code"
            accessibilityHint="Opens camera to scan your caretaker's QR code"
          >
            <Text style={styles.optionEmoji}>📷</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, { color: '#2E4D7B' }]} allowFontScaling>Scan QR Code</Text>
              <Text style={[styles.optionDesc, { color: '#6B6B82' }]} allowFontScaling>
                Point your camera at the code
              </Text>
            </View>
            <Text style={{ color: '#4A6FA5', fontSize: 22 }}>›</Text>
          </Pressable>

          {/* Manual option */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMode('manual'); }}
            style={[styles.optionCard, { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' }]}
            accessibilityRole="button"
            accessibilityLabel="Enter code manually"
            accessibilityHint="Type the code your caretaker gave you"
          >
            <Text style={styles.optionEmoji}>⌨️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, { color: '#FFFFFF' }]} allowFontScaling>Enter Code Manually</Text>
              <Text style={[styles.optionDesc, { color: 'rgba(255,255,255,0.7)' }]} allowFontScaling>
                Type the code your caretaker gave you
              </Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22 }}>›</Text>
          </Pressable>

          {/* Dev skip */}
          {__DEV__ && (
            <Pressable onPress={handleDevSkip} style={styles.devSkip} accessibilityRole="button" accessibilityLabel="Developer skip setup">
              <Text style={styles.devSkipText}>⚡ DEV: Skip Setup</Text>
            </Pressable>
          )}
        </Animated.View>
      </LinearGradient>
    );
  }

  // ── Manual code entry ───────────────────────────────────────────────────────

  if (mode === 'manual') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <LinearGradient colors={['#4A6FA5', '#2E4D7B']} style={styles.gradientFull}>
          <Animated.View style={[styles.landingContent, fadeStyle]}>
            <Pressable
              onPress={() => setMode('landing')}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.backText}>← Back</Text>
            </Pressable>

            <Text style={styles.landingIcon}>🔑</Text>
            <Text style={styles.landingTitle} allowFontScaling>Enter Your Code</Text>
            <Text style={styles.landingSub} allowFontScaling>
              Type the code your caretaker gave you
            </Text>

            <View style={[styles.inputCard, { backgroundColor: '#FFFFFF' }]}>
              <TextInput
                ref={inputRef}
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Enter code here"
                placeholderTextColor="#A0A0B8"
                style={styles.codeInput}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleManualConnect}
                accessibilityLabel="Caretaker code input"
                accessibilityHint="Type the code your caretaker provided"
                allowFontScaling
              />
            </View>

            <Pressable
              onPress={handleManualConnect}
              disabled={isProcessing}
              style={[styles.connectBtn, { backgroundColor: '#FFFFFF' }]}
              accessibilityRole="button"
              accessibilityLabel="Connect with this code"
            >
              {isProcessing ? (
                <ActivityIndicator color="#4A6FA5" />
              ) : (
                <Text style={[styles.connectBtnText, { color: '#4A6FA5' }]} allowFontScaling>Connect</Text>
              )}
            </Pressable>
          </Animated.View>
        </LinearGradient>
      </KeyboardAvoidingView>
    );
  }

  // ── QR scanner ──────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      >
        <LinearGradient
          colors={['rgba(74,111,165,0.88)', 'rgba(0,0,0,0.1)', 'rgba(74,111,165,0.88)']}
          style={StyleSheet.absoluteFill}
        >
          {/* Back */}
          <Pressable
            onPress={() => setMode('landing')}
            style={styles.qrBackBtn}
            accessibilityRole="button"
            accessibilityLabel="Cancel and go back"
          >
            <Text style={styles.backText}>← Cancel</Text>
          </Pressable>

          {/* Title */}
          <View style={styles.qrHeader}>
            <Text style={styles.qrTitle} allowFontScaling>Scan Setup Code</Text>
            <Text style={styles.qrSub} allowFontScaling>
              Point your camera at the QR code your caretaker shows you
            </Text>
          </View>

          {/* Frame */}
          <Animated.View style={[styles.scanFrameWrapper, cornerPulseStyle]}>
            <View style={[styles.scanFrame, { width: SCAN_FRAME_SIZE, height: SCAN_FRAME_SIZE }]}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              {!scanned && <Animated.View style={[styles.scanLine, scanLineStyle]} />}
              {isProcessing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.processingText} allowFontScaling>Connecting...</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Dev skip */}
          {__DEV__ && (
            <Pressable onPress={handleDevSkip} style={[styles.devSkip, { alignSelf: 'center', marginTop: 32 }]} accessibilityRole="button">
              <Text style={styles.devSkipText}>⚡ DEV: Skip Setup</Text>
            </Pressable>
          )}
        </LinearGradient>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientFull: {
    flex: 1,
  },
  landingContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    gap: 16,
  },
  landingIcon: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: 4,
  },
  landingTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  landingSub: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    gap: 14,
    minHeight: 80,
  },
  optionEmoji: {
    fontSize: 32,
  },
  optionTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
  },
  optionDesc: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    marginTop: 2,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  inputCard: {
    borderRadius: 16,
    padding: 4,
  },
  codeInput: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 22,
    padding: 16,
    textAlign: 'center',
    letterSpacing: 4,
    color: '#2A2A3C',
    minHeight: 64,
  },
  connectBtn: {
    paddingVertical: 18,
    borderRadius: 32,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  connectBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
  },
  devSkip: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FFA500',
    backgroundColor: 'rgba(255,165,0,0.15)',
  },
  devSkipText: {
    fontFamily: 'Nunito_700Bold',
    color: '#FFA500',
    fontSize: 14,
    textAlign: 'center',
  },
  // QR scanner styles
  qrBackBtn: {
    position: 'absolute',
    top: 56,
    left: 24,
    zIndex: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  qrHeader: {
    alignItems: 'center',
    marginTop: 120,
    paddingHorizontal: 32,
    gap: 8,
  },
  qrTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 26,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  qrSub: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  scanFrameWrapper: {
    alignSelf: 'center',
    marginTop: 40,
  },
  scanFrame: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderColor: '#FFFFFF',
    borderWidth: 4,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 10 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 10 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 10 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 10 },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: '#6BAF7E',
    borderRadius: 2,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(74,111,165,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 8,
  },
  processingText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
  },
});
