import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { clinicalIntakeService } from '../../services/clinicalIntakeService';
import { PatientStackParamList } from '../../navigation/PatientNavigator';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'ClinicalIntake'>;
  route: RouteProp<PatientStackParamList, 'ClinicalIntake'>;
};

const TRIAGE_BANNER_COLORS: Record<string, string> = {
  EMERGENCY: Colors.error,
  URGENT: Colors.warning,
  STANDARD: Colors.success,
};

export const ClinicalIntakeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;

  const [consultationReason, setConsultationReason] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [allergies, setAllergies] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [hasPets, setHasPets] = useState(false);
  const [petType, setPetType] = useState('');
  const [gateCode, setGateCode] = useState('');
  const [floorNumber, setFloorNumber] = useState('');
  const [patientAlone, setPatientAlone] = useState(false);
  const [mobilityConstraint, setMobilityConstraint] = useState(false);
  const [infectionRiskFlag, setInfectionRiskFlag] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ level: string; message: string } | null>(null);

  const handleSubmit = async () => {
    if (!consultationReason.trim()) {
      Alert.alert('Required', 'Please enter the consultation reason.');
      return;
    }
    if (!symptoms.trim()) {
      Alert.alert('Required', 'Please describe your symptoms.');
      return;
    }
    setLoading(true);
    try {
      const result = await clinicalIntakeService.submitIntake(bookingId, {
        consultationReason,
        symptoms,
        allergies: allergies || undefined,
        currentMedications: currentMedications || undefined,
        medicalHistory: medicalHistory || undefined,
        hasPets,
        petType: hasPets ? petType : undefined,
        gateCode: gateCode || undefined,
        floorNumber: floorNumber ? parseInt(floorNumber, 10) : undefined,
        patientAlone,
        mobilityConstraint,
        infectionRiskFlag,
        specialInstructions: specialInstructions || undefined,
      });

      if (result.bannerMessage) {
        setBanner({ level: result.triageLevel, message: result.bannerMessage });
      } else {
        navigation.navigate('Consent', { bookingId });
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not submit intake form.');
    } finally {
      setLoading(false);
    }
  };

  const handleBannerContinue = () => {
    setBanner(null);
    navigation.navigate('Consent', { bookingId });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Health Information</Text>
      <Text style={styles.subtitle}>
        This information helps your doctor prepare for the visit.
      </Text>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Consultation Details</Text>
        <Input
          label="Reason for consultation *"
          value={consultationReason}
          onChangeText={setConsultationReason}
          placeholder="e.g. High fever for 3 days"
          multiline
        />
        <Input
          label="Symptoms *"
          value={symptoms}
          onChangeText={setSymptoms}
          placeholder="Describe all symptoms in detail"
          multiline
        />
        <Input
          label="Known allergies"
          value={allergies}
          onChangeText={setAllergies}
          placeholder="e.g. Penicillin, Aspirin"
        />
        <Input
          label="Current medications"
          value={currentMedications}
          onChangeText={setCurrentMedications}
          placeholder="e.g. Paracetamol 500mg"
        />
        <Input
          label="Medical history"
          value={medicalHistory}
          onChangeText={setMedicalHistory}
          placeholder="e.g. Type 2 Diabetes, Hypertension"
          multiline
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Visit Safety Information</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Do you have pets?</Text>
          <Switch
            value={hasPets}
            onValueChange={setHasPets}
            trackColor={{ true: Colors.primary }}
          />
        </View>
        {hasPets && (
          <Input
            label="Pet type"
            value={petType}
            onChangeText={setPetType}
            placeholder="e.g. Dog, Cat"
          />
        )}

        <Input
          label="Gate / entry code (optional)"
          value={gateCode}
          onChangeText={setGateCode}
          placeholder="Apartment entry code"
        />
        <Input
          label="Floor number (optional)"
          value={floorNumber}
          onChangeText={setFloorNumber}
          placeholder="e.g. 3"
          keyboardType="numeric"
        />

        <View style={styles.row}>
          <Text style={styles.label}>Will you be alone during the visit?</Text>
          <Switch
            value={patientAlone}
            onValueChange={setPatientAlone}
            trackColor={{ true: Colors.warning }}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Mobility constraints?</Text>
          <Switch
            value={mobilityConstraint}
            onValueChange={setMobilityConstraint}
            trackColor={{ true: Colors.primary }}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Active infection risk? (COVID/TB/Hepatitis)</Text>
          <Switch
            value={infectionRiskFlag}
            onValueChange={setInfectionRiskFlag}
            trackColor={{ true: Colors.error }}
          />
        </View>

        <Input
          label="Special instructions for doctor (optional)"
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
          placeholder="e.g. Ring the bell twice"
          multiline
        />
      </Card>

      <Button title="Continue" onPress={handleSubmit} loading={loading} />

      {/* Triage Banner Modal */}
      <Modal visible={!!banner} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.bannerCard, { borderColor: TRIAGE_BANNER_COLORS[banner?.level ?? 'STANDARD'] }]}>
            <Text style={[styles.bannerTitle, { color: TRIAGE_BANNER_COLORS[banner?.level ?? 'STANDARD'] }]}>
              {banner?.level === 'EMERGENCY' ? '⚠️ Emergency Alert' : '⚠️ Urgent Notice'}
            </Text>
            <Text style={styles.bannerMessage}>{banner?.message}</Text>
            {banner?.level === 'EMERGENCY' && (
              <TouchableOpacity style={[styles.callBtn, { backgroundColor: Colors.error }]}>
                <Text style={styles.callBtnText}>📞 Call 108 Now</Text>
              </TouchableOpacity>
            )}
            <Button title="Continue with booking" onPress={handleBannerContinue} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 16 },
  section: { marginBottom: 16, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { flex: 1, fontSize: 14, color: Colors.text, marginRight: 8 },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', padding: 24 },
  bannerCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 24, borderWidth: 2 },
  bannerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  bannerMessage: { fontSize: 14, color: Colors.text, marginBottom: 16, lineHeight: 22 },
  callBtn: { borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12 },
  callBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
