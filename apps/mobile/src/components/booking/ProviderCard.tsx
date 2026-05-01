import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { BookingMode, ProviderWithDistance } from '../../types';
import { formatCurrency, formatDistance } from '../../utils/format';
import { Card } from '../common/Card';

/** Default fee shown when the provider has not set a video consultation fee. */
const DEFAULT_VIDEO_FEE = 500;

interface ProviderCardProps {
  provider: ProviderWithDistance;
  onSelect: (provider: ProviderWithDistance) => void;
  /** Pre-selected booking mode — affects which fee is shown in the card footer. */
  mode?: BookingMode;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({ provider, onSelect, mode }) => {
  const isVideoMode = mode === 'VIDEO_CONSULTATION';

  const feeLabel = isVideoMode ? 'Fee (Video)' : 'Fee (Home)';
  const feeValue = isVideoMode
    ? provider.consultationFeeVideoConsultation || DEFAULT_VIDEO_FEE
    : provider.consultationFeeHomeVisit;

  return (
    <TouchableOpacity
      onPress={() => !provider.isOccupied && onSelect(provider)}
      activeOpacity={provider.isOccupied ? 1 : 0.9}
      disabled={provider.isOccupied}
    >
      <Card style={[styles.card, provider.isOccupied && styles.cardOccupied]}>
        {/* Currently Occupied banner — displayed at the very top of the card */}
        {provider.isOccupied && (
          <View style={styles.occupiedBanner}>
            <Text style={styles.occupiedBannerText}>🔴 Currently Occupied</Text>
          </View>
        )}

        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{provider.name.charAt(0)}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{provider.name}</Text>
            <Text style={styles.specialization}>{provider.specialization}</Text>
            <View style={styles.badges}>
              {provider.homeVisitEnabled && (
                <View style={[styles.badge, styles.badgePrimary]}>
                  <Text style={styles.badgeText}>Home Visit</Text>
                </View>
              )}
              {provider.doctorPlaceVisitEnabled && (
                <View style={[styles.badge, styles.badgeSecondary]}>
                  <Text style={styles.badgeText}>Clinic</Text>
                </View>
              )}
              <View style={[styles.badge, styles.badgeVideo]}>
                <Text style={styles.badgeText}>Video</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.footer}>
          {!isVideoMode && (
            <>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>{formatDistance(provider.distance)}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>ETA</Text>
                <Text style={styles.statValue}>{Math.round(provider.distance * 3)} min</Text>
              </View>
            </>
          )}
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{feeLabel}</Text>
            <Text style={[styles.statValue, styles.fee]}>
              {formatCurrency(feeValue)}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  cardOccupied: { opacity: 0.7 },
  occupiedBanner: {
    backgroundColor: Colors.error + '1A',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    alignItems: 'center',
  },
  occupiedBannerText: { fontSize: 13, fontWeight: '700', color: Colors.error },
  header: { flexDirection: 'row', marginBottom: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  specialization: { fontSize: 13, color: Colors.textMuted, marginBottom: 6 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgePrimary: { backgroundColor: Colors.primaryLight },
  badgeSecondary: { backgroundColor: '#DBEAFE' },
  badgeVideo: { backgroundColor: '#F0F9FF' },
  badgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  fee: { color: Colors.primary },
});
