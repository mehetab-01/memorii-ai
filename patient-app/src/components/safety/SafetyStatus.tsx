import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import SectionHeader from '../ui/SectionHeader';
import { spacing, borderRadius } from '../../theme/spacing';

interface SafetyStatusProps {
  location: any;
  homeLocation: any;
  isTracking: boolean;
  isMoving: boolean;
  distanceFromHome: number;
  geofenceRadius: number;
  locationAddress: string;
}

export default function SafetyStatus({ location, homeLocation, isTracking, isMoving, distanceFromHome, geofenceRadius, locationAddress }: SafetyStatusProps) {
  const { theme } = useTheme();
  const isOutside = homeLocation && distanceFromHome > geofenceRadius;

  return (
    <View style={styles.container}>
      <SectionHeader
        icon="navigate-circle"
        title="GPS Location"
        subtitle={isTracking ? (isMoving ? 'Updating (Moving)' : 'Monitoring location') : 'Location monitoring'}
        iconColor={theme.primary}
      />
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: isTracking ? theme.success : theme.textMuted }]}>
          <Ionicons name={isTracking ? 'radio-button-on' : 'radio-button-off'} size={14} color="#FFFFFF" />
          <Text style={styles.statusText}>{isTracking ? 'TRACKING ACTIVE' : 'TRACKING INACTIVE'}</Text>
        </View>

        {location ? (
          <View style={styles.infoContainer}>
            {/* Location Address */}
            <InfoRow icon="navigate-outline" label="Current Location" value={locationAddress} color={theme.primary} theme={theme} />
            {/* Coordinates */}
            <InfoRow icon="locate-outline" label="Coordinates" value={`${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`} color={theme.textSecondary} theme={theme} />
            {/* Distance */}
            {homeLocation && (
              <InfoRow icon="home-outline" label="Distance from Home" value={`${Math.round(distanceFromHome)}m`} color={isOutside ? theme.danger : theme.success} theme={theme} />
            )}
            {/* Movement */}
            <InfoRow icon={isMoving ? 'walk' : 'hand-right-outline'} label="Status" value={isMoving ? 'Moving' : 'Stationary'} color={theme.textSecondary} theme={theme} />
            {/* Safe Zone */}
            <InfoRow icon="shield-checkmark-outline" label="Safe Zone" value={`${geofenceRadius}m radius`} color={theme.primary} theme={theme} />
          </View>
        ) : (
          <View style={styles.loading}>
            <Ionicons name="location-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Fetching location...</Text>
          </View>
        )}

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
          <Ionicons name="information-circle" size={18} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.textPrimary }]}>
            ✓ Background tracking active{'\n'}✓ Caretaker notified if outside safe zone{'\n'}✓ Radius managed by caretaker
          </Text>
        </View>
      </View>
    </View>
  );
}

function InfoRow({ icon, label, value, color, theme }: { icon: string; label: string; value: string; color: string; theme: any }) {
  return (
    <View style={infoStyles.row}>
      <Ionicons name={icon as any} size={20} color={color} />
      <View style={infoStyles.textContainer}>
        <Text style={[infoStyles.label, { color: theme.textSecondary }]}>{label}</Text>
        <Text style={[infoStyles.value, { color: theme.textPrimary }]}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  textContainer: { flex: 1 },
  label: { fontSize: 12, fontWeight: '500' },
  value: { fontSize: 15, fontWeight: '600', marginTop: 1 },
});

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  card: { marginHorizontal: spacing.base, padding: spacing.base, borderRadius: borderRadius.lg, borderWidth: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, gap: 6, marginBottom: spacing.md },
  statusText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  infoContainer: { marginBottom: spacing.md },
  loading: { alignItems: 'center', padding: spacing.xl, gap: 8 },
  loadingText: { fontSize: 14 },
  infoBox: { padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, flexDirection: 'row', gap: 8 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
