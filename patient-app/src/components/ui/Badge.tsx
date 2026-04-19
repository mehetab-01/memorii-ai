import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, spacing } from '../../theme/spacing';

interface BadgeProps {
  label: string;
  color?: string;
  textColor?: string;
  size?: 'sm' | 'md';
}

export default function Badge({ label, color, textColor, size = 'sm' }: BadgeProps) {
  const { theme } = useTheme();
  const bgColor = color || theme.primary;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, size === 'md' && styles.badgeMd]}>
      <Text style={[styles.text, { color: textColor || '#FFFFFF' }, size === 'md' && styles.textMd]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeMd: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  textMd: {
    fontSize: 13,
  },
});
