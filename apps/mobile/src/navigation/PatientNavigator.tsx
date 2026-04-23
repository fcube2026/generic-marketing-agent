import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { HomeScreen } from '../screens/patient/HomeScreen';
import { SelectServiceScreen } from '../screens/patient/SelectServiceScreen';
import { ProviderListScreen } from '../screens/patient/ProviderListScreen';
import { RecommendationScreen } from '../screens/patient/RecommendationScreen';
import { BookingConfirmScreen } from '../screens/patient/BookingConfirmScreen';
import { PaymentScreen } from '../screens/patient/PaymentScreen';
import { TrackingScreen } from '../screens/patient/TrackingScreen';
import { ConsultationSummaryScreen } from '../screens/patient/ConsultationSummaryScreen';
import { VideoConsultationScreen } from '../screens/patient/VideoConsultationScreen';
import { HistoryScreen } from '../screens/patient/HistoryScreen';
import { ProfileScreen } from '../screens/patient/ProfileScreen';
import { OnboardingScreen } from '../screens/patient/OnboardingScreen';
import { ClinicalIntakeScreen } from '../screens/patient/ClinicalIntakeScreen';
import { ConsentScreen } from '../screens/patient/ConsentScreen';
import { VerificationStatusScreen } from '../screens/patient/VerificationStatusScreen';
import { PatientKycScreen } from '../screens/patient/PatientKycScreen';
import { PatientKycPersonalScreen } from '../screens/patient/kyc/PatientKycPersonalScreen';
import { PatientKycAddressScreen } from '../screens/patient/kyc/PatientKycAddressScreen';
import { PatientKycIdUploadScreen } from '../screens/patient/kyc/PatientKycIdUploadScreen';
import { PatientKycAadhaarScreen } from '../screens/patient/kyc/PatientKycAadhaarScreen';
import { PatientKycFaceCaptureScreen } from '../screens/patient/kyc/PatientKycFaceCaptureScreen';
import { PatientKycGuardianScreen } from '../screens/patient/kyc/PatientKycGuardianScreen';
import { PatientKycReviewScreen } from '../screens/patient/kyc/PatientKycReviewScreen';
import { MedicineSearchScreen } from '../screens/pharmacy/MedicineSearchScreen';
import { PrescriptionOrderScreen } from '../screens/pharmacy/PrescriptionOrderScreen';
import { PharmacyCheckoutScreen } from '../screens/pharmacy/PharmacyCheckoutScreen';
import { PharmacyOrdersScreen } from '../screens/pharmacy/PharmacyOrdersScreen';
import { PharmacyOrderDetailScreen } from '../screens/pharmacy/PharmacyOrderDetailScreen';
import { OrderTrackingScreen } from '../screens/pharmacy/OrderTrackingScreen';
import { VideoLobbyScreen } from '../screens/common/VideoLobbyScreen';
import { VideoCallScreen } from '../screens/common/VideoCallScreen';
import { Colors } from '../constants/colors';
import { ServiceCategory, MedicineResult } from '../types';
import type { VideoCallParams } from '../screens/common/VideoCallScreen';

export type PatientStackParamList = {
  Tabs: undefined;
  Onboarding: undefined;
  PatientKyc: undefined;
  PatientKycPersonal: undefined;
  PatientKycAddress: undefined;
  PatientKycIdUpload: undefined;
  PatientKycAadhaarUpload: undefined;
  PatientKycFaceCapture: undefined;
  PatientKycGuardian: undefined;
  PatientKycReview: undefined;
  SelectService: { category: ServiceCategory };
  ProviderList: { categoryId?: string; categorySlug?: string; lat?: number; lng?: number; mode?: 'HOME_VISIT' | 'DOCTOR_PLACE' | 'VIDEO_CONSULTATION' };
  Recommendation: { categorySlug: string; lat: number; lng: number };
  BookingConfirm: { providerId: string; mode: 'HOME_VISIT' | 'DOCTOR_PLACE' | 'VIDEO_CONSULTATION'; fee: number };
  ClinicalIntake: { bookingId: string };
  Consent: { bookingId: string };
  VerificationStatus: { bookingId: string };
  Payment: { bookingId: string; amount: number };
  Tracking: { bookingId: string };
  ConsultationSummary: { bookingId: string };
  VideoLobby: { bookingId: string };
  VideoConsultation: { bookingId: string };
  VideoCall: VideoCallParams;
  MedicineSearch: undefined;
  PrescriptionOrder: { bookingId?: string; prescriptionUrl?: string } | undefined;
  PharmacyCheckout: { cartItems: { medicine: MedicineResult; quantity: number }[] };
  PharmacyOrders: undefined;
  PharmacyOrderDetail: { orderId: string };
  OrderTracking: { orderId: string };
};

const Stack = createNativeStackNavigator<PatientStackParamList>();
const Tab = createBottomTabNavigator();

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.textMuted,
      tabBarStyle: { height: 60, paddingBottom: 8 },
      tabBarIcon: ({ focused }) => {
        const icons: Record<string, string> = {
          Home: '🏠',
          History: '📋',
          Profile: '👤',
        };
        return <Text style={{ fontSize: focused ? 24 : 20 }}>{icons[route.name] || '•'}</Text>;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="History" component={HistoryScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export const PatientNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerBackTitle: 'Back' }}>
    <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ title: 'Complete Profile' }} />
    <Stack.Screen name="PatientKyc" component={PatientKycScreen} options={{ title: 'Identity Verification' }} />
    <Stack.Screen name="PatientKycPersonal" component={PatientKycPersonalScreen} options={{ title: 'Your Details' }} />
    <Stack.Screen name="PatientKycAddress" component={PatientKycAddressScreen} options={{ title: 'Your Address' }} />
    <Stack.Screen name="PatientKycIdUpload" component={PatientKycIdUploadScreen} options={{ title: 'Upload Aadhaar (legacy)' }} />
    <Stack.Screen name="PatientKycAadhaarUpload" component={PatientKycAadhaarScreen} options={{ title: 'Upload Aadhaar' }} />
    <Stack.Screen name="PatientKycFaceCapture" component={PatientKycFaceCaptureScreen} options={{ title: 'Face Verification' }} />
    <Stack.Screen name="PatientKycGuardian" component={PatientKycGuardianScreen} options={{ title: 'Guardian Details' }} />
    <Stack.Screen name="PatientKycReview" component={PatientKycReviewScreen} options={{ title: 'Review & Submit' }} />
    <Stack.Screen name="SelectService" component={SelectServiceScreen} options={{ title: 'Book Service' }} />
    <Stack.Screen name="ProviderList" component={ProviderListScreen} options={{ title: 'Nearby Providers' }} />
    <Stack.Screen name="Recommendation" component={RecommendationScreen} options={{ title: 'Recommendation' }} />
    <Stack.Screen name="BookingConfirm" component={BookingConfirmScreen} options={{ title: 'Confirm Booking' }} />
    <Stack.Screen name="ClinicalIntake" component={ClinicalIntakeScreen} options={{ title: 'Health Information' }} />
    <Stack.Screen name="Consent" component={ConsentScreen} options={{ title: 'Informed Consent' }} />
    <Stack.Screen name="VerificationStatus" component={VerificationStatusScreen} options={{ title: 'Verification' }} />
    <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
    <Stack.Screen name="Tracking" component={TrackingScreen} options={{ title: 'Track Provider' }} />
    <Stack.Screen name="ConsultationSummary" component={ConsultationSummaryScreen} options={{ title: 'Consultation Summary' }} />
    <Stack.Screen name="VideoLobby" component={VideoLobbyScreen} options={{ title: 'Video Lobby', headerStyle: { backgroundColor: '#0F172A' }, headerTintColor: Colors.white }} />
    <Stack.Screen name="VideoConsultation" component={VideoConsultationScreen} options={{ title: 'Video Consultation' }} />
    <Stack.Screen name="VideoCall" component={VideoCallScreen} options={{ headerShown: false }} />
    <Stack.Screen name="MedicineSearch" component={MedicineSearchScreen} options={{ title: 'Order Medicines' }} />
    <Stack.Screen name="PrescriptionOrder" component={PrescriptionOrderScreen} options={{ title: 'Prescription Order' }} />
    <Stack.Screen name="PharmacyCheckout" component={PharmacyCheckoutScreen} options={{ title: 'Checkout' }} />
    <Stack.Screen name="PharmacyOrders" component={PharmacyOrdersScreen} options={{ title: 'My Orders' }} />
    <Stack.Screen name="PharmacyOrderDetail" component={PharmacyOrderDetailScreen} options={{ title: 'Order Details' }} />
    <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ title: 'Track Order' }} />
  </Stack.Navigator>
);
