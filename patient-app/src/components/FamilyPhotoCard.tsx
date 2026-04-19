/**
 * Family photo card for horizontal memory lane.
 * 180x220dp, photo fills card with name gradient overlay.
 */
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface FamilyPhotoCardProps {
  name: string;
  relation?: string;
  imageUrl?: string;
  onPress?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function FamilyPhotoCard({ name, relation, imageUrl, onPress }: FamilyPhotoCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${name}${relation ? ', ' + relation : ''}. Tap to see more.`}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.photo}
          resizeMode="cover"
          accessibilityLabel={`Photo of ${name}`}
        />
      ) : (
        <View style={[styles.photo, styles.placeholder]}>
          <Text style={styles.initials}>{getInitials(name)}</Text>
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.72)']}
        style={styles.gradient}
        pointerEvents="none"
      />

      <View style={styles.nameContainer} pointerEvents="none">
        <Text style={styles.name} allowFontScaling numberOfLines={1}>{name}</Text>
        {relation ? (
          <Text style={styles.relation} allowFontScaling numberOfLines={1}>{relation}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 150,
    height: 200,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: '#4A6FA5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 40,
    fontFamily: 'Nunito_800ExtraBold',
    color: '#FFFFFF',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
  },
  nameContainer: {
    position: 'absolute',
    bottom: 12,
    left: 10,
    right: 10,
  },
  name: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  relation: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    marginTop: 1,
  },
});
