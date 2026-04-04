import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle, TextInputProps } from 'react-native';
import { Colors } from '../../constants/colors';
interface Props extends TextInputProps { label?: string; error?: string; containerStyle?: ViewStyle; }
export const Input: React.FC<Props> = ({ label, error, containerStyle, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: 16 }, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, focused && { borderColor: Colors.primary }, error && { borderColor: Colors.error }]}
        placeholderTextColor={Colors.textMuted}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} {...props}
      />
      {error && <Text style={{ color: Colors.error, fontSize: 12, marginTop: 4 }}>{error}</Text>}
    </View>
  );
};
const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.text, backgroundColor: Colors.white },
});
