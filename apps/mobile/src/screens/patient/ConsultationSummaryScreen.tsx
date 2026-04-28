import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import api from '../../services/api';
import { PatientStackParamList } from '../../navigation/PatientNavigator';

/** Fallback prescription image used when medicinesAdvised exist but no explicit URL */
const MOCK_PRESCRIPTION_URL =
  'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=400&q=80';

/** Cooldown (ms) to prevent double-tap on the CTA button */
const CTA_COOLDOWN_MS = 1000;

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'ConsultationSummary'>;
  route: RouteProp<PatientStackParamList, 'ConsultationSummary'>;
};

export const ConsultationSummaryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;
  const [ctaDisabled, setCtaDisabled] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['consultation-summary', bookingId],
    queryFn: async () => {
      const res = await api.get(`/consultation/${bookingId}/summary`);
      return res.data;
    },
  });

  // Derive mock prescription / order flags from the summary response
  const prescriptionUrl: string | undefined =
    summary?.prescriptionUrl ??
    summary?.prescriptions?.[0]?.fileUrl ??
    (summary?.medicinesAdvised?.length ? MOCK_PRESCRIPTION_URL : undefined);
  const hasOrder: boolean = summary?.hasOrder === true;
  const orderId: string | undefined = summary?.orderId ?? undefined;
  const medicineCount: number = summary?.medicinesAdvised?.length ?? 0;

  const handleOrderPress = () => {
    setCtaDisabled(true);
    setTimeout(() => setCtaDisabled(false), CTA_COOLDOWN_MS);

    if (hasOrder && orderId) {
      navigation.navigate('OrderTracking', { orderId });
    } else if (hasOrder) {
      // Fallback if orderId not yet available
      navigation.navigate('PharmacyOrders');
    } else {
      navigation.navigate('PrescriptionOrder', {
        bookingId,
        prescriptionUrl,
      });
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen message="Loading summary..." />;

  if (!summary) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No Summary Yet</Text>
        <Text style={styles.emptySubtitle}>The doctor hasn't submitted the consultation summary yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Consultation Summary</Text>

        {summary.diagnosis && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Diagnosis</Text>
            <Text style={styles.sectionValue}>{summary.diagnosis}</Text>
          </View>
        )}

        {summary.symptoms && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Symptoms</Text>
            <Text style={styles.sectionValue}>{summary.symptoms}</Text>
          </View>
        )}

        {summary.observations && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Observations</Text>
            <Text style={styles.sectionValue}>{summary.observations}</Text>
          </View>
        )}

        {summary.medicinesAdvised && summary.medicinesAdvised.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Medicines Prescribed</Text>
            {summary.medicinesAdvised.map((med: any, i: number) => (
              <View key={i} style={styles.medicineItem}>
                <Text style={styles.medicineName}>💊 {med.name}</Text>
                <Text style={styles.medicineDose}>
                  {med.dosage} — {med.frequency} for {med.duration}
                </Text>
                {med.notes && <Text style={styles.medicineNotes}>{med.notes}</Text>}
              </View>
            ))}
          </View>
        )}

        {summary.nextSteps && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Next Steps</Text>
            <Text style={styles.sectionValue}>{summary.nextSteps}</Text>
          </View>
        )}

        {summary.followUpRecommendation && (
          <View style={styles.followUp}>
            <Text style={styles.followUpText}>📅 Follow-up: {summary.followUpRecommendation}</Text>
          </View>
        )}
      </Card>

      {/* Order Medicines / View Order CTA – visible only when a prescription exists */}
      {prescriptionUrl && (
        <TouchableOpacity
          style={[styles.orderButton, hasOrder && styles.orderButtonSecondary]}
          onPress={handleOrderPress}
          disabled={ctaDisabled}
          activeOpacity={0.8}
        >
          <View style={styles.orderButtonContent}>
            <Text style={styles.orderButtonIcon}>{hasOrder ? '📦' : '💊'}</Text>
            <View style={styles.orderButtonTextWrap}>
              <Text style={styles.orderButtonTitle}>
                {hasOrder ? 'View Order' : 'Order Medicines'}
              </Text>
              <Text style={styles.orderButtonSubtitle}>
                {hasOrder
                  ? 'Track your medicine delivery'
                  : 'Get your prescribed medicines delivered'}
              </Text>
            </View>
            {!hasOrder && medicineCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{medicineCount}</Text>
              </View>
            )}
            <Text style={styles.orderButtonArrow}>→</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { margin: 16 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 20 },
  section: { marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sectionLabel: { fontSize: 12, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontWeight: '600' },
  sectionValue: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  medicineItem: { backgroundColor: Colors.background, borderRadius: 8, padding: 12, marginBottom: 8 },
  medicineName: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  medicineDose: { fontSize: 13, color: Colors.textMuted },
  medicineNotes: { fontSize: 12, color: Colors.primary, marginTop: 4 },
  followUp: { backgroundColor: Colors.primaryLight, borderRadius: 8, padding: 12, marginTop: 4 },
  followUpText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  orderButtonSecondary: {
    backgroundColor: Colors.secondary,
  },
  orderButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderButtonIcon: { fontSize: 28, marginRight: 12 },
  orderButtonTextWrap: { flex: 1 },
  orderButtonTitle: { fontSize: 16, fontWeight: '700', color: Colors.white },
  orderButtonSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  orderButtonArrow: { fontSize: 20, color: Colors.white, marginLeft: 8 },
  badge: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
});
