import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { ProviderWithDistance } from '../../types';
import { formatCurrency, formatDistance } from '../../utils/format';
import { Card } from '../common/Card';

interface ProviderCardProps {
  provider: ProviderWithDistance;
  onSelect: (provider: ProviderWithDistance) => void;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({ provider, onSelect }) => (
  <TouchableOpacity 
    onPress={() => !provider.isOccupied && onSelect(provider)} 
    activeOpacity={provider.isOccupied ? 1 : 0.9}
    disabled={provider.isOccupied}
  >
    <Card style={[styles.card, provider.isOccupied && styles.cardOccupied]}>
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
            {provider.isOccupied && (
              <View style={[styles.badge, styles.badgeOccupied]}>
                <Text style={styles.badgeTextOccupied}>Currently occupied in another booking</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.footer}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{formatDistance(provider.distance)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>ETA</Text>
          <Text style={styles.statValue}>{Math.round(provider.distance * 3)} min</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Fee (Home)</Text>
          <Text style={[styles.statValue, styles.fee]}>
            {formatCurrency(provider.consultationFeeHomeVisit)}
          </Text>
        </View>
      </View>
    </Card>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
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
  badges: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgePrimary: { backgroundColor: Colors.primaryLight },
  badgeSecondary: { backgroundColor: '#DBEAFE' },
  badgeVideo: { backgroundColor: '#F0F9FF' },
  badgeOccupied: { backgroundColor: Colors.error + '1A' }, // 10% opacity error red
  badgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  badgeTextOccupied: { fontSize: 11, fontWeight: '600', color: Colors.error },
  cardOccupied: { opacity: 0.7 },
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
