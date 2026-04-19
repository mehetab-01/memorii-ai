import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface SectionHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  iconColor?: string;
}

export default function SectionHeader({ icon, title, subtitle, iconColor }: SectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: (iconColor || theme.primary) + '15' }]}>
        <Ionicons name={icon} size={24} color={iconColor || theme.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
    paddingHorizontal: spacing.base,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: typography.size.sm,
    marginTop: 2,
  },
});
