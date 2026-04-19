/**
 * Toast notification system.
 * Slide-down from top, auto-dismiss after 3 seconds.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { Animated, StyleSheet, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide: () => void;
}

export function Toast({ visible, message, type = 'info', duration = 3000, onHide }: ToastProps) {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(onHide);
  }, [translateY, opacity, onHide]);

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(hide, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, hide, translateY, opacity]);

  const bgColor: Record<ToastType, string> = {
    success: theme.success,
    error: theme.danger,
    info: theme.primary,
    warning: theme.warning,
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + 8, backgroundColor: bgColor[type], transform: [{ translateY }], opacity },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Pressable onPress={hide} style={styles.inner}>
        <Text style={styles.text} allowFontScaling>{message}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    zIndex: 9999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  inner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Nunito_600SemiBold',
    textAlign: 'center',
    lineHeight: 22,
  },
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

import { useState } from 'react';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'info' });

  const show = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ visible: true, message, type });
  }, []);

  const hide = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  return { toast, show, hide };
}
