import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { pharmacyService } from '../../services/pharmacyService';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { formatCurrency, formatDateTime } from '../../utils/format';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'PharmacyOrderDetail'>;
  route: RouteProp<PatientStackParamList, 'PharmacyOrderDetail'>;
};

const STATUS_COLORS: Record<string, string> = {
  PLACED: '#F59E0B',
  CONFIRMED: '#2563EB',
  PACKED: '#7C3AED',
  SHIPPED: '#0EA5E9',
  DELIVERED: '#10B981',
  CANCELLED: '#EF4444',
  RETURNED: '#6B7280',
};

// All statuses for which the backend allows cancellation
const CANCELLABLE_STATUSES = ['PENDING', 'PRESCRIPTION_REVIEW', 'PLACED', 'CONFIRMED', 'PACKED'];

export const PharmacyOrderDetailScreen: React.FC<Props> = ({ route }) => {
  const { orderId } = route.params;
  const queryClient = useQueryClient();

  const {
    data: order,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['pharmacy-order', orderId],
    queryFn: () => pharmacyService.getOrderById(orderId),
  });

  const refreshMutation = useMutation({
    mutationFn: () => pharmacyService.refreshOrderStatus(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-orders'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to refresh status.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => pharmacyService.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-orders'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to cancel order.');
    },
  });

  const handleRefreshStatus = () => {
    refreshMutation.mutate();
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading order details..." />;
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Order not found.</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[order.status] ?? Colors.textMuted;
  const canCancel = CANCELLABLE_STATUSES.includes(order.status);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: statusColor }]}>
        <Text style={styles.statusBannerText}>{order.status}</Text>
        <Text style={styles.statusDate}>{formatDateTime(order.createdAt)}</Text>
      </View>

      {/* Order Summary */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Order Summary</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Order ID</Text>
          <Text style={styles.rowValue} numberOfLines={1} ellipsizeMode="middle">
            {order.id}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Delivery Address</Text>
          <Text style={[styles.rowValue, styles.rowValueSmall]}>{order.deliveryAddress}</Text>
        </View>
        {order.notes ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Notes</Text>
            <Text style={styles.rowValue}>{order.notes}</Text>
          </View>
        ) : null}
      </Card>

      {/* Items */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Items</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemName}>{item.medicineName}</Text>
              <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
            </View>
            <View style={styles.itemRight}>
              <Text style={styles.itemUnitPrice}>
                {formatCurrency(item.unitPrice)} each
              </Text>
              <Text style={styles.itemTotal}>{formatCurrency(item.totalPrice)}</Text>
            </View>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>{formatCurrency(order.totalAmount)}</Text>
        </View>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="🔄 Refresh Status"
          onPress={handleRefreshStatus}
          loading={refreshMutation.isPending}
          variant="outline"
          style={styles.actionButton}
        />
        {canCancel && (
          <Button
            title="Cancel Order"
            variant="danger"
            onPress={() =>
              Alert.alert(
                'Cancel Order',
                'Are you sure you want to cancel this order?',
                [
                  { text: 'No', style: 'cancel' },
                  {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: () => cancelMutation.mutate(),
                  },
                ],
              )
            }
            loading={cancelMutation.isPending}
            style={styles.actionButton}
          />
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 16, color: Colors.error },
  statusBanner: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  statusBannerText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 4,
  },
  statusDate: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  card: { margin: 16, marginBottom: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  rowLabel: { fontSize: 13, color: Colors.textMuted, flex: 1 },
  rowValue: { fontSize: 13, fontWeight: '600', color: Colors.text, flex: 2, textAlign: 'right' },
  rowValueSmall: { fontSize: 12 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemLeft: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  itemQty: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  itemRight: { alignItems: 'flex-end' },
  itemUnitPrice: { fontSize: 12, color: Colors.textMuted },
  itemTotal: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginTop: 2 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  totalValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  actions: { padding: 16, gap: 12 },
  actionButton: { marginBottom: 0 },
});
