import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface MediaViewerProps {
  visible: boolean;
  media: any[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export default function MediaViewer({ visible, media, currentIndex, onClose, onNavigate }: MediaViewerProps) {
  if (!media || media.length === 0) return null;
  const currentMedia = media[currentIndex];

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close-circle" size={36} color="#FFFFFF" />
        </TouchableOpacity>

        <Image source={{ uri: currentMedia?.uri }} style={styles.image} contentFit="contain" />

        {currentIndex > 0 && (
          <TouchableOpacity style={[styles.navBtn, styles.navLeft]} onPress={() => onNavigate('prev')}>
            <Ionicons name="chevron-back" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        {currentIndex < media.length - 1 && (
          <TouchableOpacity style={[styles.navBtn, styles.navRight]} onPress={() => onNavigate('next')}>
            <Ionicons name="chevron-forward" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <Text style={styles.counter}>{currentIndex + 1} / {media.length}</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  image: { width: width - 32, height: height * 0.7 },
  navBtn: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  navLeft: { left: 16, top: '50%', marginTop: -28 },
  navRight: { right: 16, top: '50%', marginTop: -28 },
  counter: { position: 'absolute', bottom: 50, color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
