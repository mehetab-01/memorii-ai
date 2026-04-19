import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import FamilyCard from './FamilyCard';
import SectionHeader from '../ui/SectionHeader';
import { spacing } from '../../theme/spacing';

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  imageUrl: string;
  media: any[];
}

interface MemoryLaneProps {
  familyMembers: FamilyMember[];
  onCardPress: (member: FamilyMember) => void;
  onCardLongPress: (member: FamilyMember) => void;
}

export default function MemoryLane({ familyMembers, onCardPress, onCardLongPress }: MemoryLaneProps) {
  return (
    <View style={styles.container}>
      <SectionHeader
        icon="heart"
        title="Your Loved Ones"
        subtitle="Tap to hear, hold for photos"
        iconColor="#E85D75"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {familyMembers.map((member) => (
          <FamilyCard
            key={member.id}
            member={member}
            onPress={() => onCardPress(member)}
            onLongPress={() => onCardLongPress(member)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
});
