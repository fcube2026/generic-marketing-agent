import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { OtpInput } from '../../components/common/OtpInput';
import { visitOtpService } from '../../services/visitOtpService';
import { ProviderStackParamList } from '../../navigation/ProviderNavigator';

type Props = {
  navigation: NativeStackNavigationProp<ProviderStackParamList, 'VisitOtp'>;
  route: RouteProp<ProviderStackParamList, 'VisitOtp'>;
};

const OTP_TTL_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 2 * 60;
const MAX_ATTEMPTS = 3;

export const VisitOtpScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(OTP_TTL_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [otpComplete, setOtpComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0 && timerRef.current) clearInterval(timerRef.current);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [expiresAt]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSendOtp = async () => {
    setSending(true);
    try {
      const result = await visitOtpService.sendOtp(bookingId);
      setExpiresAt(new Date(result.otpExpiresAt));
      setTimeLeft(OTP_TTL_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setOtpSent(true);

      // Countdown resend cooldown
      const cooldownTimer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(cooldownTimer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not send OTP.');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length < 6) {
      Alert.alert('Enter OTP', 'Please enter the 6-digit OTP from the patient.');
      return;
    }
    if (attempts >= MAX_ATTEMPTS) {
      Alert.alert('Locked', 'Maximum attempts reached. Please contact dispatch.');
      return;
    }
    setVerifying(true);
    try {
      const result = await visitOtpService.verifyOtp(bookingId, otp);
      navigation.navigate('ConsultationForm', { bookingId });
    } catch (e: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      const msg = e?.response?.data?.message ?? 'Invalid OTP.';
      if (newAttempts >= MAX_ATTEMPTS) {
        Alert.alert(
          'Too Many Attempts',
          'Please contact dispatch for assistance.',
          [{ text: 'Call Dispatch', onPress: () => Linking.openURL('tel:+918001234567') }, { text: 'OK' }],
        );
      } else {
        Alert.alert('Invalid OTP', msg);
      }
      setOtp('');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Visit Start Verification</Text>
      <Text style={styles.subtitle}>
        {otpSent
          ? 'An OTP has been sent to the patient\'s registered mobile number.\nAsk the patient for the OTP.'
          : 'Send an OTP to the patient to verify visit start.'}
      </Text>

      {!otpSent ? (
        <Button title="Send OTP to Patient" onPress={handleSendOtp} loading={sending} />
      ) : (
        <View style={styles.otpSection}>
          <Text style={styles.label}>Enter patient OTP:</Text>
          <OtpInput
            length={6}
            onComplete={(val) => { setOtp(val); setOtpComplete(true); }}
          />

          {timeLeft > 0 ? (
            <Text style={styles.timer}>⏱ Expires in {formatTime(timeLeft)}</Text>
          ) : (
            <Text style={[styles.timer, { color: Colors.error }]}>OTP expired</Text>
          )}

          <Button
            title="Verify & Start Visit"
            onPress={handleVerify}
            loading={verifying}
            disabled={!otpComplete || timeLeft === 0 || attempts >= MAX_ATTEMPTS}
          />

          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive OTP? </Text>
            {resendCooldown > 0 ? (
              <Text style={styles.resendCooldown}>Resend in {formatTime(resendCooldown)}</Text>
            ) : (
              <TouchableOpacity onPress={handleSendOtp} disabled={sending}>
                <Text style={styles.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
            )}
          </View>

          {attempts >= MAX_ATTEMPTS && (
      <button
                onClick={() => Linking.openURL('tel:+918001234567')}
                style={styles.dispatchBtn}
              >
                <Text style={styles.dispatchBtnText}>📞 Contact Dispatch</Text>
              </button>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 24, lineHeight: 22 },
  otpSection: { gap: 16 },
  label: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  timer: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  resendLabel: { fontSize: 14, color: Colors.textMuted },
  resendCooldown: { fontSize: 14, color: Colors.textMuted },
  resendLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  dispatchBtn: { backgroundColor: Colors.error, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  dispatchBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
