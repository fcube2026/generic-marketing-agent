import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { HomeScreen } from '../screens/provider/HomeScreen';
import { OnboardingScreen } from '../screens/provider/OnboardingScreen';
import { AvailabilityScreen } from '../screens/provider/AvailabilityScreen';
import { IncomingBookingScreen } from '../screens/provider/IncomingBookingScreen';
import { BookingDetailScreen } from '../screens/provider/BookingDetailScreen';
import { ConsultationFormScreen } from '../screens/provider/ConsultationFormScreen';
import { KycScreen } from '../screens/provider/KycScreen';
import { HistoryScreen } from '../screens/provider/HistoryScreen';
import { EarningsScreen } from '../screens/provider/EarningsScreen';
import { ProfileScreen } from '../screens/provider/ProfileScreen';
import { SafetyChecklistScreen } from '../screens/provider/SafetyChecklistScreen';
import { VisitOtpScreen } from '../screens/provider/VisitOtpScreen';
import { VideoConsultationsScreen } from '../screens/provider/VideoConsultationsScreen';
import { Colors } from '../constants/colors';
import { VideoLobbyScreen } from '../screens/common/VideoLobbyScreen';

export type ProviderStackParamList = {
  Tabs: undefined;
  Onboarding: undefined;
  Availability: undefined;
  IncomingBooking: undefined;
  BookingDetail: { bookingId: string };
  SafetyChecklist: { bookingId: string };
  VisitOtp: { bookingId: string };
  ConsultationForm: { bookingId: string };
  Kyc: undefined;
  VideoConsultations: undefined;
  VideoLobby: { bookingId: string };
};

const Stack = createNativeStackNavigator<ProviderStackParamList>();
const Tab = createBottomTabNavigator();

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.textMuted,
      tabBarStyle: { height: 60, paddingBottom: 8 },
      tabBarIcon: ({ focused }) => {
        const icons: Record<string, string> = { Home: '🏠', History: '📋', Earnings: '💰', Profile: '👤' };
        return <Text style={{ fontSize: focused ? 24 : 20 }}>{icons[route.name] || '•'}</Text>;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="History" component={HistoryScreen} />
    <Tab.Screen name="Earnings" component={EarningsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export const ProviderNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerBackTitle: 'Back' }}>
    <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ title: 'Provider Setup' }} />
    <Stack.Screen name="Availability" component={AvailabilityScreen} options={{ title: 'Availability' }} />
    <Stack.Screen name="IncomingBooking" component={IncomingBookingScreen} options={{ title: 'New Booking' }} />
    <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="SafetyChecklist" component={SafetyChecklistScreen} options={{ title: 'Safety Checklist' }} />
    <Stack.Screen name="VisitOtp" component={VisitOtpScreen} options={{ title: 'Visit Verification' }} />
    <Stack.Screen name="ConsultationForm" component={ConsultationFormScreen} options={{ title: 'Consultation Summary' }} />
    <Stack.Screen name="Kyc" component={KycScreen} options={{ title: 'KYC Verification' }} />
    <Stack.Screen name="VideoConsultations" component={VideoConsultationsScreen} options={{ title: 'Video Consultations' }} />
    <Stack.Screen name="VideoLobby" component={VideoLobbyScreen} options={{ title: 'Video Consultation' }} />
  </Stack.Navigator>
);
