import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, withSequence } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { haptics } from '../../utils/haptics';

interface PulseButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  onPress: () => void;
}

export default function PulseButton({ isListening, isProcessing, onPress }: PulseButtonProps) {
  const { theme } = useTheme();
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0);
  const ring3Scale = useSharedValue(1);
  const ring3Opacity = useSharedValue(0);

  useEffect(() => {
    if (isListening) {
      const duration = 2000;
      ring1Scale.value = withRepeat(withTiming(1.8, { duration }), -1, false);
      ring1Opacity.value = withRepeat(withSequence(withTiming(0.4, { duration: 200 }), withTiming(0, { duration: duration - 200 })), -1, false);
      ring2Scale.value = withDelay(400, withRepeat(withTiming(1.8, { duration }), -1, false));
      ring2Opacity.value = withDelay(400, withRepeat(withSequence(withTiming(0.3, { duration: 200 }), withTiming(0, { duration: duration - 200 })), -1, false));
      ring3Scale.value = withDelay(800, withRepeat(withTiming(1.8, { duration }), -1, false));
      ring3Opacity.value = withDelay(800, withRepeat(withSequence(withTiming(0.2, { duration: 200 }), withTiming(0, { duration: duration - 200 })), -1, false));
    } else {
      ring1Scale.value = withTiming(1, { duration: 300 });
      ring1Opacity.value = withTiming(0, { duration: 300 });
      ring2Scale.value = withTiming(1, { duration: 300 });
      ring2Opacity.value = withTiming(0, { duration: 300 });
      ring3Scale.value = withTiming(1, { duration: 300 });
      ring3Opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isListening]);

  const ring1Style = useAnimatedStyle(() => ({ transform: [{ scale: ring1Scale.value }], opacity: ring1Opacity.value }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ scale: ring2Scale.value }], opacity: ring2Opacity.value }));
  const ring3Style = useAnimatedStyle(() => ({ transform: [{ scale: ring3Scale.value }], opacity: ring3Opacity.value }));

  const handlePress = () => {
    haptics.medium();
    onPress();
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.ring, { borderColor: theme.primary }, ring1Style]} />
      <Animated.View style={[styles.ring, { borderColor: theme.primary }, ring2Style]} />
      <Animated.View style={[styles.ring, { borderColor: theme.primary }, ring3Style]} />
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8} accessibilityLabel={isListening ? 'Stop listening' : 'Talk to me'} accessibilityRole="button">
        <LinearGradient
          colors={isListening ? [theme.danger, '#FF8A80'] : [theme.micGradient1, theme.micGradient2]}
          style={styles.button}
        >
          <Ionicons name={isProcessing ? 'hourglass' : isListening ? 'mic' : 'mic-outline'} size={48} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {isProcessing ? 'Thinking...' : isListening ? 'Listening...' : 'Tap to talk'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center', height: 220, marginVertical: 8 },
  ring: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2 },
  button: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', shadowColor: '#5B6ABF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  label: { marginTop: 12, fontSize: 15, fontWeight: '600' },
});
