import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import * as Location from 'expo-location';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { pharmacyService } from '../../services/pharmacyService';
import { PharmacyPartner } from '../../types';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { formatCurrency } from '../../utils/format';
import api from '../../services/api';
import { ENDPOINTS } from '../../constants/api';
import {
  calculateDeliveryFee,
  getFreeDeliveryThreshold,
  requiresPrescriptionForMedicine,
} from '../../utils/pharmacy';
import { usePharmacyOrderStore } from '../../store/pharmacyOrderStore';

type PrescriptionOption = {
  id: string;
  details?: string | null;
  fileUrl?: string | null;
  createdAt: string;
  bookingId: string;
  providerName?: string;
  serviceCategoryName?: string;
};

type ConsultationSummaryResponse = {
  booking?: {
    id: string;
    provider?: { name?: string };
    serviceCategory?: { name?: string };
  };
  prescriptions?: Array<{
    id: string;
    details?: string | null;
    fileUrl?: string | null;
    createdAt: string;
  }>;
};

type Nav = NativeStackNavigationProp<PatientStackParamList>;
type Route = RouteProp<PatientStackParamList, 'PharmacyCheckout'>;
type PaymentMethod = 'UPI' | 'COD' | 'CARD' | 'NETBANKING';

const PAYMENT_METHOD_OPTIONS: Array<{ label: string; value: PaymentMethod }> = [
  { label: 'UPI', value: 'UPI' },
  { label: 'Cash on Delivery', value: 'COD' },
  { label: 'Card', value: 'CARD' },
  { label: 'Net Banking', value: 'NETBANKING' },
];

export const PharmacyCheckoutScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { cartItems } = route.params;
  const queryClient = useQueryClient();
  const { uploadedPrescriptionId, uploadedPrescriptionStatus } = usePharmacyOrderStore();

  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [notes, setNotes] = useState('');

  // Inline delivery address (no saved addresses)
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [locating, setLocating] = useState(false);

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Location permission required',
          'Allow location access to auto-fill your delivery address.',
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;

      // Reverse-geocode (best-effort; falls back to coords if unavailable).
      let resolved: Location.LocationGeocodedAddress | undefined;
      try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        resolved = results?.[0];
      } catch {
        resolved = undefined;
      }

      if (resolved) {
        // De-duplicate name vs street: reverse-geocode often returns the
        // same string in both fields.
        const parts = [resolved.name, resolved.street].filter(
          (part, idx, arr): part is string =>
            !!part && arr.indexOf(part) === idx,
        );
        const street = parts.join(', ');
        setAddressLine(
          street || `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`,
        );
        if (resolved.city || resolved.subregion) {
          setCity(resolved.city ?? resolved.subregion ?? '');
        }
        if (resolved.region) setState(resolved.region);
        if (resolved.postalCode) setPincode(resolved.postalCode);
      } else {
        // Fall back to raw coordinates so the user can still proceed.
        setAddressLine(`Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`);
      }
    } catch (err: any) {
      Alert.alert('Location error', err?.message ?? 'Could not fetch your location.');
    } finally {
      setLocating(false);
    }
  };

  const { data: partners, isLoading: loadingPartners } = useQuery<PharmacyPartner[]>({
    queryKey: ['pharmacy-partners'],
    queryFn: pharmacyService.getPartners,
  });

  const selectedPartnerId = partners?.[0]?.id ?? null;

  useEffect(() => {
    if (!loadingPartners && (!partners || partners.length === 0)) {
      Alert.alert('Pharmacy unavailable', 'No pharmacy partner is available right now.');
    }
  }, [loadingPartners, partners]);

  const { data: prescriptionOptions = [], isLoading: loadingPrescriptions } = useQuery<PrescriptionOption[]>({
    queryKey: ['patient-prescriptions'],
    queryFn: async () => {
      const res = await api.get('/consultation/patient/summaries', {
        params: { page: 1, limit: 50 },
      });
      const payload = res.data;
      const summaries: ConsultationSummaryResponse[] = Array.isArray(payload)
        ? payload
        : payload.data ?? [];

      return summaries.flatMap((summary) =>
        (summary.prescriptions ?? []).map((prescription) => ({
          id: prescription.id,
          details: prescription.details,
          fileUrl: prescription.fileUrl,
          createdAt: prescription.createdAt,
          bookingId: summary.booking?.id ?? '',
          providerName: summary.booking?.provider?.name,
          serviceCategoryName: summary.booking?.serviceCategory?.name,
        })),
      );
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
      const raw = error?.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join('\n') : (raw || 'Could not place order. Please try again.');
      Alert.alert('Order Failed', String(msg));
    },
  });

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.medicine.price * item.quantity,
    0,
  );

  const DELIVERY_FEE = calculateDeliveryFee(subtotal);
  const FREE_DELIVERY_THRESHOLD = getFreeDeliveryThreshold();
  const GST_RATE = 0.05; // 5% GST on medicines
  const gstAmount = Math.round(subtotal * GST_RATE);
  const totalAmount = subtotal + DELIVERY_FEE + gstAmount;

  const prescriptionRequired = useMemo(
    () => cartItems.some((item) => requiresPrescriptionForMedicine(item.medicine)),
    [cartItems],
  );

  const selectedPrescription = useMemo(
    () => prescriptionOptions.find((item) => item.id === selectedPrescriptionId) ?? null,
    [prescriptionOptions, selectedPrescriptionId],
  );

  const activeUploadedPrescriptionId = selectedPrescriptionId
    ? null
    : uploadedPrescriptionId;

  const prescriptionRequirementSatisfied =
    !prescriptionRequired || !!selectedPrescriptionId || !!activeUploadedPrescriptionId;

  const handlePlaceOrder = async () => {
    if (!selectedPartnerId) {
      Alert.alert('Pharmacy unavailable', 'No pharmacy partner is available right now.');
      return;
    }
    if (!addressLine.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      Alert.alert('Incomplete address', 'Please fill in all delivery address fields');
      return;
    }
    if (!prescriptionRequirementSatisfied) {
      Alert.alert('Prescription required', 'Valid prescription required for selected medicines');
      return;
    }

    try {
      // Create a saved address first, then use its ID for the order.
      // The staging API rejects inline deliveryAddress objects.
      const addrRes = await api.post(ENDPOINTS.PATIENTS.ADDRESSES, {
        label: 'Delivery',
        addressLine: addressLine.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      });
      const deliveryAddressId: string = addrRes.data.id;

      const mergedNotes = [
        `Payment Method: ${paymentMethod}`,
        notes.trim(),
      ]
        .filter((value) => value.length > 0)
        .join(' | ');

      placeOrderMutation.mutate({
        partnerId: selectedPartnerId,
        deliveryAddressId,
        bookingId: selectedPrescription?.bookingId || undefined,
        prescriptionId: selectedPrescriptionId || undefined,
        uploadedPrescriptionId: activeUploadedPrescriptionId || undefined,
        notes: mergedNotes || undefined,
        items: cartItems.map((item) => ({
          medicineCode: item.medicine.id,
          medicineName: item.medicine.name,
          quantity: item.quantity,
          unitPrice: item.medicine.price,
        })),
      });
    } catch (err: any) {
      const raw = err?.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join('\n') : (raw || 'Could not save address');
      Alert.alert('Address Error', String(msg));
    }
  };

  if (loadingPartners || loadingPrescriptions) {
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
              {requiresPrescriptionForMedicine(item.medicine) && (
                <Text style={styles.rxText}>Prescription required</Text>
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
        <View style={styles.subtotalRow}>
          <Text style={styles.feeLabel}>GST (5%)</Text>
          <Text style={styles.feeValue}>{formatCurrency(gstAmount)}</Text>
        </View>
        <View style={styles.subtotalRow}>
          <Text style={styles.feeLabel}>
            Delivery Fee{subtotal >= FREE_DELIVERY_THRESHOLD ? ' 🎉' : ''}
          </Text>
          <Text style={[styles.feeValue, DELIVERY_FEE === 0 && styles.freeText]}>
            {DELIVERY_FEE === 0 ? 'FREE' : formatCurrency(DELIVERY_FEE)}
          </Text>
        </View>
        {DELIVERY_FEE > 0 && (
          <Text style={styles.freeDeliveryHint}>
            Add {formatCurrency(FREE_DELIVERY_THRESHOLD - subtotal)} more for free delivery
          </Text>
        )}
        <View style={[styles.subtotalRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prescription Compliance</Text>
        <View style={[styles.complianceCard, prescriptionRequired && styles.complianceCardWarning]}>
          <Text style={styles.complianceTitle}>
            {prescriptionRequired ? 'Prescription required' : 'Prescription optional'}
          </Text>
          <Text style={styles.complianceText}>
            {prescriptionRequired
              ? 'Valid prescription required for selected medicines'
              : 'These medicines can be ordered without a prescription, but you may still attach one.'}
          </Text>
        </View>

        {activeUploadedPrescriptionId && (
          <View style={styles.uploadedRxCard}>
            <Text style={styles.uploadedRxTitle}>Uploaded prescription attached</Text>
            <Text style={styles.uploadedRxText}>
              Review status: {(uploadedPrescriptionStatus ?? 'PENDING_REVIEW').replace(/_/g, ' ')}
            </Text>
            <Text style={styles.uploadedRxSubtext}>
              This uploaded prescription will be used for pharmacy verification if no doctor-issued prescription is selected below.
            </Text>
          </View>
        )}

        {prescriptionOptions.length === 0 ? (
          <Text style={styles.noDataText}>
            No doctor-issued prescriptions are available in your account yet.
          </Text>
        ) : (
          prescriptionOptions.map((prescription) => {
            const isSelected = selectedPrescriptionId === prescription.id;
            return (
              <TouchableOpacity
                key={prescription.id}
                style={[styles.prescriptionCard, isSelected && styles.selectedCard]}
                onPress={() =>
                  setSelectedPrescriptionId((current) =>
                    current === prescription.id ? null : prescription.id,
                  )
                }
              >
                <View style={styles.addressInfo}>
                  <Text style={styles.addressLabel}>
                    {prescription.providerName || 'Doctor prescription'}
                  </Text>
                  <Text style={styles.addressText}>
                    {prescription.serviceCategoryName || 'Consultation'}
                    {' • '}
                    {new Date(prescription.createdAt).toLocaleDateString()}
                  </Text>
                  {prescription.details ? (
                    <Text style={styles.prescriptionDetails} numberOfLines={2}>
                      {prescription.details}
                    </Text>
                  ) : null}
                  {prescription.fileUrl ? (
                    <Text style={styles.defaultBadge}>File attached</Text>
                  ) : null}
                </View>
                <View
                  style={[styles.radioBtn, isSelected && styles.radioBtnSelected]}
                />
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        {selectedPartnerId ? (
          <Text style={styles.helperText}>
            Pharmacy partner is assigned automatically during checkout.
          </Text>
        ) : (
          <Text style={styles.noDataText}>No pharmacy partners available</Text>
        )}
        <TouchableOpacity
          style={[styles.locationBtn, locating && { opacity: 0.6 }]}
          onPress={useCurrentLocation}
          disabled={locating}
        >
          <Text style={styles.locationBtnText}>
            {locating ? 'Fetching location…' : '📍  Use Current Location'}
          </Text>
        </TouchableOpacity>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR ENTER MANUALLY</Text>
          <View style={styles.dividerLine} />
        </View>
        <TextInput
          style={styles.addressInput}
          placeholder="Address line (House/Flat, Street, Area)"
          placeholderTextColor={Colors.textMuted}
          value={addressLine}
          onChangeText={setAddressLine}
        />
        <View style={styles.addressRow}>
          <TextInput
            style={[styles.addressInput, styles.addressHalf]}
            placeholder="City"
            placeholderTextColor={Colors.textMuted}
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            style={[styles.addressInput, styles.addressHalf]}
            placeholder="State"
            placeholderTextColor={Colors.textMuted}
            value={state}
            onChangeText={setState}
          />
        </View>
        <TextInput
          style={styles.addressInput}
          placeholder="Pincode"
          placeholderTextColor={Colors.textMuted}
          value={pincode}
          onChangeText={setPincode}
          keyboardType="number-pad"
          maxLength={6}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentMethodWrap}>
          {PAYMENT_METHOD_OPTIONS.map((option) => {
            const isSelected = paymentMethod === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.paymentOption, isSelected && styles.paymentOptionSelected]}
                onPress={() => setPaymentMethod(option.value)}
              >
                <Text
                  style={[
                    styles.paymentOptionText,
                    isSelected && styles.paymentOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.helperText}>Selected: {paymentMethod}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add delivery or medicine handling notes (optional)"
          placeholderTextColor={Colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.placeOrderArea}>
        <Button
          title={placeOrderMutation.isPending ? 'Placing Order...' : `Place Order - ${formatCurrency(totalAmount)}`}
          onPress={handlePlaceOrder}
          loading={placeOrderMutation.isPending}
          disabled={!selectedPartnerId || !addressLine.trim() || !city.trim() || !state.trim() || !pincode.trim() || !prescriptionRequirementSatisfied}
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
  helperText: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
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
  rxText: { fontSize: 12, color: Colors.error, fontWeight: '600', marginTop: 4 },
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
  feeLabel: { fontSize: 14, color: Colors.textMuted },
  feeValue: { fontSize: 14, color: Colors.textMuted },
  freeText: { color: Colors.success ?? '#16a34a', fontWeight: '700' },
  freeDeliveryHint: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 2,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
    paddingTop: 10,
  },
  totalLabel: { fontSize: 16, fontWeight: '800', color: Colors.text },
  totalValue: { fontSize: 18, fontWeight: '900', color: Colors.primary },
  complianceCard: {
    borderRadius: 10,
    backgroundColor: Colors.background,
    padding: 12,
    marginBottom: 12,
  },
  complianceCardWarning: {
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  uploadedRxCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    padding: 12,
    marginBottom: 12,
  },
  uploadedRxTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  uploadedRxText: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 4 },
  uploadedRxSubtext: { fontSize: 12, color: Colors.textMuted, marginTop: 6, lineHeight: 18 },
  complianceTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  complianceText: { fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
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
  addressInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.background,
    marginBottom: 10,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addressHalf: {
    flex: 1,
  },
  addressInfo: { flex: 1 },
  addressLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  addressText: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  prescriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  prescriptionDetails: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  defaultBadge: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  paymentMethodWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paymentOption: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
  },
  paymentOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  paymentOptionText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  paymentOptionTextSelected: {
    color: Colors.primary,
  },
  notesInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 88,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.background,
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
  locationBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  locationBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
