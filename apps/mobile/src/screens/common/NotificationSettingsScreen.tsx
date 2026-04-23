import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NotificationPreference,
  getPreferences,
  updatePreferences,
} from '../../services/notifications';

const REFILL_REMINDERS_KEY = '@curex24/refill_reminders_enabled';

export function NotificationSettingsScreen() {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refillReminders, setRefillReminders] = useState(true);

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const [prefs, storedRefill] = await Promise.all([
        getPreferences(),
        AsyncStorage.getItem(REFILL_REMINDERS_KEY),
      ]);
      setPreferences(prefs);
      if (storedRefill !== null) {
        setRefillReminders(storedRefill === 'true');
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      Alert.alert('Error', 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefillToggle = useCallback(async (value: boolean) => {
    setRefillReminders(value);
    try {
      await AsyncStorage.setItem(REFILL_REMINDERS_KEY, String(value));
    } catch (error) {
      console.error('Failed to save refill reminders preference:', error);
      setRefillReminders(!value);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleToggle = async (key: keyof NotificationPreference, value: boolean) => {
    if (!preferences) return;

    const updatedPrefs = { ...preferences, [key]: value };
    setPreferences(updatedPrefs);

    try {
      setSaving(true);
      await updatePreferences({ [key]: value });
    } catch (error) {
      console.error('Failed to update preference:', error);
      // Revert on error
      setPreferences(preferences);
      Alert.alert('Error', 'Failed to update notification settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D9488" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!preferences) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load settings</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPreferences}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Notification Channels */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Channels</Text>
            <Text style={styles.sectionDescription}>
              Choose how you want to receive notifications
            </Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive alerts on your device
                </Text>
              </View>
              <Switch
                value={preferences.pushEnabled}
                onValueChange={(value) => handleToggle('pushEnabled', value)}
                trackColor={{ false: '#E5E7EB', true: '#5EEAD4' }}
                thumbColor={preferences.pushEnabled ? '#0D9488' : '#9CA3AF'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>SMS Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive text messages for important updates
                </Text>
              </View>
              <Switch
                value={preferences.smsEnabled}
                onValueChange={(value) => handleToggle('smsEnabled', value)}
                trackColor={{ false: '#E5E7EB', true: '#5EEAD4' }}
                thumbColor={preferences.smsEnabled ? '#0D9488' : '#9CA3AF'}
              />
            </View>
          </View>

          {/* Notification Types */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Types</Text>
            <Text style={styles.sectionDescription}>
              Choose which types of notifications you want to receive
            </Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Booking Updates</Text>
                <Text style={styles.settingDescription}>
                  New requests, acceptances, status changes
                </Text>
              </View>
              <Switch
                value={preferences.bookingUpdates}
                onValueChange={(value) => handleToggle('bookingUpdates', value)}
                trackColor={{ false: '#E5E7EB', true: '#5EEAD4' }}
                thumbColor={preferences.bookingUpdates ? '#0D9488' : '#9CA3AF'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Payment Updates</Text>
                <Text style={styles.settingDescription}>
                  Payment confirmations, refunds, payouts
                </Text>
              </View>
              <Switch
                value={preferences.paymentUpdates}
                onValueChange={(value) => handleToggle('paymentUpdates', value)}
                trackColor={{ false: '#E5E7EB', true: '#5EEAD4' }}
                thumbColor={preferences.paymentUpdates ? '#0D9488' : '#9CA3AF'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Appointment Reminders</Text>
                <Text style={styles.settingDescription}>
                  Reminders before scheduled appointments
                </Text>
              </View>
              <Switch
                value={preferences.reminderEnabled}
                onValueChange={(value) => handleToggle('reminderEnabled', value)}
                trackColor={{ false: '#E5E7EB', true: '#5EEAD4' }}
                thumbColor={preferences.reminderEnabled ? '#0D9488' : '#9CA3AF'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Marketing & Promotions</Text>
                <Text style={styles.settingDescription}>
                  Special offers and announcements
                </Text>
              </View>
              <Switch
                value={preferences.marketingEnabled}
                onValueChange={(value) => handleToggle('marketingEnabled', value)}
                trackColor={{ false: '#E5E7EB', true: '#5EEAD4' }}
                thumbColor={preferences.marketingEnabled ? '#0D9488' : '#9CA3AF'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Refill Reminders</Text>
                <Text style={styles.settingDescription}>
                  Reminders to reorder medicines when they may be running low
                </Text>
              </View>
              <Switch
                value={refillReminders}
                onValueChange={handleRefillToggle}
                trackColor={{ false: '#E5E7EB', true: '#5EEAD4' }}
                thumbColor={refillReminders ? '#0D9488' : '#9CA3AF'}
              />
            </View>
          </View>

          {/* Info Note */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Critical notifications about active bookings and account security will
              always be sent regardless of your preferences.
            </Text>
          </View>

          {saving && (
            <View style={styles.savingIndicator}>
              <ActivityIndicator size="small" color="#0D9488" />
              <Text style={styles.savingText}>Saving...</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoBox: {
    backgroundColor: '#F0FDFA',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0D9488',
  },
  infoText: {
    fontSize: 13,
    color: '#0F766E',
    lineHeight: 20,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 8,
  },
  savingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
});

export default NotificationSettingsScreen;
