import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { authService } from '../../services/authService';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
  route: RouteProp<AuthStackParamList, 'Login'>;
};

export const LoginScreen: React.FC<Props> = ({ navigation, route }) => {
  const { role } = route.params;
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roleLabel = role === 'PROVIDER' ? 'Doctor' : 'Patient';

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const response = await authService.sendOtp(fullPhone);
      navigation.navigate('Otp', { phone: fullPhone, role, devOtp: response.otp });
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err?.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>⚕️</Text>
          <Text style={styles.title}>Curex24</Text>
          <Text style={styles.tagline}>Healthcare, anytime. Anywhere.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Welcome, {roleLabel}</Text>
          <Text style={styles.formSubtitle}>
            Enter your mobile number to continue
          </Text>

          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
            </View>
            <Input
              containerStyle={styles.phoneInput}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(t) => {
                setPhone(t.replace(/\D/g, '').slice(0, 10));
                setError('');
              }}
              maxLength={10}
              error={error}
            />
          </View>

          <Button
            title="Send OTP"
            onPress={handleSendOtp}
            loading={loading}
            disabled={phone.length < 10}
          />

          <Text style={styles.disclaimer}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 56 },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 8,
  },
  tagline: { fontSize: 15, color: Colors.textMuted, marginTop: 4 },
  form: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 24 },
  phoneRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  countryCode: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: Colors.white,
  },
  countryCodeText: { fontSize: 15, color: Colors.text },
  phoneInput: { flex: 1, marginBottom: 0 },
  disclaimer: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 16,
    lineHeight: 18,
  },
});
