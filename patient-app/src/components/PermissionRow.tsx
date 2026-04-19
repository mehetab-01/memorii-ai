/**
 * Permission status row for SettingsScreen.
 * Shows live status badge with a "Fix" button if not granted.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PermissionStatus } from '../permissions';
import { useTheme } from '../theme/ThemeContext';

interface PermissionRowProps {
  label: string;
  emoji: string;
  status: PermissionStatus;
  onFix?: () => void;
}

function statusLabel(s: PermissionStatus): string {
  switch (s) {
    case 'granted': return 'Enabled';
    case 'denied': return 'Denied';
    case 'blocked': return 'Blocked';
    case 'undetermined': return 'Not set';
  }
}

export function PermissionRow({ label, emoji, status, onFix }: PermissionRowProps) {
  const { theme } = useTheme();

  const dotColor = status === 'granted' ? theme.success : theme.warning;
  const needsFix = status !== 'granted';

  return (
    <View
      style={[styles.row, { borderColor: theme.border }]}
      accessibilityLabel={`${label}: ${statusLabel(status)}`}
    >
      <Text style={styles.emoji} accessibilityElementsHidden>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: theme.text }]} allowFontScaling>{label}</Text>
      </View>

      <View style={[styles.badge, { backgroundColor: dotColor + '20', borderColor: dotColor }]}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={[styles.badgeText, { color: dotColor }]} allowFontScaling>
          {statusLabel(status)}
        </Text>
      </View>

      {needsFix && onFix && (
        <Pressable
          onPress={onFix}
          style={[styles.fixBtn, { backgroundColor: theme.primary }]}
          accessibilityRole="button"
          accessibilityLabel={`Fix ${label} permission`}
          hitSlop={8}
        >
          <Text style={styles.fixText} allowFontScaling>Fix</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 10,
    minHeight: 56,
  },
  emoji: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  label: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
  },
  fixBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
    justifyContent: 'center',
  },
  fixText: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
  },
});
