import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { pharmacyService } from '../../services/pharmacyService';
import { MedicineResult } from '../../types';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { formatCurrency } from '../../utils/format';
import { requiresPrescriptionForMedicine } from '../../utils/pharmacy';

type Nav = NativeStackNavigationProp<PatientStackParamList>;

export const MedicineSearchScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [pincode, setPincode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<Map<string, { medicine: MedicineResult; quantity: number }>>(
    new Map(),
  );

  const {
    data: medicines,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<MedicineResult[]>({
    queryKey: ['pharmacy-medicines', searchTerm, pincode.trim()],
    queryFn: () => pharmacyService.searchMedicines(searchTerm, pincode || undefined),
    enabled: searchTerm.length >= 2,
    retry: false,
  });

  const errorMessage = axios.isAxiosError(error) && error.response?.status === 401
    ? 'Session expired. Please login again.'
    : 'Something went wrong. Please try again.';

  const handleSearch = () => {
    if (query.trim().length < 2) {
      Alert.alert('Please enter at least 2 characters to search');
      return;
    }
    setSearchTerm(query.trim());
  };

  const addToCart = (medicine: MedicineResult) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(medicine.id);
      if (existing) {
        next.set(medicine.id, { medicine, quantity: existing.quantity + 1 });
      } else {
        next.set(medicine.id, { medicine, quantity: 1 });
      }
      return next;
    });
  };

  const removeFromCart = (medicineId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(medicineId);
      if (existing && existing.quantity > 1) {
        next.set(medicineId, { ...existing, quantity: existing.quantity - 1 });
      } else {
        next.delete(medicineId);
      }
      return next;
    });
  };

  const cartItems = Array.from(cart.values());
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('Cart is empty', 'Please add medicines to proceed.');
      return;
    }
    navigation.navigate('PharmacyCheckout', { cartItems });
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchArea}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search medicines..."
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TextInput
          style={[styles.searchInput, styles.pincodeInput]}
          placeholder="Pincode (optional)"
          placeholderTextColor={Colors.textMuted}
          value={pincode}
          onChangeText={setPincode}
          keyboardType="numeric"
          maxLength={6}
        />
        <Button title="Search" onPress={handleSearch} style={styles.searchBtn} fullWidth={false} />
      </View>

      {isLoading && <LoadingSpinner message="Searching medicines..." />}

      {!isLoading && isError && searchTerm.length >= 2 && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>{errorMessage}</Text>
          <Button
            title="Retry"
            onPress={() => refetch()}
            style={styles.retryBtn}
            fullWidth={false}
          />
        </View>
      )}

      {!isLoading && !isError && searchTerm.length >= 2 && (!medicines || medicines.length === 0) && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💊</Text>
          <Text style={styles.emptyTitle}>No medicines found</Text>
          <Text style={styles.emptySubtitle}>Try a different search term</Text>
        </View>
      )}

      {!searchTerm && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Search for medicines</Text>
          <Text style={styles.emptySubtitle}>Enter a medicine name to get started</Text>
        </View>
      )}

      <FlatList
        data={medicines || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const cartItem = cart.get(item.id);
          return (
            <View style={styles.medicineCard}>
              <View style={styles.medicineInfo}>
                <Text style={styles.medicineName}>{item.name}</Text>
                {item.manufacturer && (
                  <Text style={styles.medicineManufacturer}>{item.manufacturer}</Text>
                )}
                <View style={styles.medicineMetaRow}>
                  <Text style={styles.medicinePrice}>{formatCurrency(item.price)}</Text>
                  {item.unit && <Text style={styles.medicineUnit}> / {item.unit}</Text>}
                  {requiresPrescriptionForMedicine(item) && (
                    <Text style={styles.rxBadge}>Rx</Text>
                  )}
                </View>
              </View>
              <View style={styles.cartControls}>
                {cartItem ? (
                  <View style={styles.quantityRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => removeFromCart(item.id)}
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyCount}>{cartItem.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => addToCart(item)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      {cartCount > 0 && (
        <View style={styles.cartBar}>
          <Text style={styles.cartBarText}>
            {cartCount} item{cartCount > 1 ? 's' : ''} in cart
          </Text>
          <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
            <Text style={styles.checkoutBtnText}>Proceed to Checkout →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchArea: {
    backgroundColor: Colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  pincodeInput: { marginTop: 4 },
  searchBtn: { marginTop: 4 },
  list: { padding: 16, paddingBottom: 100 },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  medicineInfo: { flex: 1 },
  medicineName: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  medicineManufacturer: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  medicineMetaRow: { flexDirection: 'row', alignItems: 'center' },
  medicinePrice: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  medicineUnit: { fontSize: 12, color: Colors.textMuted },
  rxBadge: {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.error,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  cartControls: { marginLeft: 12 },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  quantityRow: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  qtyCount: { fontSize: 16, fontWeight: '700', color: Colors.text, marginHorizontal: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  retryBtn: { marginTop: 12 },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 28,
    elevation: 8,
  },
  cartBarText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  checkoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkoutBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
