import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';

// ── AsyncStorage (required by services/api.ts) ────────────────────────────────
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

// ── expo-image-picker ─────────────────────────────────────────────────────────
const mockLaunchCameraAsync = jest.fn();
jest.mock('expo-image-picker', () => ({
  __esModule: true,
  requestCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' }),
  ),
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' }),
  ),
  launchCameraAsync: (...args: unknown[]) => mockLaunchCameraAsync(...args),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({ canceled: true }),
  ),
  MediaTypeOptions: { Images: 'Images' },
}));

// ── verificationService ──────────────────────────────────────────────────────
const mockSelfProcessAadhaar = jest.fn();
jest.mock('../../../../services/verificationService', () => ({
  verificationService: {
    selfProcessAadhaar: (...args: unknown[]) =>
      mockSelfProcessAadhaar(...args),
  },
}));

// ── react-query (provide a real client) ───────────────────────────────────────
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
const qc = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

// ── Navigation prop ───────────────────────────────────────────────────────────
const navigate = jest.fn();
const navProp = { navigate } as unknown as import(
  '@react-navigation/native-stack'
).NativeStackNavigationProp<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  'PatientKycAadhaarUpload'
>;

import { PatientKycAadhaarScreen } from '../PatientKycAadhaarScreen';
import { usePatientKycDraft } from '../../../../state/patientKycDraft';

describe('PatientKycAadhaarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePatientKycDraft.getState().reset();
    mockLaunchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/aadhaar.jpg', mimeType: 'image/jpeg' }],
    });
  });

  const renderScreen = () =>
    render(
      <QueryClientProvider client={qc}>
        <PatientKycAadhaarScreen navigation={navProp} />
      </QueryClientProvider>,
    );

  it('renders the step header and CTAs', () => {
    renderScreen();
    expect(screen.getByText('Step 1 of 5')).toBeOnTheScreen();
    expect(screen.getByText('Upload Your Aadhaar')).toBeOnTheScreen();
    expect(screen.getByText('Use camera')).toBeOnTheScreen();
    expect(screen.getByText('Pick from gallery')).toBeOnTheScreen();
  });

  it('uploads, stores OCR draft, shows masked Aadhaar last-4', async () => {
    mockSelfProcessAadhaar.mockResolvedValue({
      fullName: 'Ramesh Kumar',
      dob: '1990-05-12',
      gender: 'MALE',
      address: '42 MG Road',
      aadhaarLast4: '9012',
      faceStored: true,
      isMinor: false,
    });

    renderScreen();
    fireEvent.press(screen.getByText('Use camera'));
    await waitFor(() => expect(mockLaunchCameraAsync).toHaveBeenCalled());

    // After picking, the "Process Aadhaar" CTA appears.
    const processBtn = await screen.findByText('Process Aadhaar');
    fireEvent.press(processBtn);

    await waitFor(() =>
      expect(mockSelfProcessAadhaar).toHaveBeenCalledWith(
        'file:///tmp/aadhaar.jpg',
        'image/jpeg',
      ),
    );

    // The masked last-4 must be shown — never the full number.
    await waitFor(() =>
      expect(screen.getByText(/XXXX XXXX 9012/)).toBeOnTheScreen(),
    );
    expect(screen.queryByText(/1234 5678 9012/)).toBeNull();

    // OCR draft must be hydrated for the next screens.
    expect(usePatientKycDraft.getState().ocr).toEqual({
      fullName: 'Ramesh Kumar',
      dob: '1990-05-12',
      gender: 'MALE',
      address: '42 MG Road',
      aadhaarLast4: '9012',
    });

    // Continue button navigates to the Personal Details screen.
    fireEvent.press(screen.getByText('Continue'));
    expect(navigate).toHaveBeenCalledWith('PatientKycPersonal');
  });
});
