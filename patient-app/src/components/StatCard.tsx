/**
 * Quick stat card (water, walking, medications).
 * Tappable — increments value with haptic + bounce animation.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ProgressRing } from './ProgressRing';
import { useTheme } from '../theme/ThemeContext';

interface StatCardProps {
  emoji: string;
  label: string;
  value: number;
  target: number;
  unit?: string;
  color: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function StatCard({
  emoji,
  label,
  value,
  target,
  unit,
  color,
  onPress,
  accessibilityLabel,
}: StatCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(
      withTiming(0.92, { duration: 80, easing: Easing.out(Easing.quad) }),
      withTiming(1.06, { duration: 120, easing: Easing.out(Easing.back(3)) }),
      withTiming(1, { duration: 100 })
    );
    onPress?.();
  }, [onPress, scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const progress = target > 0 ? Math.min(1, value / target) : 0;
  const displayText = unit ? `${value}${unit}` : `${value}/${target}`;

  return (
    <Animated.View style={[animStyle, { flex: 1 }]}>
      <Pressable
        onPress={handlePress}
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `${label}: ${displayText}. Tap to update.`}
        accessibilityHint="Double tap to increment"
      >
        <ProgressRing size={56} progress={progress} color={color} />
        <Text style={styles.emoji} accessibilityElementsHidden>{emoji}</Text>
        <Text style={[styles.value, { color: theme.text }]} allowFontScaling numberOfLines={1}>
          {displayText}
        </Text>
        <Text style={[styles.label, { color: theme.textSecondary }]} allowFontScaling numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    minHeight: 120,
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
    marginTop: -44, // overlaps the ring center
    marginBottom: -8,
  },
  value: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    textAlign: 'center',
  },
  label: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    textAlign: 'center',
  },
});
