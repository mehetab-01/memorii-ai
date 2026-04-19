/**
 * Individual reminder/schedule item card.
 * Left accent bar by type, animated checkmark on completion, haptic feedback.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';

interface ReminderCardProps {
  id: string;
  title: string;
  time: string;
  type?: string;
  note?: string;
  completed: boolean;
  onToggle: (id: string) => void;
}

function getTypeColor(type: string, primary: string, success: string, accent: string, warning: string): string {
  switch (type) {
    case 'medication': return primary;
    case 'meal': return success;
    case 'activity': return accent;
    case 'appointment': return warning;
    default: return primary;
  }
}

function getTypeEmoji(type: string, icon?: string): string {
  if (icon === 'medical' || type === 'medication') return '💊';
  if (icon === 'restaurant' || type === 'meal') return '🍽️';
  if (icon === 'walk' || type === 'activity') return '🚶';
  if (icon === 'calendar' || type === 'appointment') return '📅';
  return '✅';
}

export function ReminderCard({ id, title, time, type = 'task', note, completed, onToggle }: ReminderCardProps) {
  const { theme } = useTheme();
  const checkScale = useSharedValue(completed ? 1 : 0);
  const cardOpacity = useSharedValue(completed ? 0.65 : 1);

  React.useEffect(() => {
    checkScale.value = withSpring(completed ? 1 : 0, { damping: 12, stiffness: 200 });
    cardOpacity.value = withTiming(completed ? 0.65 : 1, { duration: 300 });
  }, [completed, checkScale, cardOpacity]);

  const handleToggle = useCallback(() => {
    Haptics.notificationAsync(
      completed ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success
    );
    onToggle(id);
  }, [id, completed, onToggle]);

  const accentColor = getTypeColor(type, theme.primary, theme.success, theme.accent, theme.warning);
  const emoji = getTypeEmoji(type);

  const cardStyle = useAnimatedStyle(() => ({ opacity: cardOpacity.value }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  return (
    <Animated.View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }, cardStyle]}>
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.emoji} accessibilityElementsHidden>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.title,
              { color: theme.text },
              completed && styles.strikethrough,
            ]}
            allowFontScaling
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text style={[styles.time, { color: theme.textSecondary }]} allowFontScaling>{time}</Text>
          {note ? (
            <Text style={[styles.note, { color: theme.textMuted }]} allowFontScaling numberOfLines={1}>
              {note}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Checkbox */}
      <Pressable
        onPress={handleToggle}
        style={[styles.checkbox, { borderColor: accentColor, backgroundColor: completed ? accentColor : 'transparent' }]}
        accessibilityRole="checkbox"
        accessibilityLabel={`Mark ${title} as ${completed ? 'incomplete' : 'complete'}`}
        accessibilityState={{ checked: completed }}
        hitSlop={12}
      >
        <Animated.Text style={[styles.checkmark, checkStyle]}>✓</Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
    minHeight: 72,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingLeft: 12,
    gap: 10,
  },
  emoji: {
    fontSize: 22,
  },
  title: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  time: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  note: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginLeft: 8,
    minWidth: 36,
    minHeight: 36,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
  },
});
