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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { pharmacyService } from '../../services/pharmacyService';
import { PharmacyPartner, Address } from '../../types';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { formatCurrency } from '../../utils/format';
import api from '../../services/api';

type Nav = NativeStackNavigationProp<PatientStackParamList>;
type Route = RouteProp<PatientStackParamList, 'PharmacyCheckout'>;

export const PharmacyCheckoutScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { cartItems } = route.params;
  const queryClient = useQueryClient();

  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const { data: partners, isLoading: loadingPartners } = useQuery<PharmacyPartner[]>({
    queryKey: ['pharmacy-partners'],
    queryFn: pharmacyService.getPartners,
  });

  const { data: addresses, isLoading: loadingAddresses } = useQuery<Address[]>({
    queryKey: ['patient-addresses'],
    queryFn: async () => {
      const res = await api.get('/patients/me/addresses');
      return res.data;
    },
  });

  const placeOrderMutation = useMutation({
    mutationFn: pharmacyService.createOrder,
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-orders'] });
      Alert.alert(
        '✅ Order Placed!',
        `Your order #${order.orderNumber} has been placed successfully.`,
        [
          {
            text: 'View Orders',
            onPress: () => navigation.navigate('PharmacyOrders'),
          },
          {
            text: 'Go Home',
            onPress: () => navigation.navigate('Tabs'),
          },
        ],
      );
    },
    onError: (error: any) => {
      Alert.alert(
        'Order Failed',
        error?.response?.data?.message || 'Could not place order. Please try again.',
      );
    },
  });

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.medicine.price * item.quantity,
    0,
  );

  const handlePlaceOrder = () => {
    if (!selectedPartnerId) {
      Alert.alert('Please select a pharmacy partner');
      return;
    }
    if (!selectedAddressId) {
      Alert.alert('Please select a delivery address');
      return;
    }

    placeOrderMutation.mutate({
      partnerId: selectedPartnerId,
      deliveryAddressId: selectedAddressId,
      items: cartItems.map((item) => ({
        medicineCode: item.medicine.id,
        medicineName: item.medicine.name,
        quantity: item.quantity,
        unitPrice: item.medicine.price,
      })),
    });
  };

  if (loadingPartners || loadingAddresses) {
    return <LoadingSpinner fullScreen message="Loading checkout..." />;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        {cartItems.map((item) => (
          <View key={item.medicine.id} style={styles.orderItem}>
            <View style={styles.orderItemInfo}>
              <Text style={styles.orderItemName}>{item.medicine.name}</Text>
              {item.medicine.manufacturer && (
                <Text style={styles.orderItemMfg}>{item.medicine.manufacturer}</Text>
              )}
            </View>
            <View style={styles.orderItemRight}>
              <Text style={styles.orderItemQty}>×{item.quantity}</Text>
              <Text style={styles.orderItemPrice}>
                {formatCurrency(item.medicine.price * item.quantity)}
              </Text>
            </View>
          </View>
        ))}
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Subtotal</Text>
          <Text style={styles.subtotalValue}>{formatCurrency(subtotal)}</Text>
        </View>
      </View>

      {/* Select Partner */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Pharmacy Partner</Text>
        {!partners || partners.length === 0 ? (
          <Text style={styles.noDataText}>No pharmacy partners available</Text>
        ) : (
          partners.map((partner) => (
            <TouchableOpacity
              key={partner.id}
              style={[
                styles.partnerCard,
                selectedPartnerId === partner.id && styles.selectedCard,
              ]}
              onPress={() => setSelectedPartnerId(partner.id)}
            >
              <View style={styles.partnerInfo}>
                <Text style={styles.partnerName}>{partner.displayName || partner.name}</Text>
                {partner.description && (
                  <Text style={styles.partnerDesc}>{partner.description}</Text>
                )}
              </View>
              <View
                style={[
                  styles.radioBtn,
                  selectedPartnerId === partner.id && styles.radioBtnSelected,
                ]}
              />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Select Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        {!addresses || addresses.length === 0 ? (
          <Text style={styles.noDataText}>
            No saved addresses. Please add an address from your profile.
          </Text>
        ) : (
          addresses.map((address) => (
            <TouchableOpacity
              key={address.id}
              style={[
                styles.addressCard,
                selectedAddressId === address.id && styles.selectedCard,
              ]}
              onPress={() => setSelectedAddressId(address.id)}
            >
              <View style={styles.addressInfo}>
                <Text style={styles.addressLabel}>{address.label}</Text>
                <Text style={styles.addressText}>
                  {address.addressLine}, {address.city}, {address.state} - {address.pincode}
                </Text>
                {address.isDefault && (
                  <Text style={styles.defaultBadge}>Default</Text>
                )}
              </View>
              <View
                style={[
                  styles.radioBtn,
                  selectedAddressId === address.id && styles.radioBtnSelected,
                ]}
              />
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.placeOrderArea}>
        <Button
          title={placeOrderMutation.isPending ? 'Placing Order...' : `Place Order · ${formatCurrency(subtotal)}`}
          onPress={handlePlaceOrder}
          loading={placeOrderMutation.isPending}
          disabled={!selectedPartnerId || !selectedAddressId}
        />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  orderItemInfo: { flex: 1 },
  orderItemName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  orderItemMfg: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  orderItemRight: { alignItems: 'flex-end' },
  orderItemQty: { fontSize: 12, color: Colors.textMuted },
  orderItemPrice: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginTop: 2 },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  subtotalLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  subtotalValue: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  selectedCard: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  partnerInfo: { flex: 1 },
  partnerName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  partnerDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  addressInfo: { flex: 1 },
  addressLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  addressText: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  defaultBadge: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  radioBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    marginLeft: 12,
  },
  radioBtnSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  noDataText: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic' },
  placeOrderArea: { margin: 16, marginTop: 20 },
});
