/**
 * Skeleton loading placeholders with Reanimated pulse animation.
 * Use instead of spinners for all data-loading states.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const { theme } = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: theme.border },
        animStyle,
        style,
      ]}
    />
  );
}

// Pre-built skeleton layouts
export function ScheduleItemSkeleton() {
  return (
    <View style={styles.scheduleItem}>
      <SkeletonBox width={4} height={56} borderRadius={2} />
      <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
        <SkeletonBox width="60%" height={16} />
        <SkeletonBox width="35%" height={13} />
      </View>
      <SkeletonBox width={56} height={56} borderRadius={28} />
    </View>
  );
}

export function FamilyCardSkeleton() {
  return <SkeletonBox width={140} height={180} borderRadius={20} style={{ marginRight: 12 }} />;
}

export function StatCardSkeleton() {
  return (
    <View style={styles.statCard}>
      <SkeletonBox width={56} height={56} borderRadius={28} style={{ alignSelf: 'center' }} />
      <SkeletonBox width="70%" height={14} style={{ marginTop: 8, alignSelf: 'center' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
});
