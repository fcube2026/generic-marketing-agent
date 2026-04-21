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
import { VideoConsultationScreen } from '../screens/provider/VideoConsultationScreen';
import { VideoLobbyScreen } from '../screens/common/VideoLobbyScreen';
import { VideoCallScreen } from '../screens/common/VideoCallScreen';
import { Colors } from '../constants/colors';
import type { VideoCallParams } from '../screens/common/VideoCallScreen';

export type ProviderStackParamList = {
  Tabs: undefined;
  Onboarding: undefined;
  Availability: undefined;
  IncomingBooking: undefined;
  BookingDetail: { bookingId: string };
  VideoLobby: { bookingId: string };
  VideoConsultation: { bookingId: string };
  VideoCall: VideoCallParams;
  ConsultationForm: { bookingId: string };
  Kyc: undefined;
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
    <Stack.Screen name="VideoLobby" component={VideoLobbyScreen} options={{ title: 'Video Lobby', headerStyle: { backgroundColor: '#0F172A' }, headerTintColor: Colors.white }} />
    <Stack.Screen name="VideoConsultation" component={VideoConsultationScreen} options={{ title: 'Video Consultation' }} />
    <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ConsultationForm" component={ConsultationFormScreen} options={{ title: 'Consultation Summary' }} />
    <Stack.Screen name="Kyc" component={KycScreen} options={{ title: 'KYC Verification' }} />
  </Stack.Navigator>
);
