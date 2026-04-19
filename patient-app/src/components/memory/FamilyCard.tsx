import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import Badge from '../ui/Badge';
import { spacing, borderRadius } from '../../theme/spacing';

const { width } = Dimensions.get('window');

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  imageUrl: string;
  media: any[];
}

interface FamilyCardProps {
  member: FamilyMember;
  onPress: () => void;
  onLongPress: () => void;
}

export default function FamilyCard({ member, onPress, onLongPress }: FamilyCardProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.8}
      accessibilityLabel={`${member.name}, your ${member.relation}. Tap to hear about them, hold for photos.`}
      accessibilityRole="button"
    >
      <View style={styles.content}>
        <Image
          source={{ uri: member.imageUrl }}
          style={[styles.avatar, { borderColor: theme.primary }]}
          contentFit="cover"
          transition={200}
        />
        <Text style={[styles.name, { color: theme.textPrimary }]}>{member.name}</Text>
        <Badge label={member.relation} color={theme.primary} />
        <View style={styles.iconsRow}>
          <View style={styles.soundIcon}>
            <Ionicons name="volume-high" size={14} color={theme.primary} />
          </View>
          {member.media && member.media.length > 0 && (
            <View style={[styles.mediaBadge, { backgroundColor: theme.accent }]}>
              <Ionicons name="images" size={10} color="#FFFFFF" />
              <Text style={styles.mediaCount}>{member.media.length}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: width * 0.42,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    marginRight: spacing.md,
    borderWidth: 1,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  content: {
    alignItems: 'center',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 6,
  },
  soundIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(91, 106, 191, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  mediaCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
