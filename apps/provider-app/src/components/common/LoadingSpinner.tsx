import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
interface Props { message?: string; size?: 'small' | 'large'; fullScreen?: boolean; }
export const LoadingSpinner: React.FC<Props> = ({ message, size = 'large', fullScreen }) => (
  <View style={[styles.container, fullScreen && styles.fullScreen]}>
    <ActivityIndicator size={size} color={Colors.primary} />
    {message && <Text style={styles.msg}>{message}</Text>}
  </View>
);
const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  fullScreen: { flex: 1, backgroundColor: Colors.background },
  msg: { marginTop: 12, fontSize: 14, color: Colors.textMuted },
});
