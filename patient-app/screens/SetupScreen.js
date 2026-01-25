import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Backend API Base URL (shared with caretaker app)
const API_BASE_URL = 'https://memorii-backend.onrender.com/api'; // Replace with actual backend

export default function SetupScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  // Parse QR Code Data (JSON format from caretaker app)
  const parseQRData = (data) => {
    try {
      // QR code contains JSON with caretaker and patient details
      // Format: { caretakerCode, patientId, patientName, caretakerName, caretakerPhone, emergencyContact }
      const parsed = JSON.parse(data);
      return parsed;
    } catch (e) {
      // If not JSON, treat as plain caretaker code
      return { caretakerCode: data };
    }
  };

  // Validate QR code with backend
  const validateQRCode = async (qrData) => {
    try {
      const parsed = parseQRData(qrData);
      
      // Try to validate with backend first
      const response = await fetch(`${API_BASE_URL}/auth/validate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: parsed }),
        timeout: 5000,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          ...data,
        };
      }
    } catch (error) {
      console.log('Backend validation failed, using local:', error.message);
    }

    // Fallback to local validation for demo/offline mode
    const parsed = parseQRData(qrData);
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
        geofenceRadius: parsed.geofenceRadius || 500,
      };
    }

    return { success: false, error: 'Invalid QR code format' };
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return; // Prevent multiple scans
    
    setScanned(true);
    setIsProcessing(true);

    try {
      // Validate QR code with backend
      const response = await validateQRCode(data);

      if (response.success) {
        // Save all data to SecureStore and AsyncStorage
        await SecureStore.setItemAsync('user_session_token', response.token);
        await SecureStore.setItemAsync('patient_id', response.patientId || '');
        await SecureStore.setItemAsync('patient_name', response.patientName);
        
        // Save to AsyncStorage (for dashboard access)
        await AsyncStorage.setItem('caretakerCode', response.caretakerCode);
        await AsyncStorage.setItem('profileData', JSON.stringify({
          name: response.patientName,
          emergencyContact: response.emergencyContact || response.caretakerPhone,
          caretakerName: response.caretakerName,
        }));
        
        // Save geofence radius if provided
        if (response.geofenceRadius) {
          await AsyncStorage.setItem('geofenceRadius', String(response.geofenceRadius));
        }

        Alert.alert(
          '✅ Setup Complete',
          `Welcome ${response.patientName}!\n\nYour device is now connected to ${response.caretakerName || 'your caretaker'}.`,
          [
            {
              text: 'Continue',
              onPress: () => {
                // Navigate to Dashboard
                navigation.replace('Dashboard');
              },
            },
          ]
        );
      } else {
        Alert.alert(
          '❌ Invalid QR Code',
          'The scanned code is not valid. Please ask your caretaker for the correct setup code.',
          [
            {
              text: 'Try Again',
              onPress: () => {
                setScanned(false);
                setIsProcessing(false);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('QR validation error:', error);
      Alert.alert(
        'Error',
        'Something went wrong. Please try again.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setIsProcessing(false);
            },
          },
        ]
      );
    }
  };

  // DEV: Skip QR scanning for testing
  const handleDevSkip = async () => {
    try {
      // Set mock data for testing
      await SecureStore.setItemAsync('user_session_token', 'dev-token-skip-123');
      await SecureStore.setItemAsync('patient_id', 'dev-patient-001');
      await SecureStore.setItemAsync('patient_name', 'John Anderson');
      
      // Save to AsyncStorage for dashboard access
      // emergencyContact should be in international format for Twilio (e.g., +919876543210)
      await AsyncStorage.setItem('caretakerCode', 'DEV123');
      await AsyncStorage.setItem('profileData', JSON.stringify({
        name: 'John Anderson',
        emergencyContact: '+919876543210', // Replace with actual caretaker number for testing
        caretakerName: 'Sarah Anderson',
      }));
      await AsyncStorage.setItem('geofenceRadius', '200');

      navigation.replace('Dashboard');
    } catch (error) {
      console.error('Dev skip error:', error);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#EF4444', '#DC2626']}
          style={styles.errorCard}
        >
          <Ionicons name="camera-off" size={64} color="#FFFFFF" />
          <Text style={styles.errorTitle}>Camera Access Required</Text>
          <Text style={styles.errorText}>
            This app needs camera access to scan the setup QR code. Please enable
            camera permissions in your device settings.
          </Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={requestCameraPermission}
          >
            <Text style={styles.settingsButtonText}>Request Permission</Text>
          </TouchableOpacity>
          
          {/* DEV Skip Button - Also show when camera denied */}
          <TouchableOpacity
            style={[styles.devSkipButton, { marginTop: 24 }]}
            onPress={handleDevSkip}
            activeOpacity={0.7}
          >
            <Ionicons name="flash" size={18} color="#FFA500" />
            <Text style={styles.devSkipText}>DEV: Skip Setup</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        {/* Overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          style={styles.overlay}
        >
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="qr-code-outline" size={80} color="#FFFFFF" />
            <Text style={styles.title}>Device Setup</Text>
            <Text style={styles.subtitle}>
              Please ask your caretaker to scan the setup QR code
            </Text>
          </View>

          {/* Scanning Frame */}
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            
            {scanned && (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.processingText}>Processing...</Text>
              </View>
            )}
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <View style={styles.instructionRow}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.instructionText}>
                Position the QR code within the frame
              </Text>
            </View>
            <View style={styles.instructionRow}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.instructionText}>
                Hold steady for automatic scanning
              </Text>
            </View>
            <View style={styles.instructionRow}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.instructionText}>
                One-time setup - no passwords needed
              </Text>
            </View>
          </View>

          {/* Processing Indicator */}
          {isProcessing && (
            <View style={styles.processingBanner}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.processingBannerText}>
                Validating QR code...
              </Text>
            </View>
          )}

          {/* DEV Skip Button */}
          <TouchableOpacity
            style={styles.devSkipButton}
            onPress={handleDevSkip}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Ionicons name="flash" size={18} color="#FFA500" />
            <Text style={styles.devSkipText}>DEV: Skip Setup</Text>
          </TouchableOpacity>
        </LinearGradient>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#D1D5DB',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 26,
  },
  scanFrame: {
    width: 280,
    height: 280,
    alignSelf: 'center',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#4F46E5',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanningOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(79, 70, 229, 0.9)',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  instructions: {
    gap: 16,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  instructionText: {
    fontSize: 16,
    color: '#E5E7EB',
    fontWeight: '500',
    flex: 1,
  },
  processingBanner: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(79, 70, 229, 0.95)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  processingBannerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorCard: {
    width: '90%',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#FEE2E2',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  settingsButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  settingsButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
  },
  devSkipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 165, 0, 0.3)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFA500',
    alignSelf: 'center',
    marginTop: 20,
    zIndex: 999,
    elevation: 10,
  },
  devSkipText: {
    color: '#FFA500',
    fontSize: 14,
    fontWeight: '700',
  },
});
