import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { haptics } from '../../utils/haptics';
import { spacing, borderRadius } from '../../theme/spacing';

interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  icon: string;
  color: string;
  completed: boolean;
  note?: string;
}

interface ReminderCardProps {
  item: ScheduleItem;
  onComplete: () => void;
}

export default function ReminderCard({ item, onComplete }: ReminderCardProps) {
  const { theme } = useTheme();

  const handleComplete = () => {
    haptics.success();
    onComplete();
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, opacity: item.completed ? 0.6 : 1 }]}
      onPress={() => !item.completed && handleComplete()}
      activeOpacity={0.7}
      accessibilityLabel={`${item.title} at ${item.time}. ${item.completed ? 'Completed' : 'Tap to complete'}`}
      accessibilityRole="button"
    >
      <View style={[styles.iconCircle, { backgroundColor: item.color + '18' }]}>
        <Ionicons name={item.icon as any} size={22} color={item.color} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.textPrimary, textDecorationLine: item.completed ? 'line-through' : 'none' }]}>
          {item.title}
        </Text>
        <Text style={[styles.time, { color: theme.textSecondary }]}>
          {item.time} • {item.completed ? 'Completed ✓' : (item.note || 'Upcoming')}
        </Text>
      </View>
      {!item.completed && (
        <TouchableOpacity onPress={handleComplete} style={[styles.checkBtn, { backgroundColor: theme.success }]} accessibilityLabel="Mark complete">
          <Ionicons name="checkmark" size={18} color="#FFF" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    fontSize: 13,
    marginTop: 2,
  },
  checkBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
