import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import api from '../../services/api';
import { PatientStackParamList } from '../../navigation/PatientNavigator';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'ConsultationSummary'>;
  route: RouteProp<PatientStackParamList, 'ConsultationSummary'>;
};

export const ConsultationSummaryScreen: React.FC<Props> = ({ route }) => {
  const { bookingId } = route.params;

  const { data: summary, isLoading } = useQuery({
    queryKey: ['consultation-summary', bookingId],
    queryFn: async () => {
      const res = await api.get(`/consultation/${bookingId}/summary`);
      return res.data;
    },
  });

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
});
