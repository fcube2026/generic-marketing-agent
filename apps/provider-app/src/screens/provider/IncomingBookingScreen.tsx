import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, RefreshControl, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { bookingService } from '../../services/bookingService';
import type { ProviderStackParamList } from '../../navigation/ProviderNavigator';
import type { Booking } from '../../types';

type Nav = NativeStackNavigationProp<ProviderStackParamList>;

export const IncomingBookingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [requests, setRequests] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const data = await bookingService.getIncomingRequests();
      setRequests(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  const handleAccept = async (id: string) => {
    try {
      await bookingService.acceptBooking(id);
      setRequests(prev => prev.filter(r => r.id !== id));
      navigation.navigate('BookingDetail', { bookingId: id });
    } catch {
      Alert.alert('Error', 'Failed to accept booking.');
    }
  };

  const handleDecline = async (id: string) => {
    Alert.alert('Decline Booking', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive', onPress: async () => {
          try {
            await bookingService.declineBooking(id);
            setRequests(prev => prev.filter(r => r.id !== id));
          } catch {
            Alert.alert('Error', 'Failed to decline booking.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Booking }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.patientName}>{item.patient?.name || 'Patient'}</Text>
        <View style={[styles.modeBadge, item.mode === 'HOME_VISIT' ? styles.homeVisit : styles.clinicVisit]}>
          <Text style={styles.modeText}>
            {item.mode === 'HOME_VISIT' ? '🏠 Home Visit' : '🏥 Clinic Visit'}
          </Text>
        </View>
      </View>
      <Text style={styles.serviceType}>{item.serviceCategory?.name || 'Consultation'}</Text>
      <Text style={styles.symptoms} numberOfLines={2}>{item.symptoms || 'No symptoms shared'}</Text>
      <View style={styles.meta}>
        <Text style={styles.metaText}>🕒 {new Date(item.scheduledAt).toLocaleString('en-IN')}</Text>
        <Text style={styles.metaText}>💰 ₹{item.totalFee}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(item.id)}>
          <Text style={styles.declineBtnText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
          <Text style={styles.acceptBtnText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={requests}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Incoming Requests</Text>
            <Text style={styles.emptyNote}>Toggle availability on the Home screen to receive bookings.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  patientName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  modeBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  homeVisit: { backgroundColor: Colors.primaryLight },
  clinicVisit: { backgroundColor: '#DBEAFE' },
  modeText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  serviceType: { fontSize: 13, color: Colors.secondary, fontWeight: '600', marginBottom: 4 },
  symptoms: { fontSize: 13, color: Colors.textMuted, marginBottom: 10 },
  meta: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  metaText: { fontSize: 13, color: Colors.text },
  actions: { flexDirection: 'row', gap: 12 },
  declineBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.error, borderRadius: 10, padding: 12, alignItems: 'center' },
  declineBtnText: { color: Colors.error, fontWeight: '700' },
  acceptBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
  acceptBtnText: { color: Colors.white, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptyNote: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});
