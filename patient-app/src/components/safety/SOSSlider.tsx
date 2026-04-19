import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Animated as RNAnimated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, cancelAnimation } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { haptics } from '../../utils/haptics';
import { spacing, borderRadius } from '../../theme/spacing';

const HOLD_DURATION = 3000; // 3 seconds

interface SOSSliderProps {
  emergencyStatus: 'idle' | 'sending' | 'sent';
  onTriggerEmergency: () => void;
  onRouteHistory: () => void;
  onTestNotification: () => void;
  onViewTasks: () => void;
  taskCount: number;
}

export default function SOSSlider({ emergencyStatus, onTriggerEmergency, onRouteHistory, onTestNotification, onViewTasks, taskCount }: SOSSliderProps) {
  const { theme } = useTheme();
  const holdProgress = useRef(new RNAnimated.Value(0)).current;
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const breatheScale = useSharedValue(1);

  useEffect(() => {
    if (emergencyStatus === 'idle') {
      breatheScale.value = withRepeat(
        withSequence(withTiming(1.05, { duration: 1500 }), withTiming(1, { duration: 1500 })),
        -1, true
      );
    } else {
      cancelAnimation(breatheScale);
      breatheScale.value = withTiming(1);
    }
  }, [emergencyStatus]);

  // Cleanup on unmount to prevent leaked timers/intervals
  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if ((holdTimer as any).hapticInterval) clearInterval((holdTimer as any).hapticInterval);
      holdProgress.stopAnimation();
    };
  }, []);

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breatheScale.value }],
  }));

  const handlePressIn = () => {
    if (emergencyStatus !== 'idle') return;
    haptics.heavy();
    RNAnimated.timing(holdProgress, { toValue: 1, duration: HOLD_DURATION, useNativeDriver: false }).start();
    holdTimer.current = setTimeout(() => {
      haptics.error();
      onTriggerEmergency();
    }, HOLD_DURATION);
    // Haptic feedback every second
    const hapticInterval = setInterval(() => haptics.medium(), 1000);
    holdTimer.current = holdTimer.current;
    // Store interval for cleanup
    (holdTimer as any).hapticInterval = hapticInterval;
  };

  const handlePressOut = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      if ((holdTimer as any).hapticInterval) clearInterval((holdTimer as any).hapticInterval);
    }
    RNAnimated.timing(holdProgress, { toValue: 0, duration: 300, useNativeDriver: false }).start();
  };

  const progressWidth = holdProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const gradientColors = emergencyStatus === 'sent' ? ['#7BC67E', '#5BAA5E'] as const
    : emergencyStatus === 'sending' ? ['#F0C75E', '#E8A87C'] as const
    : ['#E85D5D', '#D04040'] as const;

  const statusIcon = emergencyStatus === 'sent' ? 'checkmark-circle' : emergencyStatus === 'sending' ? 'sync' : 'alert-circle';
  const statusText = emergencyStatus === 'sent' ? 'ALERT SENT!' : emergencyStatus === 'sending' ? 'SENDING...' : 'HOLD FOR EMERGENCY';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* SOS Button */}
      <Animated.View style={breatheStyle}>
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          disabled={emergencyStatus !== 'idle'}
          accessibilityLabel="Hold for 3 seconds to send emergency alert"
          accessibilityRole="button"
        >
          <LinearGradient colors={gradientColors} style={styles.sosButton}>
            {/* Progress overlay */}
            <RNAnimated.View style={[styles.progressOverlay, { width: progressWidth }]} />
            <View style={styles.sosContent}>
              <Ionicons name={statusIcon} size={28} color="#FFFFFF" />
              <Text style={styles.sosText}>{statusText}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surface }]} onPress={onRouteHistory}>
          <Ionicons name="map-outline" size={20} color={theme.primary} />
          <Text style={[styles.actionText, { color: theme.primary }]}>Route</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surface }]} onPress={onTestNotification}>
          <Ionicons name="notifications-outline" size={20} color="#F0C75E" />
          <Text style={[styles.actionText, { color: '#F0C75E' }]}>Test</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surface }]} onPress={onViewTasks}>
          <Ionicons name="list-outline" size={20} color={theme.primary} />
          <Text style={[styles.actionText, { color: theme.primary }]}>Tasks</Text>
          {taskCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{taskCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.base, paddingBottom: spacing.xl, paddingTop: spacing.md },
  sosButton: { height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', shadowColor: '#E85D5D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  progressOverlay: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 36 },
  sosContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sosText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderRadius: borderRadius.lg, gap: 6 },
  actionText: { fontSize: 13, fontWeight: '600' },
  badge: { position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#E85D5D', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});
