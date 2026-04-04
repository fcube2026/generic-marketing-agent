import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { OtpInput } from '../../components/common/OtpInput';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Otp'>;
  route: RouteProp<AuthStackParamList, 'Otp'>;
};

export const OtpScreen: React.FC<Props> = ({ navigation, route }) => {
  const { phone, role, devOtp } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const { setAuth } = useAuthStore();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const response = await authService.verifyOtp(phone, otp, role);
      await setAuth(response.token, response.user);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setCountdown(60);
    try {
      await authService.sendOtp(phone);
      Alert.alert('Sent', 'OTP has been resent successfully');
    } catch {
      Alert.alert('Error', 'Failed to resend OTP');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code sent to{'\n'}
        <Text style={styles.phone}>{phone}</Text>
      </Text>

      {devOtp && (
        <View style={styles.devBanner}>
          <Text style={styles.devText}>🔧 Dev OTP: {devOtp}</Text>
        </View>
      )}

      <View style={styles.otpContainer}>
        <OtpInput length={6} onComplete={setOtp} />
      </View>

      <Button
        title="Verify OTP"
        onPress={handleVerify}
        loading={loading}
        disabled={otp.length !== 6}
        style={styles.button}
      />

      <View style={styles.resendRow}>
        {countdown > 0 ? (
          <Text style={styles.countdownText}>Resend OTP in {countdown}s</Text>
        ) : (
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendText}>Resend OTP</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    padding: 24,
    paddingTop: 60,
  },
  back: { marginBottom: 32 },
  backText: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: Colors.textMuted, lineHeight: 22, marginBottom: 24 },
  phone: { fontWeight: '700', color: Colors.text },
  devBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  devText: { color: Colors.warning, fontWeight: '700', fontSize: 14 },
  otpContainer: { marginBottom: 32 },
  button: { marginBottom: 20 },
  resendRow: { alignItems: 'center' },
  countdownText: { color: Colors.textMuted, fontSize: 14 },
  resendText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
});
