import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { pharmacyService } from '../../services/pharmacyService';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { Address, SelectedMedicine } from '../../types';
import { formatCurrency } from '../../utils/format';
import api from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'PharmacyCheckout'>;
  route: RouteProp<PatientStackParamList, 'PharmacyCheckout'>;
};

export const PharmacyCheckoutScreen: React.FC<Props> = ({ navigation, route }) => {
  const { selectedMedicines } = route.params;

  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [notes, setNotes] = useState('');
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showPartnerPicker, setShowPartnerPicker] = useState(false);

  const { data: providers, isLoading: loadingProviders } = useQuery<string[]>({
    queryKey: ['pharmacy-providers'],
    queryFn: pharmacyService.getProviders,
  });

  const { data: addresses, isLoading: loadingAddresses } = useQuery<Address[]>({
    queryKey: ['patient-addresses'],
    queryFn: async () => {
      const res = await api.get('/patients/me/addresses');
      return res.data;
    },
  });

  const totalAmount = selectedMedicines.reduce(
    (sum, m) => sum + m.price * m.quantity,
    0,
  );

  const placeOrderMutation = useMutation({
    mutationFn: pharmacyService.createOrder,
    onSuccess: (order) => {
      Alert.alert('Order Placed! 🎉', `Your pharmacy order has been placed successfully.`, [
        {
          text: 'View Order',
          onPress: () => {
            navigation.navigate('PharmacyOrderDetail', { orderId: order.id });
          },
        },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to place order. Please try again.');
    },
  });

  const handlePlaceOrder = () => {
    if (!selectedPartner) {
      Alert.alert('Partner Required', 'Please select a pharmacy partner.');
      return;
    }
    if (!selectedAddress) {
      Alert.alert('Address Required', 'Please select a delivery address.');
      return;
    }

    const deliveryAddress = `${selectedAddress.addressLine}, ${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.pincode}`;

    placeOrderMutation.mutate({
      partnerId: selectedPartner,
      deliveryAddress,
      items: selectedMedicines.map((m) => ({
        medicineId: m.id,
        medicineName: m.name,
        quantity: m.quantity,
        unitPrice: m.price,
      })),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Items Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        {selectedMedicines.map((medicine: SelectedMedicine) => (
          <View key={medicine.id} style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemName}>{medicine.name}</Text>
              <Text style={styles.itemUnit}>Qty: {medicine.quantity}</Text>
            </View>
            <Text style={styles.itemPrice}>
              {formatCurrency(medicine.price * medicine.quantity)}
            </Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
        </View>
      </View>

      {/* Partner Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pharmacy Partner</Text>
        {loadingProviders ? (
          <LoadingSpinner message="Loading partners..." />
        ) : (
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowPartnerPicker(true)}
          >
            <Text style={selectedPartner ? styles.selectorText : styles.selectorPlaceholder}>
              {selectedPartner
                ? selectedPartner.charAt(0).toUpperCase() + selectedPartner.slice(1)
                : 'Select pharmacy partner'}
            </Text>
            <Text style={styles.selectorChevron}>›</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Address Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        {loadingAddresses ? (
          <LoadingSpinner message="Loading addresses..." />
        ) : (
          <>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => setShowAddressPicker(true)}
            >
              <Text style={selectedAddress ? styles.selectorText : styles.selectorPlaceholder}>
                {selectedAddress
                  ? `${selectedAddress.label} — ${selectedAddress.addressLine}, ${selectedAddress.city}`
                  : 'Select delivery address'}
              </Text>
              <Text style={styles.selectorChevron}>›</Text>
            </TouchableOpacity>
            {!addresses || addresses.length === 0 ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('AddressList')}
                style={styles.addAddressLink}
              >
                <Text style={styles.addAddressText}>+ Add a delivery address</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes (optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add any special instructions for delivery..."
          placeholderTextColor={Colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Place Order */}
      <View style={styles.footer}>
        <Button
          title={`Place Order · ${formatCurrency(totalAmount)}`}
          onPress={handlePlaceOrder}
          loading={placeOrderMutation.isPending}
          disabled={!selectedPartner || !selectedAddress}
        />
        <Button
          title="Back"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
      </View>

      {/* Partner Picker Modal */}
      <Modal visible={showPartnerPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Pharmacy Partner</Text>
            {(providers || []).length === 0 ? (
              <Text style={styles.modalEmpty}>No pharmacy partners available</Text>
            ) : (
              <FlatList
                data={providers}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedPartner === item && styles.modalItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedPartner(item);
                      setShowPartnerPicker(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </Text>
                    {selectedPartner === item && (
                      <Text style={styles.modalItemCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setShowPartnerPicker(false)}
              style={styles.modalCancel}
            />
          </View>
        </View>
      </Modal>

      {/* Address Picker Modal */}
      <Modal visible={showAddressPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Delivery Address</Text>
            {!addresses || addresses.length === 0 ? (
              <Text style={styles.modalEmpty}>No saved addresses. Add one first.</Text>
            ) : (
              <FlatList
                data={addresses}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedAddress?.id === item.id && styles.modalItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedAddress(item);
                      setShowAddressPicker(false);
                    }}
                  >
                    <View style={styles.addressOption}>
                      <Text style={styles.addressLabel}>{item.label}</Text>
                      <Text style={styles.addressLine}>
                        {item.addressLine}, {item.city}, {item.state}
                      </Text>
                    </View>
                    {selectedAddress?.id === item.id && (
                      <Text style={styles.modalItemCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setShowAddressPicker(false)}
              style={styles.modalCancel}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemLeft: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  itemUnit: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  totalValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  selectorText: { fontSize: 15, color: Colors.text, flex: 1 },
  selectorPlaceholder: { fontSize: 15, color: Colors.textMuted, flex: 1 },
  selectorChevron: { fontSize: 20, color: Colors.textMuted },
  addAddressLink: { marginTop: 10 },
  addAddressText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  notesInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.background,
    minHeight: 80,
  },
  footer: { marginTop: 8 },
  backButton: { marginTop: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  modalEmpty: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalItemSelected: { backgroundColor: Colors.primaryLight, borderRadius: 8, paddingHorizontal: 8 },
  modalItemText: { fontSize: 15, color: Colors.text },
  modalItemCheck: { fontSize: 18, color: Colors.primary, fontWeight: '700' },
  addressOption: { flex: 1 },
  addressLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  addressLine: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  modalCancel: { marginTop: 16 },
});
