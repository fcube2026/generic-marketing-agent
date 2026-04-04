import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { OtpInput } from '../../components/common/OtpInput';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Otp'>; route: RouteProp<AuthStackParamList, 'Otp'>; };
export const OtpScreen: React.FC<Props> = ({ navigation, route }) => {
  const { phone, devOtp } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const { setAuth } = useAuthStore();
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);
  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const res = await authService.verifyOtp(phone, otp);
      await setAuth(res.token, res.user);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Invalid OTP');
    } finally { setLoading(false); }
  };
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.sub}>Code sent to {phone}</Text>
      {devOtp && <View style={styles.devBanner}><Text style={styles.devText}>🔧 Dev OTP: {devOtp}</Text></View>}
      <View style={{ marginBottom: 32 }}><OtpInput length={6} onComplete={setOtp} /></View>
      <Button title="Verify OTP" onPress={handleVerify} loading={loading} disabled={otp.length !== 6} style={{ marginBottom: 20 }} />
      <View style={{ alignItems: 'center' }}>
        {countdown > 0
          ? <Text style={{ color: Colors.textMuted }}>Resend in {countdown}s</Text>
          : <TouchableOpacity onPress={() => { setCountdown(60); authService.sendOtp(phone); }}><Text style={{ color: Colors.primary, fontWeight: '700' }}>Resend OTP</Text></TouchableOpacity>}
      </View>
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: Colors.background, padding: 24, paddingTop: 60 },
  back: { fontSize: 16, color: Colors.primary, fontWeight: '600', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  sub: { fontSize: 15, color: Colors.textMuted, marginBottom: 24 },
  devBanner: { backgroundColor: '#FEF3C7', borderRadius: 8, padding: 12, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: Colors.warning },
  devText: { color: Colors.warning, fontWeight: '700' },
});
