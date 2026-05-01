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

// ── expo-document-picker ──────────────────────────────────────────────────────
const mockGetDocumentAsync = jest.fn();
jest.mock('expo-document-picker', () => ({
  __esModule: true,
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

// ── verificationService ──────────────────────────────────────────────────────
const mockSelfProcessEaadhaar = jest.fn();
jest.mock('../../../../services/verificationService', () => ({
  verificationService: {
    selfProcessEaadhaar: (...args: unknown[]) =>
      mockSelfProcessEaadhaar(...args),
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
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/eaadhaar.pdf',
          name: 'eaadhaar.pdf',
          mimeType: 'application/pdf',
        },
      ],
    });
  });

  const renderScreen = () =>
    render(
      <QueryClientProvider client={qc}>
        <PatientKycAadhaarScreen navigation={navProp} />
      </QueryClientProvider>,
    );

  it('renders the step header and PDF picker CTA', () => {
    renderScreen();
    expect(screen.getByText('Step 1 of 5')).toBeOnTheScreen();
    expect(screen.getByText('Upload eAadhaar')).toBeOnTheScreen();
    expect(screen.getByText('Select eAadhaar PDF')).toBeOnTheScreen();
  });

  it('validates eAadhaar, stores OCR draft with city/state/pincode, shows masked last-4', async () => {
    mockSelfProcessEaadhaar.mockResolvedValue({
      fullName: 'Ramesh Kumar',
      dob: '1990-05-12',
      gender: 'MALE',
      address: '42 MG Road, Mock Colony',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      aadhaarLast4: '9012',
      isMinor: false,
    });

    renderScreen();
    fireEvent.press(screen.getByText('Select eAadhaar PDF'));
    await waitFor(() => expect(mockGetDocumentAsync).toHaveBeenCalled());

    // After picking, the "Validate eAadhaar" CTA appears
    const validateBtn = await screen.findByText('Validate eAadhaar');
    fireEvent.press(validateBtn);

    await waitFor(() =>
      expect(mockSelfProcessEaadhaar).toHaveBeenCalledWith(
        'file:///tmp/eaadhaar.pdf',
        'application/pdf',
        undefined,
      ),
    );

    // Masked last-4 must be shown — never the full number
    await waitFor(() =>
      expect(screen.getByText(/XXXX XXXX 9012/)).toBeOnTheScreen(),
    );
    expect(screen.queryByText(/1234 5678 9012/)).toBeNull();

    // OCR draft must include city, state, pincode for pre-filling address screen
    expect(usePatientKycDraft.getState().ocr).toEqual({
      fullName: 'Ramesh Kumar',
      dob: '1990-05-12',
      gender: 'MALE',
      address: '42 MG Road, Mock Colony',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      aadhaarLast4: '9012',
    });

    // Continue button navigates to Personal Details
    fireEvent.press(screen.getByText('Continue'));
    expect(navigate).toHaveBeenCalledWith('PatientKycPersonal');
  });
});

