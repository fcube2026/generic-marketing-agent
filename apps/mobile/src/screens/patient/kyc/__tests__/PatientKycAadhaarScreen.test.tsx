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

// ── verificationService ──────────────────────────────────────────────────────
const mockSelfValidateAadhaarNumber = jest.fn();
jest.mock('../../../../services/verificationService', () => ({
  verificationService: {
    selfValidateAadhaarNumber: (...args: unknown[]) =>
      mockSelfValidateAadhaarNumber(...args),
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
  });

  const renderScreen = () =>
    render(
      <QueryClientProvider client={qc}>
        <PatientKycAadhaarScreen navigation={navProp} />
      </QueryClientProvider>,
    );

  it('renders the step header and Aadhaar number input', () => {
    renderScreen();
    expect(screen.getByText('Step 1 of 5')).toBeOnTheScreen();
    expect(screen.getByText('Aadhaar Verification')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('Enter 12-digit Aadhaar number')).toBeOnTheScreen();
  });

  it('validates Aadhaar number, stores OCR draft with gender/state, shows masked last-4', async () => {
    mockSelfValidateAadhaarNumber.mockResolvedValue({
      gender: 'MALE',
      state: 'Gujarat',
      aadhaarLast4: '1298',
      ageRange: '20-30',
      isMobile: true,
      isMinor: false,
    });

    renderScreen();

    // Type a valid 12-digit Aadhaar number
    fireEvent.changeText(
      screen.getByPlaceholderText('Enter 12-digit Aadhaar number'),
      '917646971298',
    );

    const validateBtn = screen.getByText('Validate Aadhaar');
    fireEvent.press(validateBtn);

    await waitFor(() =>
      expect(mockSelfValidateAadhaarNumber).toHaveBeenCalledWith('917646971298'),
    );

    // Masked last-4 must be shown — never the full number
    await waitFor(() =>
      expect(screen.getByText(/XXXX XXXX XXXX 1298/)).toBeOnTheScreen(),
    );
    expect(screen.queryByText(/917646971298/)).toBeNull();

    // OCR draft must include gender and state for pre-filling subsequent screens
    expect(usePatientKycDraft.getState().ocr).toEqual({
      fullName: null,
      dob: null,
      gender: 'MALE',
      address: null,
      city: null,
      state: 'Gujarat',
      pincode: null,
      aadhaarLast4: '1298',
    });

    // Result card shows state and age range
    expect(screen.getByText('Gujarat')).toBeOnTheScreen();
    expect(screen.getByText('20-30 years')).toBeOnTheScreen();

    // Continue button navigates to Personal Details
    fireEvent.press(screen.getByText('Continue'));
    expect(navigate).toHaveBeenCalledWith('PatientKycPersonal');
  });

  it('disables Validate button when fewer than 12 digits are entered', () => {
    renderScreen();
    fireEvent.changeText(
      screen.getByPlaceholderText('Enter 12-digit Aadhaar number'),
      '12345',
    );
    const btn = screen.getByText('Validate Aadhaar');
    // Button should be disabled (not trigger mutation)
    fireEvent.press(btn);
    expect(mockSelfValidateAadhaarNumber).not.toHaveBeenCalled();
  });
});

