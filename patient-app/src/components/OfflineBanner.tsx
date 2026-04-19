/**
 * Persistent offline indicator banner.
 * Appears at top when NetInfo reports no connectivity.
 * Disappears with a brief success flash when connection restores.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const translateY = useRef(new Animated.Value(-60)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = !state.isConnected;
      setIsOffline(prev => {
        if (prev && !offline) {
          // Was offline, now online — show success flash
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
        }
        return offline;
      });
    });
    return unsub;
  }, []);

  const visible = isOffline || showSuccess;
  const bgColor = showSuccess ? '#6BAF7E' : '#E8935A';
  const message = showSuccess ? '✓ Back online' : '📡 No connection — showing saved information';

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : -60,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [visible, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top, backgroundColor: bgColor, transform: [{ translateY }] },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <Text style={styles.text} allowFontScaling>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9998,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
    textAlign: 'center',
  },
});
