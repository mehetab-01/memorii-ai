import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';

interface LoadingScreenProps {
  message?: string;
  patientName?: string;
}

export default function LoadingScreen({ message = 'Loading...', patientName }: LoadingScreenProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1, true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <LinearGradient colors={['#5B6ABF', '#8B96D6']} style={styles.container}>
      <Animated.View style={animatedStyle}>
        <Ionicons name="heart-circle" size={80} color="#FFFFFF" />
      </Animated.View>
      <Text style={styles.title}>Memorii</Text>
      {patientName && (
        <Text style={styles.greeting}>Welcome back, {patientName}</Text>
      )}
      <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" style={{ marginTop: 24 }} />
      <Text style={styles.message}>{message}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginTop: 20, letterSpacing: 1 },
  greeting: { fontSize: 18, color: 'rgba(255,255,255,0.9)', marginTop: 8 },
  message: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 12 },
});
