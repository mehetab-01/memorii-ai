/**
 * Voice assistant bottom sheet.
 * Shows conversation history (last 3) + current response.
 * Uses @gorhom/bottom-sheet.
 */
import React, { useCallback, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme } from '../theme/ThemeContext';
import { VoiceEntry } from '../storage';

interface VoiceSheetProps {
  isOpen: boolean;
  isListening: boolean;
  currentResponse: string;
  history: VoiceEntry[];
  onClose: () => void;
}

export function VoiceSheet({ isOpen, isListening, currentResponse, history, onClose }: VoiceSheetProps) {
  const { theme } = useTheme();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['40%', '65%'], []);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
    onClose();
  }, [onClose]);

  React.useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: theme.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.border }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: theme.text }]} allowFontScaling>
              {isListening ? '🎤 Listening...' : '🤖 Memorii'}
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            style={[styles.closeBtn, { backgroundColor: theme.surfaceAlt }]}
            accessibilityRole="button"
            accessibilityLabel="Close voice assistant"
            hitSlop={12}
          >
            <Text style={{ color: theme.textSecondary, fontFamily: 'Nunito_600SemiBold' }}>Done</Text>
          </Pressable>
        </View>

        {/* Current response */}
        {currentResponse ? (
          <View style={[styles.responseCard, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
            <Text style={[styles.responseText, { color: theme.text }]} allowFontScaling>
              {currentResponse}
            </Text>
          </View>
        ) : isListening ? (
          <View style={[styles.responseCard, { backgroundColor: theme.surfaceAlt }]}>
            <Text style={[styles.listeningText, { color: theme.textSecondary }]} allowFontScaling>
              I'm listening, speak now...
            </Text>
          </View>
        ) : null}

        {/* History */}
        {history.length > 0 && (
          <>
            <Text style={[styles.historyLabel, { color: theme.textMuted }]} allowFontScaling>
              Recent conversations
            </Text>
            {history.slice(0, 3).map((entry, i) => (
              <View key={i} style={[styles.historyItem, { borderColor: theme.border }]}>
                <Text style={[styles.historyQuery, { color: theme.textSecondary }]} allowFontScaling numberOfLines={1}>
                  You: {entry.query}
                </Text>
                <Text style={[styles.historyResponse, { color: theme.text }]} allowFontScaling numberOfLines={2}>
                  {entry.response}
                </Text>
              </View>
            ))}
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
  },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
    justifyContent: 'center',
  },
  responseCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  responseText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 18,
    lineHeight: 28,
  },
  listeningText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    fontStyle: 'italic',
  },
  historyLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  historyItem: {
    borderBottomWidth: 1,
    paddingBottom: 10,
    gap: 4,
  },
  historyQuery: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
  },
  historyResponse: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
});
