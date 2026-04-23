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
import { consentService } from '../../services/consentService';
import { PatientStackParamList } from '../../navigation/PatientNavigator';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'Consent'>;
  route: RouteProp<PatientStackParamList, 'Consent'>;
};

const CONSENT_VERSION = 'v1.2';

export const ConsentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;
  const [consentText, setConsentText] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(true);

  useEffect(() => {
    consentService
      .getConsentText(CONSENT_VERSION)
      .then((data: { text: string }) => setConsentText(data.text))
      .catch(() =>
        setConsentText(
          'By proceeding you agree to Curex24 Terms of Service and Privacy Policy.',
        ),
      )
      .finally(() => setLoadingText(false));
  }, []);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await consentService.acceptConsent({
        bookingId,
        consentVersion: CONSENT_VERSION,
      });
      navigation.navigate('VerificationStatus', { bookingId });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not record consent.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Informed Consent</Text>
      <Text style={styles.subtitle}>
        Please read the following carefully before accepting.
      </Text>

      <Card style={styles.textCard}>
        <ScrollView style={styles.textScroll}>
          {loadingText ? (
            <Text style={styles.consentText}>Loading…</Text>
          ) : (
            <Text style={styles.consentText}>{consentText}</Text>
          )}
        </ScrollView>
      </Card>

      <View style={styles.checkRow}>
        <Button
          title={accepted ? '✅  I have read and agree' : '☐  I have read and agree'}
          onPress={() => setAccepted(!accepted)}
          variant={accepted ? 'primary' : 'outline'}
        />
      </View>

      <Button
        title="Accept & Continue"
        onPress={handleAccept}
        loading={loading}
        disabled={!accepted}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 12 },
  textCard: { flex: 1, padding: 16, marginBottom: 16 },
  textScroll: { flex: 1 },
  consentText: { fontSize: 14, color: Colors.text, lineHeight: 22 },
  checkRow: { marginBottom: 12 },
});
