import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { pharmacyService } from '../../services/pharmacyService';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { PharmacyOrder } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';

type Nav = NativeStackNavigationProp<PatientStackParamList>;

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  PRESCRIPTION_REVIEW: '#D97706',
  CONFIRMED: '#2563EB',
  PACKED: '#7C3AED',
  SHIPPED: '#0EA5E9',
  OUT_FOR_DELIVERY: '#0284C7',
  DELIVERED: '#10B981',
  CANCELLED: '#EF4444',
  RETURNED: '#6B7280',
  REFUNDED: '#059669',
};

const STATUS_ICONS: Record<string, string> = {
  PENDING: '🛒',
  PRESCRIPTION_REVIEW: '🧾',
  CONFIRMED: '✅',
  PACKED: '📦',
  SHIPPED: '🚚',
  OUT_FOR_DELIVERY: '🛵',
  DELIVERED: '🎉',
  CANCELLED: '❌',
  RETURNED: '↩️',
  REFUNDED: '💸',
};

export const PharmacyOrdersScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['pharmacy-orders'],
    queryFn: () => pharmacyService.getOrders(),
  });

  const orders = data?.data ?? [];

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading orders..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Button
              title="+ Order Medicines"
              onPress={() => navigation.navigate('MedicineSearch')}
              style={styles.newOrderButton}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💊</Text>
            <Text style={styles.emptyTitle}>No pharmacy orders yet</Text>
            <Text style={styles.emptyText}>
              Search and order medicines for home delivery
            </Text>
          </View>
        }
        renderItem={({ item }: { item: PharmacyOrder }) => {
          const statusColor = STATUS_COLORS[item.status] ?? Colors.textMuted;
          const statusIcon = STATUS_ICONS[item.status] ?? '📋';
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate('PharmacyOrderDetail', { orderId: item.id })
              }
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusIcon}>{statusIcon}</Text>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {item.status}
                  </Text>
                </View>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
              </View>

              <Text style={styles.itemsSummary}>
                {item.items.length} item{item.items.length !== 1 ? 's' : ''}{' '}
                · {item.items.map((i) => i.medicineName).slice(0, 2).join(', ')}
                {item.items.length > 2 ? ` +${item.items.length - 2} more` : ''}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.totalAmount}>
                  {formatCurrency(item.totalAmount)}
                </Text>
                <Text style={styles.viewDetails}>View Details →</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 32 },
  headerContainer: { marginBottom: 16 },
  newOrderButton: {},
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusIcon: { fontSize: 14 },
  statusText: { fontSize: 13, fontWeight: '700' },
  date: { fontSize: 12, color: Colors.textMuted },
  itemsSummary: { fontSize: 13, color: Colors.textMuted, marginBottom: 10 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalAmount: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  viewDetails: { fontSize: 13, fontWeight: '600', color: Colors.primary },
});
