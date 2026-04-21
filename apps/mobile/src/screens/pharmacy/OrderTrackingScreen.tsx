import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  Animated,
  Linking,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { pharmacyService } from '../../services/pharmacyService';
import { PharmacyOrder } from '../../types';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { formatCurrency, formatDate, formatTime } from '../../utils/format';
import { canCancelPharmacyOrder } from '../../utils/pharmacy';

type Route = RouteProp<PatientStackParamList, 'OrderTracking'>;

const POLL_INTERVAL_MS = 30_000;

// Visible tracking timeline steps (per task spec).
// The backend may also use PENDING / PRESCRIPTION_REVIEW which we treat
// as the first "Placed" step so the timeline stays accurate.
const TIMELINE_STEPS: { key: string; label: string; aliases?: string[] }[] = [
  { key: 'PLACED', label: 'Order Placed', aliases: ['PENDING', 'PRESCRIPTION_REVIEW'] },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PACKED', label: 'Packed' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
];

const SUPPORT_PHONE = '+918000000000';

const getStepIndex = (status: string): number => {
  const idx = TIMELINE_STEPS.findIndex(
    (s) => s.key === status || s.aliases?.includes(status),
  );
  return idx >= 0 ? idx : 0;
};

const isTerminalStatus = (status: string): boolean =>
  status === 'DELIVERED' ||
  status === 'CANCELLED' ||
  status === 'RETURNED' ||
  status === 'REFUNDED';

const formatEstimatedDelivery = (iso?: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const time = formatTime(iso);
  if (sameDay) return `Arriving by Today, ${time}`;
  if (isTomorrow) return `Arriving by Tomorrow, ${time}`;
  return `Arriving by ${formatDate(iso)}, ${time}`;
};

interface TimelineProps {
  currentIndex: number;
  cancelled: boolean;
}

const Timeline: React.FC<TimelineProps> = ({ currentIndex, cancelled }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    fade.setValue(0);
    scale.setValue(0.9);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [currentIndex, fade, scale]);

  return (
    <View style={styles.timeline}>
      {TIMELINE_STEPS.map((step, idx) => {
        const completed = !cancelled && idx < currentIndex;
        const active = !cancelled && idx === currentIndex;
        const isLast = idx === TIMELINE_STEPS.length - 1;

        const dotColor = cancelled
          ? Colors.border
          : completed || active
          ? Colors.primary
          : Colors.border;
        const labelColor = cancelled
          ? Colors.textMuted
          : completed || active
          ? Colors.text
          : Colors.textMuted;

        return (
          <View key={step.key} style={styles.timelineRow}>
            <View style={styles.timelineLeft}>
              <Animated.View
                style={[
                  styles.timelineDot,
                  { backgroundColor: dotColor },
                  active && {
                    transform: [{ scale }],
                    shadowColor: Colors.primary,
                    shadowOpacity: 0.4,
                    shadowRadius: 6,
                    elevation: 4,
                  },
                ]}
              >
                {completed && <Text style={styles.timelineCheck}>✓</Text>}
              </Animated.View>
              {!isLast && (
                <View
                  style={[
                    styles.timelineLine,
                    {
                      backgroundColor:
                        !cancelled && idx < currentIndex ? Colors.primary : Colors.border,
                    },
                  ]}
                />
              )}
            </View>
            <Animated.View
              style={[
                styles.timelineContent,
                active && { opacity: fade },
              ]}
            >
              <Text
                style={[
                  styles.timelineLabel,
                  { color: labelColor, fontWeight: active ? '700' : '500' },
                ]}
              >
                {step.label}
              </Text>
              {active && !cancelled && (
                <Text style={styles.timelineSubLabel}>In progress</Text>
              )}
              {completed && <Text style={styles.timelineSubLabel}>Completed</Text>}
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
};

export const OrderTrackingScreen: React.FC = () => {
  const route = useRoute<Route>();
  const { orderId } = route.params;
  const queryClient = useQueryClient();

  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<PharmacyOrder>({
    queryKey: ['pharmacy-order', orderId],
    queryFn: () => pharmacyService.getOrderById(orderId),
  });

  // Poll every 30s; stop polling once the order reaches a terminal state.
  useEffect(() => {
    if (order && isTerminalStatus(order.status)) {
      return;
    }
    const interval = setInterval(() => {
      refetch();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [order, refetch]);

  const cancelMutation = useMutation({
    mutationFn: () => pharmacyService.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy-order', orderId] });
      Alert.alert('Order Cancelled', 'Your order has been cancelled successfully.');
    },
    onError: (err: any) => {
      Alert.alert(
        'Cancel Failed',
        err?.response?.data?.message || 'Could not cancel the order. Please try again.',
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

  const handleSupport = () => {
    Alert.alert(
      'Contact Support',
      'Our support team is available 24x7. Would you like to call us?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() =>
              Alert.alert('Unable to place the call from this device.'),
            );
          },
        },
      ],
    );
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading your order..." />;
  }

  if (isError) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.stateIcon}>⚠️</Text>
        <Text style={styles.stateTitle}>Network Error</Text>
        <Text style={styles.stateMessage}>
          {(error as any)?.message ?? 'Unable to load this order. Please try again.'}
        </Text>
        <Button title="Retry" onPress={() => refetch()} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.stateIcon}>📦</Text>
        <Text style={styles.stateTitle}>Order Not Found</Text>
        <Text style={styles.stateMessage}>
          We couldn't find an order with this ID. It may have been removed.
        </Text>
        <Button title="Refresh" onPress={() => refetch()} />
      </View>
    );
  }

  const cancelled =
    order.status === 'CANCELLED' ||
    order.status === 'RETURNED' ||
    order.status === 'REFUNDED';
  const currentIndex = getStepIndex(order.status);
  const canCancel = canCancelPharmacyOrder(order.status);
  const eta = formatEstimatedDelivery(order.estimatedDeliveryAt);
  const delivered = order.status === 'DELIVERED';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      {/* Order Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.partnerLogo}>
            <Text style={styles.partnerLogoText}>
              {(order.partnerName || 'RX').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.partnerName}>{order.partnerName}</Text>
            <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
            <Text style={styles.orderDate}>
              Placed on {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
            </Text>
          </View>
        </View>

        {cancelled ? (
          <View style={[styles.etaBanner, { backgroundColor: Colors.error + '15' }]}>
            <Text style={[styles.etaText, { color: Colors.error }]}>
              Order {order.status.toLowerCase()}
            </Text>
          </View>
        ) : delivered ? (
          <View style={[styles.etaBanner, { backgroundColor: Colors.success + '15' }]}>
            <Text style={[styles.etaText, { color: Colors.success }]}>
              ✓ Delivered{order.deliveredAt ? ` on ${formatDate(order.deliveredAt)}` : ''}
            </Text>
          </View>
        ) : eta ? (
          <View style={styles.etaBanner}>
            <Text style={styles.etaText}>{eta}</Text>
          </View>
        ) : null}
      </View>

      {/* Status Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Status</Text>
        <Timeline currentIndex={currentIndex} cancelled={cancelled} />
      </View>

      {/* Medicine List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medicines ({order.items.length})</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.medicineName}</Text>
              {item.dosage && <Text style={styles.itemMeta}>{item.dosage}</Text>}
            </View>
            <Text style={styles.itemQty}>×{item.quantity}</Text>
          </View>
        ))}
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <Text style={styles.addressText}>{order.deliveryAddress}</Text>
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

      {/* Actions */}
      <View style={styles.actions}>
        {canCancel ? (
          <Button
            title={cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
            onPress={handleCancel}
            variant="danger"
            loading={cancelMutation.isPending}
          />
        ) : !cancelled && !delivered ? (
          <Text style={styles.disabledMessage}>
            This order can no longer be cancelled.
          </Text>
        ) : null}
        <View style={{ height: 12 }} />
        <Button title="Contact Support" onPress={handleSupport} variant="secondary" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  centerState: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  stateIcon: { fontSize: 48, marginBottom: 12 },
  stateTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  stateMessage: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },

  header: {
    backgroundColor: Colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  partnerLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  partnerLogoText: { fontSize: 20, fontWeight: '800', color: Colors.primaryDark },
  partnerName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  orderNumber: { fontSize: 13, color: Colors.text, marginTop: 2 },
  orderDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  etaBanner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  etaText: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark, textAlign: 'center' },

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

  // Timeline
  timeline: { paddingTop: 4 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineLeft: { alignItems: 'center', width: 28 },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  timelineCheck: { color: Colors.white, fontSize: 11, fontWeight: '900' },
  timelineLine: { width: 2, flex: 1, minHeight: 22, marginTop: 2 },
  timelineContent: { flex: 1, paddingBottom: 18, paddingLeft: 8 },
  timelineLabel: { fontSize: 14 },
  timelineSubLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  // Items
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  itemMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  itemQty: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginLeft: 12 },

  addressText: { fontSize: 14, color: Colors.text, lineHeight: 20 },

  // Pricing
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

  actions: { margin: 16, marginTop: 20 },
  disabledMessage: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
});
