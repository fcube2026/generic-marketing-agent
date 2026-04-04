import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ServiceCategory } from '../../types';
import { Colors } from '../../constants/colors';

const SERVICE_ICONS: Record<string, string> = {
  doctor: '🩺',
  physiotherapy: '🦴',
  nursing: '💉',
  'speech-therapy': '🗣️',
  'occupational-therapy': '🤲',
  'mental-health': '🧠',
  dentistry: '🦷',
  ophthalmology: '👁️',
  dermatology: '🧴',
  pediatrics: '👶',
};

interface ServiceCategoryCardProps {
  category: ServiceCategory;
  onPress: (category: ServiceCategory) => void;
}

export const ServiceCategoryCard: React.FC<ServiceCategoryCardProps> = ({
  category,
  onPress,
}) => (
  <TouchableOpacity style={styles.card} onPress={() => onPress(category)} activeOpacity={0.8}>
    <Text style={styles.icon}>{SERVICE_ICONS[category.slug] || '🏥'}</Text>
    <Text style={styles.name} numberOfLines={2}>{category.name}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  icon: { fontSize: 32, marginBottom: 8 },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
});
