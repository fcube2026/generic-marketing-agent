import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  title: string; onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean; disabled?: boolean; style?: ViewStyle; fullWidth?: boolean;
}

export const Button: React.FC<Props> = ({ title, onPress, variant = 'primary', loading, disabled, style, fullWidth = true }) => (
  <TouchableOpacity
    style={[styles.btn, styles[variant], fullWidth && { width: '100%' }, (disabled || loading) && { opacity: 0.6 }, style]}
    onPress={onPress} disabled={disabled || loading} activeOpacity={0.8}
  >
    {loading
      ? <ActivityIndicator color={variant === 'outline' ? Colors.primary : Colors.white} />
      : <Text style={[styles.text, styles[`${variant}Text`]]}>{title}</Text>}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.secondary },
  outline: { borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.error },
  text: { fontSize: 16, fontWeight: '600' },
  primaryText: { color: Colors.white },
  secondaryText: { color: Colors.white },
  outlineText: { color: Colors.primary },
  dangerText: { color: Colors.white },
} as any);
