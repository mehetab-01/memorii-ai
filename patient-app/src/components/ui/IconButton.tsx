import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { haptics } from '../../utils/haptics';

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  backgroundColor?: string;
  onPress: () => void;
  style?: ViewStyle;
  accessibilityLabel: string;
}

export default function IconButton({ icon, size = 24, color, backgroundColor, onPress, style, accessibilityLabel }: IconButtonProps) {
  const { theme } = useTheme();

  const handlePress = () => {
    haptics.light();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[styles.button, backgroundColor ? { backgroundColor } : null, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon} size={size} color={color || theme.textPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
