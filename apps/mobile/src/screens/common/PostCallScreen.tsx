import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { ProviderStackParamList } from '../../navigation/ProviderNavigator';
import { bookingService } from '../../services/bookingService';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type CombinedParamList = PatientStackParamList & ProviderStackParamList;
type Nav = NativeStackNavigationProp<CombinedParamList>;
type Route = RouteProp<CombinedParamList, 'PostCall'>;

export const PostCallScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { bookingId, durationMinutes, isProvider } = route.params;
  const [rating, setRating] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleRate = (score: number) => {
    setRating(score);
  };

  const handleFinish = async () => {
    if (rating > 0) {
      await bookingService.submitRating(bookingId, rating).catch(() => undefined);
    }
    
    if (isProvider) {
      navigation.navigate('ConsultationForm', { bookingId });
    } else {
      navigation.navigate('Tabs', { screen: 'Home' });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.iconContainer}>
          <Text style={styles.checkIcon}>✨</Text>
        </View>

        <Text style={styles.title}>Consultation Finished</Text>
        <Text style={styles.subtitle}>Thank you for using Curex24.</Text>

        <Card style={styles.summaryCard}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>{durationMinutes} mins</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Type</Text>
              <Text style={styles.statValue}>Video</Text>
            </View>
          </View>
        </Card>

        <View style={styles.ratingSection}>
          <Text style={styles.ratingTitle}>How was the call quality?</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRate(star)}
                activeOpacity={0.7}
              >
                <Text style={[styles.star, star <= rating && styles.starActive]}>
                  {star <= rating ? '⭐' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title={isProvider ? "Write Consultation Summary" : "Return to Home"}
            onPress={handleFinish}
          />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, alignItems: 'center', padding: 24, justifyContent: 'center' },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkIcon: { fontSize: 48 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: Colors.textMuted, marginBottom: 32 },
  summaryCard: { width: '100%', padding: 20, marginBottom: 40 },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: Colors.text },
  divider: { width: 1, height: 40, backgroundColor: Colors.border },
  ratingSection: { alignItems: 'center', marginBottom: 60 },
  ratingTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 16 },
  stars: { flexDirection: 'row', gap: 12 },
  star: { fontSize: 32, color: Colors.border },
  starActive: { color: Colors.primary },
  footer: { width: '100%' },
});
