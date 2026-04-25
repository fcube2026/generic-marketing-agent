import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { pharmacyService } from '../../services/pharmacyService';
import { MedicineResult } from '../../types';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { formatCurrency } from '../../utils/format';
import { requiresPrescriptionForMedicine } from '../../utils/pharmacy';
import { usePharmacyCartStore } from '../../store/pharmacyCartStore';

type Nav = NativeStackNavigationProp<PatientStackParamList>;

const RECENT_SEARCHES_KEY = 'pharmacy_recent_searches';
const MAX_RECENT = 5;
const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------
const SkeletonRow: React.FC = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => {
      anim.stop();
      anim.reset();
    };
  }, [opacity]);
  return (
    <Animated.View style={[styles.skeletonRow, { opacity }]}>
      <View style={styles.skeletonInfo}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSub} />
      </View>
      <View style={styles.skeletonPrice} />
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export const MedicineSearchScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [pincode, setPincode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const items = usePharmacyCartStore((state) => state.items);
  const addItem = usePharmacyCartStore((state) => state.addItem);
  const decreaseItem = usePharmacyCartStore((state) => state.decreaseItem);

  // Pagination
  const [page, setPage] = useState(1);
  const [allResults, setAllResults] = useState<MedicineResult[]>([]);
  const [fullResultCache, setFullResultCache] = useState<MedicineResult[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Recent searches
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Loading / error state (managed manually for pagination)
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load recent searches on mount
  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      .then((raw) => {
        if (raw) setRecentSearches(JSON.parse(raw) as string[]);
      })
      .catch(() => {});
  }, []);

  const saveRecentSearch = useCallback(async (term: string) => {
    try {
      const prev = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      const list: string[] = prev ? JSON.parse(prev) : [];
      const updated = [term, ...list.filter((s) => s !== term)].slice(0, MAX_RECENT);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch {
      // non-critical
    }
  }, []);

  // Fetch first page of results
  const fetchResults = useCallback(
    async (term: string, pc: string) => {
      setIsLoading(true);
      setIsError(false);
      setPage(1);
      setHasMore(true);
      setAllResults([]);
      setFullResultCache([]);
      try {
        const results = await pharmacyService.searchMedicines(term, pc || undefined);
        setFullResultCache(results);
        setAllResults(results.slice(0, PAGE_SIZE));
        setHasMore(results.length > PAGE_SIZE);
      } catch (err) {
        setIsError(true);
        setErrorMessage(
          axios.isAxiosError(err) && err.response?.status === 401
            ? 'Session expired. Please login again.'
            : 'Something went wrong. Please try again.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Load next page from cached full results
  const fetchNextPage = useCallback(() => {
    if (!hasMore || loadingMore || isLoading) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const sliced = fullResultCache.slice(0, nextPage * PAGE_SIZE);
    setAllResults(sliced);
    setPage(nextPage);
    setHasMore(sliced.length < fullResultCache.length);
    setLoadingMore(false);
  }, [hasMore, loadingMore, isLoading, page, fullResultCache]);

  // ---- Debounced autocomplete -------
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchTerm('');
      setShowSuggestions(false);
      return;
    }
    const handle = setTimeout(() => {
      setSearchTerm(trimmed);
      setShowSuggestions(true);
      fetchResults(trimmed, pincode);
      saveRecentSearch(trimmed);
    }, 300);
    return () => clearTimeout(handle);
  }, [query, pincode, fetchResults, saveRecentSearch]);

  const handleSearchSubmit = () => {
    if (query.trim().length < 2) {
      Alert.alert('Please enter at least 2 characters to search');
      return;
    }
    const trimmed = query.trim();
    setSearchTerm(trimmed);
    setShowSuggestions(true);
    fetchResults(trimmed, pincode);
    saveRecentSearch(trimmed);
  };

  const handleRecentSearchPress = (term: string) => {
    setQuery(term);
    setSearchTerm(term);
    setShowSuggestions(true);
    fetchResults(term, pincode);
  };

  const addToCart = (medicine: MedicineResult) => {
    addItem(medicine, 1);
  };

  const handleSuggestionPress = (medicine: MedicineResult) => {
    // Navigate to detail screen; add-to-cart lives there
    navigation.navigate('MedicineDetail', { medicine, pincode: pincode || undefined });
  };

  const cartItems = Object.values(items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartList = cartItems.map((item) => item.medicine);

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('Cart is empty', 'Please add medicines to proceed.');
      return;
    }
    navigation.navigate('PharmacyCheckout', { cartItems });
  };

  const showRecentSearches =
    !showSuggestions && query.trim().length === 0 && recentSearches.length > 0 && cartList.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.searchArea}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search medicines..."
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
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
      </View>

      {/* Recent searches */}
      {showRecentSearches && (
        <View style={styles.recentWrap}>
          <Text style={styles.recentTitle}>Recent Searches</Text>
          {recentSearches.map((term) => (
            <TouchableOpacity
              key={term}
              style={styles.recentRow}
              onPress={() => handleRecentSearchPress(term)}
            >
              <Text style={styles.recentIcon}>🕐</Text>
              <Text style={styles.recentText}>{term}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Autocomplete suggestion dropdown */}
      {showSuggestions && searchTerm.length >= 2 && (
        <View style={styles.suggestionsWrap}>
          {isLoading && (
            <View style={styles.suggestionLoading}>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </View>
          )}
          {!isLoading && isError && (
            <View style={styles.suggestionEmpty}>
              <Text style={styles.suggestionEmptyText}>{errorMessage}</Text>
              <Button
                title="Retry"
                onPress={() => fetchResults(searchTerm, pincode)}
                style={styles.retryBtn}
                fullWidth={false}
              />
            </View>
          )}
          {!isLoading && !isError && allResults.length === 0 && (
            <View style={styles.suggestionEmpty}>
              <Text style={styles.suggestionEmptyText}>No matches for "{searchTerm}"</Text>
            </View>
          )}
          {!isLoading && !isError && allResults.length > 0 && (
            <FlatList
              data={allResults}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={styles.suggestionList}
              onEndReached={fetchNextPage}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.loadingMoreWrap}>
                    <SkeletonRow />
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionRow}
                  onPress={() => handleSuggestionPress(item)}
                >
                  <View style={styles.suggestionInfo}>
                    <Text style={styles.suggestionName}>{item.name}</Text>
                    {item.manufacturer && (
                      <Text style={styles.suggestionMfg}>{item.manufacturer}</Text>
                    )}
                  </View>
                  <View style={styles.suggestionMeta}>
                    <Text style={styles.suggestionPrice}>
                      {formatCurrency(item.price)}
                    </Text>
                    {requiresPrescriptionForMedicine(item) && (
                      <Text style={styles.rxBadge}>Rx</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* Idle state */}
      {!showSuggestions && !showRecentSearches && cartList.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Search for medicines</Text>
          <Text style={styles.emptySubtitle}>
            Start typing a medicine name to see suggestions
          </Text>
        </View>
      )}

      {/* Cart list */}
      <FlatList
        data={cartList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          cartList.length > 0 ? (
            <Text style={styles.cartHeader}>In your cart</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const cartItem = items[item.id];
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
                      onPress={() => decreaseItem(item.id)}
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
  recentWrap: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  recentTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  recentIcon: { fontSize: 14, marginRight: 8 },
  recentText: { fontSize: 14, color: Colors.text },
  suggestionsWrap: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 320,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  suggestionList: { maxHeight: 320 },
  suggestionLoading: { padding: 8 },
  suggestionEmpty: { padding: 16, alignItems: 'center' },
  suggestionEmptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  loadingMoreWrap: { paddingVertical: 4 },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionInfo: { flex: 1 },
  suggestionName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  suggestionMfg: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  suggestionMeta: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  suggestionPrice: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  // Skeleton
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  skeletonInfo: { flex: 1 },
  skeletonTitle: { height: 12, borderRadius: 6, backgroundColor: Colors.border, width: '60%', marginBottom: 6 },
  skeletonSub: { height: 10, borderRadius: 5, backgroundColor: Colors.border, width: '40%' },
  skeletonPrice: { height: 14, borderRadius: 7, backgroundColor: Colors.border, width: 48 },
  cartHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
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

