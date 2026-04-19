import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { haptics } from '../../utils/haptics';
import { spacing, borderRadius } from '../../theme/spacing';

const { width } = Dimensions.get('window');

interface StatData {
  current: number;
  target: number;
}

interface QuickStatsProps {
  dailyStats: {
    waterGlasses: StatData;
    medicines: StatData;
    walkingTimes: StatData;
  };
  onUpdateStat: (type: 'water' | 'medicine' | 'walking') => void;
}

const statConfig = [
  { key: 'water' as const, dataKey: 'waterGlasses' as const, icon: 'water', label: 'Water', color: '#5B9BD5' },
  { key: 'medicine' as const, dataKey: 'medicines' as const, icon: 'medical', label: 'Medicine', color: '#5B6ABF' },
  { key: 'walking' as const, dataKey: 'walkingTimes' as const, icon: 'walk', label: 'Walking', color: '#7BC67E' },
];

export default function QuickStats({ dailyStats, onUpdateStat }: QuickStatsProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {statConfig.map(({ key, dataKey, icon, label, color }) => {
        const stat = dailyStats[dataKey];
        const isComplete = stat.current >= stat.target;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => { haptics.light(); onUpdateStat(key); }}
            activeOpacity={0.7}
            accessibilityLabel={`${label}: ${stat.current} of ${stat.target}. Tap to add.`}
            accessibilityRole="button"
          >
            <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
              <Ionicons name={icon as any} size={22} color={color} />
            </View>
            <Text style={[styles.statNumber, { color: isComplete ? theme.success : theme.textPrimary }]}>
              {stat.current}/{stat.target}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
            {isComplete && (
              <Ionicons name="checkmark-circle" size={16} color={theme.success} style={styles.checkIcon} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
