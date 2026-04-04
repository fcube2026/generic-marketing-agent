import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Role } from '../types';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { RoleSelectScreen } from '../screens/auth/RoleSelectScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';

export type AuthStackParamList = {
  Splash: undefined;
  RoleSelect: undefined;
  Login: { role: Role };
  Otp: { phone: string; role: Role; devOtp?: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Otp" component={OtpScreen} />
  </Stack.Navigator>
);
