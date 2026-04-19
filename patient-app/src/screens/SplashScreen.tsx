/**
 * SplashScreen
 * Full-screen warm gradient with animated breathing circle.
 * Checks MMKV for setup status, then navigates accordingly.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS as SEC_KEYS } from '../constants/config';

type RootParamList = {
  Splash: undefined;
  Setup: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

export default function SplashScreen() {
  const navigation = useNavigation<StackNavigationProp<RootParamList>>();

  // Breathing circle animation
  const breathe = useRef(new Animated.Value(1)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;
  const logoFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo fade in
    Animated.timing(logoFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    // Tagline fade in after 600ms
    setTimeout(() => {
      Animated.timing(taglineFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, 600);

    // Breathing loop (scale 1 → 1.15 → 1, 3s)
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.15, duration: 1500, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    // Navigate after 2.2 seconds
    const timer = setTimeout(async () => {
      try {
        const token = await SecureStore.getItemAsync(SEC_KEYS.SESSION_TOKEN);
        if (token) {
          navigation.replace('Dashboard');
        } else {
          navigation.replace('Setup');
        }
      } catch {
        navigation.replace('Setup');
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [breathe, taglineFade, logoFade, navigation]);

  return (
    <LinearGradient
      colors={['#4A6FA5', '#2E4D7B']}
      style={styles.container}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
    >
      {/* Background breathing circle */}
      <Animated.View
        style={[
          styles.breatheCircle,
          { transform: [{ scale: breathe }] },
        ]}
      />

      {/* Logo + wordmark */}
      <Animated.View style={[styles.content, { opacity: logoFade }]}>
        <Text style={styles.logo} accessibilityLabel="Memorii logo">🧠</Text>
        <Text style={styles.wordmark} allowFontScaling={false}>Memorii</Text>

        <Animated.Text style={[styles.tagline, { opacity: taglineFade }]} allowFontScaling={false}>
          Here to help, always
        </Animated.Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breatheCircle: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  content: {
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    fontSize: 64,
    marginBottom: 8,
  },
  wordmark: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 44,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
});
