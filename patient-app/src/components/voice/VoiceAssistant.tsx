import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import SectionHeader from '../ui/SectionHeader';
import PulseButton from './PulseButton';
import { spacing, borderRadius } from '../../theme/spacing';

interface VoiceAssistantProps {
  isListening: boolean;
  isProcessing: boolean;
  voiceResponse: string;
  onMicPress: () => void;
}

export default function VoiceAssistant({ isListening, isProcessing, voiceResponse, onMicPress }: VoiceAssistantProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <SectionHeader
        icon="chatbubble-ellipses"
        title="Voice Assistant"
        subtitle="I'm here to help you"
        iconColor="#7C6BC4"
      />
      <View style={styles.content}>
        <PulseButton isListening={isListening} isProcessing={isProcessing} onPress={onMicPress} />
        {voiceResponse ? (
          <View style={[styles.responseBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="chatbubble" size={16} color={theme.primary} />
            <Text style={[styles.responseText, { color: theme.textPrimary }]}>{voiceResponse}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  content: { alignItems: 'center' },
  responseBox: {
    marginHorizontal: spacing.base,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  responseText: { flex: 1, fontSize: 15, lineHeight: 22 },
});
