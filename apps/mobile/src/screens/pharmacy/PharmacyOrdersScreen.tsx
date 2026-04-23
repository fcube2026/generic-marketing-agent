import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { pharmacyService } from '../../services/pharmacyService';
import { PharmacyOrder, MedicineResult } from '../../types';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { formatCurrency } from '../../utils/format';
import { getPharmacyDisplayPricing } from '../../utils/pharmacy';

type Nav = NativeStackNavigationProp<PatientStackParamList>;

const PAGE_SIZE = 10;

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

type FilterTab = 'Active' | 'Delivered' | 'Cancelled';

const FILTER_TABS: FilterTab[] = ['Active', 'Delivered', 'Cancelled'];

const ACTIVE_STATUSES = new Set([
  'PENDING',
  'PRESCRIPTION_REVIEW',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
]);

const applyFilter = (orders: PharmacyOrder[], tab: FilterTab): PharmacyOrder[] => {
  switch (tab) {
    case 'Active':
      return orders.filter((o) => ACTIVE_STATUSES.has(o.status));
    case 'Delivered':
      return orders.filter((o) => o.status === 'DELIVERED');
    case 'Cancelled':
      return orders.filter((o) =>
        o.status === 'CANCELLED' || o.status === 'RETURNED' || o.status === 'REFUNDED',
      );
  }
};

export const PharmacyOrdersScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const [activeTab, setActiveTab] = useState<FilterTab>('Active');
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [extraOrders, setExtraOrders] = useState<PharmacyOrder[]>([]);
  const loadingMoreRef = useRef(false);

  const { data: firstPageOrders, isLoading, refetch, isRefetching } = useQuery<PharmacyOrder[]>({
    queryKey: ['pharmacy-orders'],
    queryFn: () => pharmacyService.getOrders(1, PAGE_SIZE),
    select: (data) => data,
  });

  // Combined list: first page from React Query + extra pages loaded via pagination
  const allOrders = [...(firstPageOrders ?? []), ...extraOrders];

  const filteredOrders = applyFilter(allOrders, activeTab);

  const handleLoadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const newOrders = await pharmacyService.getOrders(nextPage, PAGE_SIZE);
      if (newOrders.length === 0) {
        setHasMore(false);
      } else {
        setExtraOrders((prev) => [...prev, ...newOrders]);
        setPage(nextPage);
        if (newOrders.length < PAGE_SIZE) {
          setHasMore(false);
        }
      }
    } catch {
      // Silently ignore pagination errors — the existing list stays intact
      setHasMore(false);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, page]);

  const handleRefresh = useCallback(async () => {
    setExtraOrders([]);
    setPage(1);
    setHasMore(true);
    await refetch();
  }, [refetch]);

  const handleReorder = useCallback(
    (order: PharmacyOrder) => {
      Alert.alert(
        'Reorder',
        `Add ${order.items.length} item${order.items.length !== 1 ? 's' : ''} from order #${order.orderNumber} to cart?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reorder',
            onPress: () => {
              const cartItems = order.items.map((item) => ({
                medicine: {
                  id: item.medicineCode ?? item.id,
                  name: item.medicineName,
                  price: item.unitPrice,
                } as MedicineResult,
                quantity: item.quantity,
              }));
              navigation.navigate('PharmacyCheckout', { cartItems });
            },
          },
        ],
      );
    },
    [navigation],
  );

  if (isLoading) return <LoadingSpinner fullScreen message="Loading orders..." />;

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredOrders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💊</Text>
          <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} orders</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'Active'
              ? 'Your active medicine orders will appear here'
              : activeTab === 'Delivered'
              ? 'Your delivered orders will appear here'
              : 'Your cancelled orders will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={handleRefresh}
          refreshing={isRefetching}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={Colors.primary} style={styles.loadMoreSpinner} />
            ) : null
          }
          renderItem={({ item }) => {
            const pricing = getPharmacyDisplayPricing(item);
            const isDelivered = item.status === 'DELIVERED';

            return (
              <TouchableOpacity
                style={styles.orderCard}
                onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
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
                  <Text style={styles.totalAmount}>{formatCurrency(pricing.totalAmount)}</Text>
                </View>
                {isDelivered && (
                  <TouchableOpacity
                    style={styles.reorderButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleReorder(item);
                    }}
                  >
                    <Text style={styles.reorderButtonText}>🔄 Reorder</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: Colors.primary,
  },
  tabLabel: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  tabLabelActive: { color: Colors.primary },
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
  reorderButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignSelf: 'flex-end',
  },
  reorderButtonText: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  loadMoreSpinner: { paddingVertical: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});
