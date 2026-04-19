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
import { useRoute, RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { pharmacyService } from '../../services/pharmacyService';
import { PharmacyOrder } from '../../types';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { formatCurrency } from '../../utils/format';
import { canCancelPharmacyOrder } from '../../utils/pharmacy';

type Route = RouteProp<PatientStackParamList, 'PharmacyOrderDetail'>;

const STATUS_COLORS: Record<string, string> = {
  PENDING: Colors.warning,
  PRESCRIPTION_REVIEW: Colors.warning,
  CONFIRMED: Colors.secondary,
  PACKED: Colors.secondary,
  SHIPPED: Colors.primary,
  OUT_FOR_DELIVERY: Colors.primary,
  DELIVERED: Colors.success,
  CANCELLED: Colors.error,
  RETURNED: Colors.error,
  REFUNDED: Colors.success,
};

export const PharmacyOrderDetailScreen: React.FC = () => {
  const route = useRoute<Route>();
  const { orderId } = route.params;
  const queryClient = useQueryClient();

  const {
    data: order,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<PharmacyOrder>({
    queryKey: ['pharmacy-order', orderId],
    queryFn: () => pharmacyService.getOrderById(orderId),
  });

  const cancelMutation = useMutation({
    mutationFn: () => pharmacyService.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-order', orderId] });
      Alert.alert('Order Cancelled', 'Your order has been cancelled successfully.');
    },
    onError: (error: any) => {
      Alert.alert(
        'Cancel Failed',
        error?.response?.data?.message || 'Could not cancel the order. Please try again.',
      );
    },
  });

  const handleCancel = () => {
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
    );
  };

  if (isLoading) return <LoadingSpinner fullScreen message="Loading order..." />;
  if (!order) return null;

  const canCancel = canCancelPharmacyOrder(order.status);
  const statusColor = STATUS_COLORS[order.status] ?? Colors.textMuted;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      {/* Status Card */}
      <View style={styles.statusCard}>
        <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
        <View style={[styles.statusPill, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {order.status.replace(/_/g, ' ')}
          </Text>
        </View>
        <Text style={styles.partnerName}>{order.partnerName}</Text>
      </View>

      {/* Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.medicineName}</Text>
              {item.dosage && <Text style={styles.itemMeta}>{item.dosage}</Text>}
              {item.instructions && (
                <Text style={styles.itemInstructions}>{item.instructions}</Text>
              )}
              {item.isSubstitute && (
                <Text style={styles.substituteBadge}>Substitute</Text>
              )}
            </View>
            <View style={styles.itemRight}>
              <Text style={styles.itemQty}>×{item.quantity}</Text>
              <Text style={styles.itemPrice}>{formatCurrency(item.totalPrice)}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Price Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Price Details</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Subtotal</Text>
          <Text style={styles.priceValue}>{formatCurrency(order.subtotal)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Delivery Fee</Text>
          <Text style={styles.priceValue}>{formatCurrency(order.deliveryFee)}</Text>
        </View>
        {order.discount > 0 && (
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: Colors.success }]}>Discount</Text>
            <Text style={[styles.priceValue, { color: Colors.success }]}>
              −{formatCurrency(order.discount)}
            </Text>
          </View>
        )}
        <View style={[styles.priceRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(order.totalAmount)}</Text>
        </View>
      </View>

      {/* Delivery Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Address</Text>
          <Text style={styles.infoValue}>{order.deliveryAddress}</Text>
        </View>
        {order.estimatedDeliveryAt && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Est. Delivery</Text>
            <Text style={styles.infoValue}>
              {new Date(order.estimatedDeliveryAt).toLocaleDateString()}
            </Text>
          </View>
        )}
        {order.deliveredAt && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Delivered On</Text>
            <Text style={[styles.infoValue, { color: Colors.success }]}>
              {new Date(order.deliveredAt).toLocaleDateString()}
            </Text>
          </View>
        )}
        {order.notes && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Notes</Text>
            <Text style={styles.infoValue}>{order.notes}</Text>
          </View>
        )}
      </View>

      {canCancel && (
        <View style={styles.cancelArea}>
          <Button
            title={cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
            onPress={handleCancel}
            variant="danger"
            loading={cancelMutation.isPending}
          />
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  statusCard: {
    backgroundColor: Colors.white,
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  orderNumber: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  statusPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusText: { fontSize: 13, fontWeight: '700' },
  partnerName: { fontSize: 14, color: Colors.textMuted },
  section: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  itemMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  itemInstructions: { fontSize: 12, color: Colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  substituteBadge: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '600',
  },
  itemRight: { alignItems: 'flex-end', marginLeft: 12 },
  itemQty: { fontSize: 12, color: Colors.textMuted },
  itemPrice: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginTop: 2 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  priceLabel: { fontSize: 14, color: Colors.textMuted },
  priceValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  totalRow: { borderBottomWidth: 0, paddingTop: 12 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  totalValue: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: { fontSize: 13, color: Colors.textMuted, flex: 0.4 },
  infoValue: { fontSize: 13, color: Colors.text, flex: 0.6, textAlign: 'right' },
  cancelArea: { margin: 16, marginTop: 20 },
});
