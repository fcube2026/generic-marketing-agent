import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import api from '../../services/api';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { formatCurrency } from '../../utils/format';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'Payment'>;
  route: RouteProp<PatientStackParamList, 'Payment'>;
};

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', icon: '📲' },
  { id: 'card', label: 'Card', icon: '💳' },
  { id: 'netbanking', label: 'Net Banking', icon: '🏦' },
  { id: 'cash', label: 'Cash on Visit', icon: '💵' },
];

export const PaymentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId, amount } = route.params;
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const payment = await api.post('/payments', { bookingId, amount });
      await api.put(`/payments/${payment.data.id}/status`, {
        status: 'PAID',
        transactionId: `TXN_${Date.now()}`,
      });
      setPaid(true);
    } catch (err: any) {
      Alert.alert('Payment Failed', err?.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (paid) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successSubtitle}>Your booking is confirmed. Track your provider below.</Text>
        <Button
          title="Track Provider"
          onPress={() => navigation.replace('Tracking', { bookingId })}
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.amountCard}>
        <Text style={styles.amountLabel}>Total Amount</Text>
        <Text style={styles.amount}>{formatCurrency(amount)}</Text>
        <Text style={styles.amountNote}>Includes consultation fee + service charges</Text>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        {PAYMENT_METHODS.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodItem,
              selectedMethod === method.id && styles.methodItemSelected,
            ]}
            onPress={() => setSelectedMethod(method.id)}
          >
            <Text style={styles.methodIcon}>{method.icon}</Text>
            <Text style={styles.methodLabel}>{method.label}</Text>
            {selectedMethod === method.id && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Button title={`Pay ${formatCurrency(amount)}`} onPress={handlePay} loading={loading} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  amountCard: { margin: 16, alignItems: 'center' },
  amountLabel: { fontSize: 14, color: Colors.textMuted, marginBottom: 8 },
  amount: { fontSize: 36, fontWeight: '800', color: Colors.primary },
  amountNote: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 12,
  },
  methodItemSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  methodIcon: { fontSize: 24 },
  methodLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },
  checkmark: { fontSize: 18, color: Colors.primary, fontWeight: '700' },
  footer: { padding: 16 },
  successContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIcon: { fontSize: 72, marginBottom: 16 },
  successTitle: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  successSubtitle: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
