import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { authService } from '../../services/authService';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };
export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleSendOtp = async () => {
    if (phone.length < 10) { setError('Enter valid 10-digit number'); return; }
    setError(''); setLoading(true);
    try {
      const full = phone.startsWith('+') ? phone : `+91${phone}`;
      const res = await authService.sendOtp(full);
      navigation.navigate('Otp', { phone: full, devOtp: res.otp });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally { setLoading(false); }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>⚕️</Text>
          <Text style={styles.title}>Curex24 Provider</Text>
          <Text style={styles.sub}>Healthcare Professional Portal</Text>
        </View>
        <View style={styles.form}>
          <Text style={styles.formTitle}>Provider Login</Text>
          <Input label="Mobile Number" placeholder="10-digit number" keyboardType="phone-pad"
            value={phone} onChangeText={(t) => { setPhone(t.replace(/\D/g, '').slice(0, 10)); setError(''); }}
            maxLength={10} error={error} />
          <Button title="Send OTP" onPress={handleSendOtp} loading={loading} disabled={phone.length < 10} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 56 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.primary, marginTop: 8 },
  sub: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  form: { backgroundColor: Colors.white, borderRadius: 16, padding: 24, elevation: 4 },
  formTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 20 },
});
