import React from 'react';
import { TouchableOpacity, View, StyleSheet, Text } from 'react-native';
import { Colors } from '../../constants/colors';
interface Props { value: boolean; onToggle: () => void; label?: string; size?: 'sm' | 'lg'; }
export const Toggle: React.FC<Props> = ({ value, onToggle, label, size = 'sm' }) => (
  <View style={styles.row}>
    {label && <Text style={styles.label}>{label}</Text>}
    <TouchableOpacity
      style={[styles.toggle, size === 'lg' && styles.toggleLg, value && styles.toggleOn]}
      onPress={onToggle} activeOpacity={0.8}
    >
      <View style={[styles.thumb, size === 'lg' && styles.thumbLg, value && styles.thumbOn]} />
    </TouchableOpacity>
  </View>
);
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: Colors.border, justifyContent: 'center', paddingHorizontal: 2 },
  toggleLg: { width: 64, height: 36, borderRadius: 18 },
  toggleOn: { backgroundColor: Colors.primary },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  thumbLg: { width: 30, height: 30, borderRadius: 15 },
  thumbOn: { alignSelf: 'flex-end' },
});
