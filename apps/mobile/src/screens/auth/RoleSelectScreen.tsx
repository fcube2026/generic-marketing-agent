import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { Role } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'RoleSelect'>;
};

export const RoleSelectScreen: React.FC<Props> = ({ navigation }) => {
  const handleSelect = (role: Role) => {
    navigation.navigate('Login', { role });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>⚕️</Text>
        <Text style={styles.title}>Curex24</Text>
        <Text style={styles.subtitle}>Who are you?</Text>
        <Text style={styles.description}>
          Let us know your role so we can tailor{'\n'}the experience just for you.
        </Text>
      </View>

      <View style={styles.cardsContainer}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleSelect('PATIENT')}
          activeOpacity={0.85}
        >
          <Text style={styles.cardIcon}>🩺</Text>
          <Text style={styles.cardTitle}>I'm a Patient</Text>
          <Text style={styles.cardDescription}>
            Find nearby doctors, book home visits or clinic appointments, and track your care in real time.
          </Text>
          <View style={styles.cardButton}>
            <Text style={styles.cardButtonText}>Continue as Patient →</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.cardProvider]}
          onPress={() => handleSelect('PROVIDER')}
          activeOpacity={0.85}
        >
          <Text style={styles.cardIcon}>👨‍⚕️</Text>
          <Text style={styles.cardTitle}>I'm a Doctor</Text>
          <Text style={styles.cardDescription}>
            Manage your availability, accept bookings, conduct consultations, and track your earnings.
          </Text>
          <View style={[styles.cardButton, styles.cardButtonProvider]}>
            <Text style={[styles.cardButtonText, styles.cardButtonTextProvider]}>
              Continue as Doctor →
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        Your role cannot be changed after registration.
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
  },
  logo: { fontSize: 52 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 24,
  },
  description: {
    fontSize: 15,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cardProvider: {
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
  },
  cardIcon: { fontSize: 40, marginBottom: 12 },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: 20,
  },
  cardButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cardButtonProvider: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  cardButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  cardButtonTextProvider: {
    color: Colors.primary,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 24,
    marginBottom: 16,
  },
});
