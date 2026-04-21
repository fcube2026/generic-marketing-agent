import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { verificationService, SelfServeStatus } from '../../services/verificationService';
import { PatientStackParamList } from '../../navigation/PatientNavigator';

type Nav = NativeStackNavigationProp<PatientStackParamList>;

/**
 * Compact banner shown at the top of patient screens whenever KYC is not
 * complete. Tapping it routes the patient into the wizard hub.
 */
export const VerificationBanner: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { data } = useQuery<SelfServeStatus>({
    queryKey: ['patient-kyc-status'],
    queryFn: verificationService.getMyVerificationStatus,
    staleTime: 30_000,
  });

  if (!data) return null;
  const status = data.status;

  if (status === 'CONFIRMED' || status === 'EMERGENCY_OVERRIDE') return null;

  const isUnderReview =
    status === 'ID_UNDER_REVIEW' || status === 'FLAGGED';
  const label = isUnderReview
    ? 'Verification under review'
    : 'Verification pending — complete KYC to start booking';

  return (
    <TouchableOpacity
      style={[styles.banner, isUnderReview ? styles.review : styles.pending]}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('PatientKyc')}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.icon}>{isUnderReview ? '🔍' : '⚠️'}</Text>
      <View style={styles.textCol}>
        <Text style={styles.title}>{label}</Text>
        {!isUnderReview && (
          <Text style={styles.sub}>Tap to complete identity verification</Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pending: { backgroundColor: '#FEF3C7' },
  review: { backgroundColor: '#DBEAFE' },
  icon: { fontSize: 22 },
  textCol: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 22, color: Colors.textMuted, fontWeight: '700' },
});
