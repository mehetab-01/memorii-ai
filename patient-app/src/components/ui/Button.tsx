import React from 'react';
import { StyleSheet, TouchableOpacity, Text, ViewStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { haptics } from '../../utils/haptics';
import { borderRadius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({ title, onPress, variant = 'primary', icon, disabled, loading, style, size = 'md' }: ButtonProps) {
  const { theme } = useTheme();

  const handlePress = () => {
    haptics.light();
    onPress();
  };

  const sizeStyles = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.base },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    lg: { paddingVertical: spacing.base, paddingHorizontal: spacing.xl, minHeight: 56 },
  };

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[style]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <LinearGradient
          colors={[theme.primary, theme.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.button, sizeStyles[size], disabled && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              {icon}
              <Text style={[styles.buttonText, icon ? { marginLeft: spacing.sm } : null]}>{title}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyles = {
    secondary: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
    danger: { backgroundColor: theme.danger },
    ghost: { backgroundColor: 'transparent' },
  };

  const textColor = {
    secondary: theme.textPrimary,
    danger: '#FFFFFF',
    ghost: theme.primary,
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[styles.button, sizeStyles[size], variantStyles[variant], disabled && styles.disabled, style]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} />
      ) : (
        <>
          {icon}
          <Text style={[styles.buttonText, { color: textColor[variant] }, icon ? { marginLeft: spacing.sm } : null]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: typography.size.lg,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
