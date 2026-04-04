import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Splash'> };
export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  useEffect(() => { const t = setTimeout(() => navigation.replace('Login'), 2000); return () => clearTimeout(t); }, []);
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>⚕️</Text>
      <Text style={styles.title}>Curex24</Text>
      <Text style={styles.tagline}>Provider App</Text>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 72, marginBottom: 16 },
  title: { fontSize: 42, fontWeight: '800', color: Colors.white },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
});
