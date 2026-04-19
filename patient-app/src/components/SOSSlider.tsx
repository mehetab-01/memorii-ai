/**
 * SOS Slide-to-confirm button.
 * Prevents accidental activation — user must slide the thumb to the end.
 * On confirm: heavy haptic + opens emergency contact dialer + emits socket event.
 */
import React, { useCallback, useRef } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Vibration from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';

interface SOSSliderProps {
  emergencyContact?: string | null;
  onTriggered?: () => void;
}

const TRACK_WIDTH = 280;
const THUMB_SIZE = 56;
const TRACK_PADDING = 4;
const MAX_TRANSLATE = TRACK_WIDTH - THUMB_SIZE - TRACK_PADDING * 2;
const TRIGGER_THRESHOLD = MAX_TRANSLATE * 0.85;

export function SOSSlider({ emergencyContact, onTriggered }: SOSSliderProps) {
  const { theme } = useTheme();
  const translateX = useSharedValue(0);
  const isTriggered = useRef(false);

  const triggerSOS = useCallback(() => {
    if (isTriggered.current) return;
    isTriggered.current = true;

    // Triple heavy vibration
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 400);

    // Open dialer
    const phone = emergencyContact?.replace(/\D/g, '');
    if (phone) {
      setTimeout(() => {
        Linking.openURL(`tel:${phone}`).catch(() => {});
      }, 100);
    }

    onTriggered?.();

    // Reset after 3 seconds
    setTimeout(() => {
      isTriggered.current = false;
      translateX.value = withSpring(0, { damping: 15 });
    }, 3000);
  }, [emergencyContact, onTriggered, translateX]);

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, { startX: number }>({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
    },
    onActive: (event, ctx) => {
      const newX = Math.max(0, Math.min(MAX_TRANSLATE, ctx.startX + event.translationX));
      translateX.value = newX;
    },
    onEnd: () => {
      if (translateX.value >= TRIGGER_THRESHOLD) {
        translateX.value = withSpring(MAX_TRANSLATE);
        runOnJS(triggerSOS)();
      } else {
        translateX.value = withSpring(0, { damping: 15 });
      }
    },
  });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const labelOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, MAX_TRANSLATE * 0.5], [1, 0], Extrapolate.CLAMP),
  }));

  const confirmOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [MAX_TRANSLATE * 0.6, MAX_TRANSLATE], [0, 1], Extrapolate.CLAMP),
  }));

  return (
    <View style={styles.wrapper} accessibilityRole="adjustable" accessibilityLabel="SOS emergency slider" accessibilityHint="Slide to the right to call for help">
      <Text style={[styles.cardLabel, { color: theme.danger }]} allowFontScaling>
        Need Help?
      </Text>

      <View style={[styles.track, { backgroundColor: theme.dangerLight + '30', borderColor: theme.dangerLight }]}>
        {/* Label: slide direction */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.labelContainer, labelOpacity]}>
          <Text style={[styles.trackLabel, { color: theme.danger }]} allowFontScaling>
            Slide to call for help →
          </Text>
        </Animated.View>

        {/* Confirm label */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.labelContainer, confirmOpacity]}>
          <Text style={[styles.trackLabel, { color: theme.danger }]} allowFontScaling>
            ✓ Calling for help...
          </Text>
        </Animated.View>

        {/* Thumb */}
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View
            style={[
              styles.thumb,
              { backgroundColor: theme.danger, left: TRACK_PADDING },
              thumbStyle,
            ]}
            accessibilityElementsHidden
          >
            <Text style={styles.thumbIcon}>📞</Text>
          </Animated.View>
        </PanGestureHandler>
      </View>

      {emergencyContact ? (
        <Text style={[styles.contactHint, { color: theme.textMuted }]} allowFontScaling>
          Will call {emergencyContact}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 10,
  },
  cardLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
    alignSelf: 'flex-start',
  },
  track: {
    width: TRACK_WIDTH,
    height: THUMB_SIZE + TRACK_PADDING * 2,
    borderRadius: (THUMB_SIZE + TRACK_PADDING * 2) / 2,
    borderWidth: 1.5,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  labelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  thumbIcon: {
    fontSize: 24,
  },
  contactHint: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
});
