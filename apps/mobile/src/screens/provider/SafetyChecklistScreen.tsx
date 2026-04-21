import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { clinicalIntakeService } from '../../services/clinicalIntakeService';
import { ProviderStackParamList } from '../../navigation/ProviderNavigator';

type Props = {
  navigation: NativeStackNavigationProp<ProviderStackParamList, 'SafetyChecklist'>;
  route: RouteProp<ProviderStackParamList, 'SafetyChecklist'>;
};

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

const INITIAL_CHECKLIST: ChecklistItem[] = [
  { id: '1', label: 'I have confirmed the patient\'s identity visually', checked: false },
  { id: '2', label: 'I have verified the address matches', checked: false },
  { id: '3', label: 'I have checked the safety alerts above', checked: false },
  { id: '4', label: 'I am ready to enter the patient-provided OTP', checked: false },
];

type AlertBanner = {
  type: 'RED' | 'AMBER' | 'INFO';
  icon: string;
  message: string;
};

export const SafetyChecklistScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;
  const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);
  const [banners, setBanners] = useState<AlertBanner[]>([]);
  const [loadingIntake, setLoadingIntake] = useState(true);

  useEffect(() => {
    clinicalIntakeService
      .getIntake(bookingId)
      .then((intake: any) => {
        const alerts: AlertBanner[] = [];
        if (intake.patientAlone)
          alerts.push({ type: 'AMBER', icon: '⚠️', message: 'Patient will be alone during visit. Check in via app on arrival.' });
        if (intake.infectionRiskFlag)
          alerts.push({ type: 'RED', icon: '🦠', message: 'Patient has reported an active infection risk. Use full PPE.' });
        if (intake.hasPets)
          alerts.push({ type: 'INFO', icon: '🐾', message: `Patient has a pet (${intake.petType ?? 'unknown'}). Confirm it will be secured.` });
        if (intake.mobilityConstraint)
          alerts.push({ type: 'INFO', icon: '♿', message: 'Patient has mobility constraints. Bring assistance equipment.' });
        setBanners(alerts);
      })
      .catch(() => {/* no intake yet is fine */})
      .finally(() => setLoadingIntake(false));
  }, [bookingId]);

  const toggleItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
    );
  };

  const allChecked = checklist.every((item) => item.checked);

  const handleProceed = () => {
    if (!allChecked) {
      Alert.alert('Checklist Incomplete', 'Please check all items before proceeding.');
      return;
    }
    navigation.navigate('VisitOtp', { bookingId });
  };

  const bannerBg = (type: AlertBanner['type']) => {
    switch (type) {
      case 'RED': return '#FEF2F2';
      case 'AMBER': return '#FFFBEB';
      default: return '#EFF6FF';
    }
  };

  const bannerBorder = (type: AlertBanner['type']) => {
    switch (type) {
      case 'RED': return Colors.error;
      case 'AMBER': return Colors.warning;
      default: return Colors.secondary;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Pre-Visit Safety Check</Text>

      {banners.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Safety Alerts</Text>
          {banners.map((banner, i) => (
            <View
              key={i}
              style={[styles.banner, { backgroundColor: bannerBg(banner.type), borderColor: bannerBorder(banner.type) }]}
            >
              <Text style={styles.bannerText}>{banner.icon}  {banner.message}</Text>
            </View>
          ))}
        </View>
      )}

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Pre-Visit Checklist</Text>
        {checklist.map((item) => (
          <View key={item.id} style={styles.checkRow}>
            <Text
              style={[styles.checkbox, item.checked && styles.checkboxChecked]}
              onPress={() => toggleItem(item.id)}
            >
              {item.checked ? '✅' : '☐'}
            </Text>
            <Text style={styles.checkLabel} onPress={() => toggleItem(item.id)}>
              {item.label}
            </Text>
          </View>
        ))}
      </Card>

      <Button
        title="Send OTP to Patient →"
        onPress={handleProceed}
        disabled={!allChecked}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  section: { marginBottom: 16, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 10 },
  banner: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
  bannerText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  checkbox: { fontSize: 22, marginRight: 10, lineHeight: 28 },
  checkboxChecked: { color: Colors.success },
  checkLabel: { flex: 1, fontSize: 14, color: Colors.text, lineHeight: 22, paddingTop: 2 },
});
