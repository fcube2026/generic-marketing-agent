import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { pharmacyService } from '../../services/pharmacyService';
import { MedicineResult, MedicinePriceComparison } from '../../types';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { formatCurrency } from '../../utils/format';
import { requiresPrescriptionForMedicine } from '../../utils/pharmacy';

type RouteProps = RouteProp<PatientStackParamList, 'MedicineDetail'>;
type Nav = NativeStackNavigationProp<PatientStackParamList>;

export const MedicineDetailScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<Nav>();
  const { medicine, pincode } = route.params;
  const [quantity, setQuantity] = useState(1);

  const {
    data: comparisons,
    isLoading: compareLoading,
  } = useQuery<MedicinePriceComparison[]>({
    queryKey: ['medicine-compare', medicine.id, pincode],
    queryFn: () => pharmacyService.compareMedicinePrices(medicine.id, pincode),
    retry: false,
    // Silently fall back to single price on error — no error UI needed here
    throwOnError: false,
  });

  const handleAddToCart = () => {
    navigation.navigate('PharmacyCheckout', {
      cartItems: [{ medicine, quantity }],
    });
  };

  const increaseQty = () => setQuantity((q) => q + 1);
  const decreaseQty = () => setQuantity((q) => Math.max(1, q - 1));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text style={styles.medicineName}>{medicine.name}</Text>
            {requiresPrescriptionForMedicine(medicine) && (
              <Text style={styles.rxBadge}>Rx</Text>
            )}
          </View>
          {medicine.manufacturer && (
            <Text style={styles.manufacturer}>{medicine.manufacturer}</Text>
          )}
          <Text style={styles.basePrice}>{formatCurrency(medicine.price)}</Text>
          {medicine.unit && (
            <Text style={styles.unit}>Per {medicine.unit}</Text>
          )}
        </View>

        {/* Composition */}
        {(medicine as any).composition && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Composition</Text>
            <Text style={styles.sectionText}>{(medicine as any).composition}</Text>
          </View>
        )}

        {/* Description */}
        {(medicine as any).description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this medicine</Text>
            <Text style={styles.sectionText}>{(medicine as any).description}</Text>
          </View>
        )}

        {/* Usage */}
        {(medicine as any).usage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How to use</Text>
            <Text style={styles.sectionText}>{(medicine as any).usage}</Text>
          </View>
        )}

        {/* Side effects */}
        {(medicine as any).sideEffects && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Side Effects</Text>
            <Text style={styles.sectionText}>{(medicine as any).sideEffects}</Text>
          </View>
        )}

        {/* Price Comparison */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Comparison</Text>
          {compareLoading && (
            <View style={styles.compareLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.compareLoadingText}>Fetching partner prices…</Text>
            </View>
          )}
          {!compareLoading && comparisons && comparisons.length > 0 ? (
            comparisons.map((item) => (
              <View key={item.partnerId} style={styles.compareRow}>
                <View style={styles.compareLeft}>
                  <Text style={styles.partnerName}>{item.partnerName}</Text>
                  {item.deliveryEta && (
                    <Text style={styles.deliveryEta}>ETA: {item.deliveryEta}</Text>
                  )}
                </View>
                <View style={styles.compareRight}>
                  <Text style={styles.comparePrice}>{formatCurrency(item.price)}</Text>
                  <Text
                    style={[
                      styles.availabilityBadge,
                      item.available ? styles.availableText : styles.unavailableText,
                    ]}
                  >
                    {item.available ? 'Available' : 'Unavailable'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            !compareLoading && (
              <View style={styles.compareRow}>
                <Text style={styles.partnerName}>Base Price</Text>
                <Text style={styles.comparePrice}>{formatCurrency(medicine.price)}</Text>
              </View>
            )
          )}
        </View>

        {/* Spacer for bottom bar */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Quantity + Add to Cart */}
      <View style={styles.bottomBar}>
        <View style={styles.qtyRow}>
          <TouchableOpacity style={styles.qtyBtn} onPress={decreaseQty}>
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyCount}>{quantity}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={increaseQty}>
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.addToCartWrap}>
          <Button
            title={`Add to Cart • ${formatCurrency(medicine.price * quantity)}`}
            onPress={handleAddToCart}
            fullWidth={false}
            style={styles.addToCartBtn}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16 },
  headerCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  medicineName: { fontSize: 20, fontWeight: '700', color: Colors.text, flex: 1, marginRight: 8 },
  rxBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.error,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 2,
  },
  manufacturer: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  basePrice: { fontSize: 22, fontWeight: '800', color: Colors.primary, marginTop: 10 },
  unit: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionText: { fontSize: 14, color: Colors.textMuted, lineHeight: 20 },
  compareLoading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compareLoadingText: { fontSize: 13, color: Colors.textMuted },
  compareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  compareLeft: { flex: 1 },
  compareRight: { alignItems: 'flex-end' },
  partnerName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  deliveryEta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  comparePrice: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  availabilityBadge: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  availableText: { color: Colors.success },
  unavailableText: { color: Colors.error },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
    gap: 12,
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  qtyCount: { fontSize: 18, fontWeight: '700', color: Colors.text, marginHorizontal: 12 },
  addToCartWrap: { flex: 1 },
  addToCartBtn: { minHeight: 44, paddingVertical: 10 },
});
