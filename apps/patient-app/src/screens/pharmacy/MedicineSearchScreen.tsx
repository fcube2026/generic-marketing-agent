import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { pharmacyService } from '../../services/pharmacyService';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { MedicineResult, SelectedMedicine } from '../../types';
import { formatCurrency } from '../../utils/format';

type Nav = NativeStackNavigationProp<PatientStackParamList>;

export const MedicineSearchScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MedicineResult[]>([]);
  const [selected, setSelected] = useState<SelectedMedicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await pharmacyService.searchMedicines(trimmed);
      setResults(data);
    } catch {
      Alert.alert('Error', 'Failed to search medicines. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(() => {
    if (query.trim().length < 2) {
      Alert.alert('Search', 'Please enter at least 2 characters.');
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    doSearch(query);
  }, [query, doSearch]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (query.trim().length >= 2) {
      debounceTimer.current = setTimeout(() => doSearch(query), 500);
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, doSearch]);

  const handleAdd = (medicine: MedicineResult) => {
    setSelected((prev) => {
      const exists = prev.find((m) => m.id === medicine.id);
      if (exists) {
        return prev.map((m) =>
          m.id === medicine.id ? { ...m, quantity: m.quantity + 1 } : m,
        );
      }
      return [...prev, { ...medicine, quantity: 1 }];
    });
  };

  const handleRemove = (medicineId: string) => {
    setSelected((prev) => {
      const exists = prev.find((m) => m.id === medicineId);
      if (!exists) return prev;
      if (exists.quantity === 1) return prev.filter((m) => m.id !== medicineId);
      return prev.map((m) =>
        m.id === medicineId ? { ...m, quantity: m.quantity - 1 } : m,
      );
    });
  };

  const getQuantity = (medicineId: string): number =>
    selected.find((m) => m.id === medicineId)?.quantity ?? 0;

  const handleProceed = () => {
    if (selected.length === 0) {
      Alert.alert('Selection', 'Please select at least one medicine.');
      return;
    }
    navigation.navigate('PharmacyCheckout', { selectedMedicines: selected });
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.inputWrapper}>
          <Input
            placeholder="Search medicines..."
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            containerStyle={styles.inputContainer}
          />
        </View>
        <Button
          title="Search"
          onPress={handleSearch}
          loading={loading}
          fullWidth={false}
          style={styles.searchButton}
        />
      </View>

      {loading ? (
        <LoadingSpinner message="Searching medicines..." />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            searched ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💊</Text>
                <Text style={styles.emptyText}>No medicines found</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>Search for medicines above</Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            const qty = getQuantity(item.id);
            return (
              <View style={styles.card}>
                <View style={styles.cardLeft}>
                  <Text style={styles.medicineName}>{item.name}</Text>
                  {item.manufacturer && (
                    <Text style={styles.manufacturer}>{item.manufacturer}</Text>
                  )}
                  <View style={styles.tagsRow}>
                    <Text style={styles.price}>{formatCurrency(item.price)}</Text>
                    {item.unit && (
                      <Text style={styles.unit}>{item.unit}</Text>
                    )}
                    {item.requiresPrescription && (
                      <Text style={styles.rxBadge}>Rx</Text>
                    )}
                  </View>
                </View>
                <View style={styles.qtyControl}>
                  {qty > 0 ? (
                    <>
                      <TouchableOpacity
                        style={styles.qtyButton}
                        onPress={() => handleRemove(item.id)}
                      >
                        <Text style={styles.qtyButtonText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{qty}</Text>
                      <TouchableOpacity
                        style={styles.qtyButton}
                        onPress={() => handleAdd(item)}
                      >
                        <Text style={styles.qtyButtonText}>+</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => handleAdd(item)}
                    >
                      <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {selected.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {selected.length} item{selected.length > 1 ? 's' : ''} selected
          </Text>
          <Button
            title="Proceed to Checkout →"
            onPress={handleProceed}
            fullWidth={false}
            style={styles.proceedButton}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    gap: 8,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  inputWrapper: { flex: 1 },
  inputContainer: { marginBottom: 0 },
  searchButton: { paddingHorizontal: 16, minWidth: 80 },
  list: { padding: 16, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  medicineName: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  manufacturer: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  unit: { fontSize: 12, color: Colors.textMuted },
  rxBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.warning,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  qtyText: { fontSize: 16, fontWeight: '700', color: Colors.text, minWidth: 20, textAlign: 'center' },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  addButtonText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  proceedButton: { paddingHorizontal: 20 },
});
