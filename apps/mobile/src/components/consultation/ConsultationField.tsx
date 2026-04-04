import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
interface Props { label: string; value: string; onChangeText: (t: string) => void; multiline?: boolean; placeholder?: string; }
export const ConsultationField: React.FC<Props> = ({ label, value, onChangeText, multiline, placeholder }) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.multiline]}
      value={value} onChangeText={onChangeText}
      multiline={multiline} numberOfLines={multiline ? 4 : 1}
      placeholder={placeholder} placeholderTextColor={Colors.textMuted}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  </View>
);
const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, backgroundColor: Colors.white },
  multiline: { height: 100 },
});
