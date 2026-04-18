import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { pharmacyService } from '../../services/pharmacyService';
import { PharmacyOrder } from '../../types';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { formatCurrency } from '../../utils/format';

type Nav = NativeStackNavigationProp<PatientStackParamList>;

const STATUS_COLORS: Record<string, string> = {
  PLACED: Colors.warning,
  PENDING: Colors.warning,
  PRESCRIPTION_REVIEW: Colors.warning,
  CONFIRMED: Colors.secondary,
  PACKED: Colors.secondary,
  SHIPPED: Colors.primary,
  OUT_FOR_DELIVERY: Colors.primary,
  DELIVERED: Colors.success,
  CANCELLED: Colors.error,
  FAILED: Colors.error,
  RETURNED: Colors.error,
  REFUNDED: Colors.success,
};

export const PharmacyOrdersScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const { data: orders, isLoading, refetch, isRefetching } = useQuery<PharmacyOrder[]>({
    queryKey: ['pharmacy-orders'],
    queryFn: () => pharmacyService.getOrders(),
  });

  if (isLoading) return <LoadingSpinner fullScreen message="Loading orders..." />;

  return (
    <View style={styles.container}>
      {(!orders || orders.length === 0) ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💊</Text>
          <Text style={styles.emptyTitle}>No pharmacy orders</Text>
          <Text style={styles.emptySubtitle}>Your medicine orders will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.orderCard}
              onPress={() => navigation.navigate('PharmacyOrderDetail', { orderId: item.id })}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
                <Text
                  style={[styles.statusBadge, { color: STATUS_COLORS[item.status] ?? Colors.textMuted }]}
                >
                  {item.status.replace(/_/g, ' ')}
                </Text>
              </View>
              <Text style={styles.partnerName}>{item.partnerName}</Text>
              <Text style={styles.itemsCount}>
                {item.items?.length ?? 0} item{(item.items?.length ?? 0) !== 1 ? 's' : ''}
              </Text>
              <View style={styles.orderFooter}>
                <Text style={styles.deliveryAddress} numberOfLines={1}>
                  📍 {item.deliveryAddress}
                </Text>
                <Text style={styles.totalAmount}>{formatCurrency(item.totalAmount)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16 },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderNumber: { fontSize: 15, fontWeight: '700', color: Colors.text },
  statusBadge: { fontSize: 12, fontWeight: '700' },
  partnerName: { fontSize: 13, color: Colors.textMuted, marginBottom: 4 },
  itemsCount: { fontSize: 13, color: Colors.textMuted, marginBottom: 8 },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryAddress: { flex: 1, fontSize: 12, color: Colors.textMuted, marginRight: 8 },
  totalAmount: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});
