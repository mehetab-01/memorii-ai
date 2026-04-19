import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, FlatList, Dimensions, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, borderRadius } from '../../theme/spacing';

const { width } = Dimensions.get('window');
const GALLERY_ITEM_SIZE = (width - 64) / 3;

interface FamilyDetailModalProps {
  visible: boolean;
  member: any;
  onClose: () => void;
  onPickImage: () => void;
  onTakePhoto: () => void;
  onRecordVideo: () => void;
  onOpenGooglePhotos: () => void;
  onViewMedia: (index: number) => void;
  onDeleteMedia: (index: number) => void;
  onSpeak: () => void;
}

export default function FamilyDetailModal({
  visible, member, onClose, onPickImage, onTakePhoto, onRecordVideo,
  onOpenGooglePhotos, onViewMedia, onDeleteMedia, onSpeak,
}: FamilyDetailModalProps) {
  const { theme } = useTheme();

  if (!member) return null;

  const actions = [
    { icon: 'images', label: 'Gallery', color: '#5B6ABF', onPress: onPickImage },
    { icon: 'camera', label: 'Camera', color: '#7BC67E', onPress: onTakePhoto },
    { icon: 'videocam', label: 'Video', color: '#E85D5D', onPress: onRecordVideo },
    { icon: 'logo-google', label: 'Google', color: '#F0C75E', onPress: onOpenGooglePhotos },
  ];

  const renderMediaItem = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={styles.mediaItem}
      onPress={() => onViewMedia(index)}
      onLongPress={() => {
        Alert.alert('Delete Media', 'Remove this photo?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDeleteMedia(index) },
        ]);
      }}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.uri }} style={styles.mediaImage} contentFit="cover" />
      {item.type === 'video' && (
        <View style={styles.videoOverlay}>
          <Ionicons name="play-circle" size={32} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.content, { backgroundColor: theme.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Image source={{ uri: member.imageUrl }} style={[styles.avatar, { borderColor: theme.primary }]} contentFit="cover" />
            <View style={styles.headerText}>
              <Text style={[styles.name, { color: theme.textPrimary }]}>{member.name}</Text>
              <Text style={[styles.relation, { color: theme.textSecondary }]}>Your {member.relation}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close-circle" size={32} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            {actions.map((action) => (
              <TouchableOpacity key={action.label} style={[styles.actionBtn, { backgroundColor: action.color + '15' }]} onPress={action.onPress}>
                <Ionicons name={action.icon as any} size={22} color={action.color} />
                <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Gallery */}
          {member.media && member.media.length > 0 ? (
            <FlatList
              data={member.media}
              renderItem={renderMediaItem}
              keyExtractor={(_, i) => i.toString()}
              numColumns={3}
              contentContainerStyle={styles.gallery}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyGallery}>
              <Ionicons name="images-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No photos yet</Text>
              <Text style={[styles.emptyHint, { color: theme.textMuted }]}>Use the buttons above to add memories</Text>
            </View>
          )}

          {/* Speak Button */}
          <TouchableOpacity style={[styles.speakBtn, { backgroundColor: theme.primary }]} onPress={onSpeak}>
            <Ionicons name="volume-high" size={20} color="#FFFFFF" />
            <Text style={styles.speakText}>Hear About {member.name}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  content: { height: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, marginRight: spacing.md },
  headerText: { flex: 1 },
  name: { fontSize: 20, fontWeight: '700' },
  relation: { fontSize: 14, marginTop: 2 },
  closeBtn: { padding: 4 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  actionBtn: { flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.md, gap: 4 },
  actionLabel: { fontSize: 11, fontWeight: '600' },
  gallery: { paddingBottom: spacing.lg },
  mediaItem: { width: GALLERY_ITEM_SIZE, height: GALLERY_ITEM_SIZE, margin: 2, borderRadius: borderRadius.sm, overflow: 'hidden' },
  mediaImage: { width: '100%', height: '100%' },
  videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  emptyGallery: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptyHint: { fontSize: 13 },
  speakBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.base, borderRadius: borderRadius.xl, gap: 8, marginTop: spacing.sm },
  speakText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
