import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, spacing } from '../../theme/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  activeOpacity?: number;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function Card({ children, style, onPress, onLongPress, delayLongPress = 500, activeOpacity = 0.8 }: CardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  if (onPress || onLongPress) {
    return (
      <AnimatedTouchable
        style={[
          styles.card,
          { backgroundColor: theme.surface, shadowColor: theme.shadow, borderColor: theme.border },
          animatedStyle,
          style,
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={delayLongPress}
        activeOpacity={activeOpacity}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {children}
      </AnimatedTouchable>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.shadow, borderColor: theme.border }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});
