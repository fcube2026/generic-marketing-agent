import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
interface Props { length?: number; onComplete: (otp: string) => void; }
export const OtpInput: React.FC<Props> = ({ length = 6, onComplete }) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputs = useRef<(TextInput | null)[]>([]);
  const handleChange = (text: string, i: number) => {
    const newOtp = [...otp]; newOtp[i] = text; setOtp(newOtp);
    if (text && i < length - 1) inputs.current[i + 1]?.focus();
    if (newOtp.every((d) => d !== '')) onComplete(newOtp.join(''));
  };
  const handleKeyPress = (e: any, i: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
      {Array(length).fill(0).map((_, i) => (
        <TextInput key={i} ref={(r) => (inputs.current[i] = r)}
          style={[styles.input, otp[i] ? styles.filled : null]}
          maxLength={1} keyboardType="numeric"
          onChangeText={(t) => handleChange(t, i)} onKeyPress={(e) => handleKeyPress(e, i)} value={otp[i]} />
      ))}
    </View>
  );
};
const styles = StyleSheet.create({
  input: { width: 48, height: 56, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, textAlign: 'center', fontSize: 22, fontWeight: '700', color: Colors.text, backgroundColor: Colors.white },
  filled: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
});
