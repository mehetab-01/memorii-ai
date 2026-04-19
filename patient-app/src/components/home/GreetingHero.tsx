import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';

const { width } = Dimensions.get('window');

interface GreetingHeroProps {
  greeting: string;
  userName: string;
  currentTime: string;
  currentDate: string;
}

export default function GreetingHero({ greeting, userName, currentTime, currentDate }: GreetingHeroProps) {
  const { theme } = useTheme();

  return (
    <LinearGradient
      colors={[theme.gradient1, theme.gradient2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.content}>
        <View style={styles.greetingRow}>
          <Ionicons name="sunny-outline" size={24} color="rgba(255,255,255,0.9)" />
          <Text style={styles.greetingText}>{greeting}</Text>
        </View>
        <Text style={styles.userName}>{userName}</Text>
        <View style={styles.timeContainer}>
          <Text style={styles.clockText}>{currentTime}</Text>
        </View>
        <View style={styles.dateBadge}>
          <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.dateText}>{currentDate}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: spacing.base,
    borderRadius: 24,
    padding: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
    marginBottom: spacing.lg,
  },
  content: {
    alignItems: 'center',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greetingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  timeContainer: {
    marginTop: 12,
  },
  clockText: {
    fontSize: 48,
    fontWeight: '200',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
});
