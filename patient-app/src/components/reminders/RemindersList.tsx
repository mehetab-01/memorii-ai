import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import SectionHeader from '../ui/SectionHeader';
import ReminderCard from './ReminderCard';
import { spacing, borderRadius } from '../../theme/spacing';

interface ReminderItem {
  id: string;
  title: string;
  time: string;
  icon: string;
  color: string;
  completed: boolean;
  note?: string;
}

interface RemindersListProps {
  schedule: ReminderItem[];
  isLoading: boolean;
  onCompleteItem: (id: string) => void;
  onViewAll: () => void;
}

export default function RemindersList({ schedule, isLoading, onCompleteItem, onViewAll }: RemindersListProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <SectionHeader
        icon="today"
        title="Today's Schedule"
        subtitle={`${schedule.filter(i => i.completed).length}/${schedule.length} completed`}
        iconColor="#E8A87C"
      />
      {isLoading ? (
        <View style={[styles.loadingCard, { backgroundColor: theme.surface }]}>
          <ActivityIndicator color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading schedule...</Text>
        </View>
      ) : (
        <>
          {schedule.slice(0, 5).map((item) => (
            <ReminderCard key={item.id} item={item} onComplete={() => onCompleteItem(item.id)} />
          ))}
          {schedule.length > 5 && (
            <TouchableOpacity style={[styles.viewAllBtn, { borderColor: theme.primary }]} onPress={onViewAll}>
              <Text style={[styles.viewAllText, { color: theme.primary }]}>View All ({schedule.length} items)</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.primary} />
            </TouchableOpacity>
          )}
          {schedule.length === 0 && !isLoading && (
            <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
              <Ionicons name="checkmark-done-circle" size={40} color={theme.success} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No tasks for today</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  loadingCard: { padding: spacing.xl, alignItems: 'center', marginHorizontal: spacing.base, borderRadius: borderRadius.lg, gap: 8 },
  loadingText: { fontSize: 14 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.base, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1.5, marginTop: spacing.xs, gap: 4 },
  viewAllText: { fontSize: 15, fontWeight: '600' },
  emptyCard: { padding: spacing.xl, alignItems: 'center', marginHorizontal: spacing.base, borderRadius: borderRadius.lg, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '500' },
});
