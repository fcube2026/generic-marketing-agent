import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import api from '../../services/api';

interface Address {
  id: string;
  label: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

export const AddressListScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<PatientStackParamList>>();
  const queryClient = useQueryClient();

  const {
    data: addresses,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['patient-addresses'],
    queryFn: async () => {
      const res = await api.get('/patients/me/addresses');
      return res.data as Address[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (addressId: string) => {
      await api.delete(`/patients/me/addresses/${addressId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-addresses'] });
    },
  });

  const handleDelete = (address: Address) => {
    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete "${address.label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(address.id),
        },
      ],
    );
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <View style={styles.container}>
      <FlatList
        data={addresses || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyTitle}>No addresses saved</Text>
            <Text style={styles.emptyText}>
              Add your first address to get started
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{item.label}</Text>
                {item.isDefault && (
                  <Text style={styles.defaultBadge}>Default</Text>
                )}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('AddEditAddress', { address: item })
                  }
                  style={styles.actionButton}
                >
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  style={styles.actionButton}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.addressLine}>{item.addressLine}</Text>
            <Text style={styles.cityState}>
              {item.city}, {item.state} - {item.pincode}
            </Text>
            {item.lat != null && item.lng != null && (
              <Text style={styles.coords}>
                📍 {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
              </Text>
            )}
          </View>
        )}
        refreshing={isLoading}
        onRefresh={refetch}
      />
      <View style={styles.footer}>
        <Button
          title="Add New Address"
          onPress={() => navigation.navigate('AddEditAddress', {})}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 16, fontWeight: '700', color: Colors.text },
  defaultBadge: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  actions: { flexDirection: 'row', gap: 12 },
  actionButton: { padding: 4 },
  editText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  deleteText: { fontSize: 14, color: Colors.error, fontWeight: '600' },
  addressLine: { fontSize: 14, color: Colors.text, marginBottom: 4 },
  cityState: { fontSize: 13, color: Colors.textMuted },
  coords: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});
