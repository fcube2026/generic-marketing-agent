/**
 * PrescriptionOrderScreen tests.
 *
 * The screen relies on:
 *   - useNavigation / useRoute (from @react-navigation/native)
 *   - axios `api` instance for /consultation/latest and prescription upload
 *   - pharmacyService.searchMedicines for the inline "Add Medicine" search
 *   - the Zustand `pharmacyOrderStore`
 *   - expo-image-picker for camera/gallery access
 *
 * All external dependencies are mocked. We do NOT hit a real backend.
 */
import React from 'react';
import { Alert } from 'react-native';
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mocks (MUST be declared before importing the screen)
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn();
const mockUseRoute = jest.fn(() => ({ params: {} }));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => mockUseRoute(),
}));

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('../../../services/pharmacyService', () => ({
  pharmacyService: {
    searchMedicines: jest.fn(),
  },
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

// Avoid pulling design-token dependent button styling overhead if any –
// the real Button component is fine but its loading state is harmless.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from '../../../services/api';
import { pharmacyService } from '../../../services/pharmacyService';
import * as ImagePicker from 'expo-image-picker';
import { PrescriptionOrderScreen } from '../PrescriptionOrderScreen';
import { usePharmacyOrderStore } from '../../../store/pharmacyOrderStore';

const mockApiGet = api.get as jest.Mock;
const mockApiPost = api.post as jest.Mock;
const mockSearchMedicines = pharmacyService.searchMedicines as jest.Mock;

const resetStore = () => {
  usePharmacyOrderStore.setState({
    prescriptionUrl: null,
    isUploading: false,
    uploadError: null,
    medicines: [],
    uploadedPrescriptionId: null,
    uploadedPrescriptionStatus: null,
    selectedPharmacy: null,
  });
};

const renderScreen = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PrescriptionOrderScreen />
    </QueryClientProvider>,
  );
};

describe('PrescriptionOrderScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined as any);
    resetStore();
    mockUseRoute.mockReturnValue({ params: {} });
    // Default: no recent consultation, no medicines from search
    mockApiGet.mockResolvedValue({ data: null });
    mockSearchMedicines.mockResolvedValue([]);
  });

  it('renders the prescription source options when no prescription is set', () => {
    renderScreen();
    expect(screen.getByText('📋 Prescription')).toBeTruthy();
    expect(screen.getByText('Use Recent Prescription')).toBeTruthy();
    expect(screen.getByText('Upload Prescription')).toBeTruthy();
    expect(screen.getByText('Camera')).toBeTruthy();
    expect(screen.getByText('Gallery')).toBeTruthy();
  });

  it('shows the empty-medicines message before any prescription is added', () => {
    renderScreen();
    expect(
      screen.getByText(
        /No medicines found\. Search and add medicines from your prescription below\./i,
      ),
    ).toBeTruthy();
  });

  it('shows a prescription preview and "Change Prescription" once an image is set', async () => {
    mockUseRoute.mockReturnValue({
      params: { prescriptionUrl: 'https://example.com/rx.jpg' },
    });
    renderScreen();
    // The store auto-attaches the incoming param via useEffect
    await waitFor(() => {
      expect(usePharmacyOrderStore.getState().prescriptionUrl).toBe(
        'https://example.com/rx.jpg',
      );
    });
    expect(await screen.findByText('Change Prescription')).toBeTruthy();
  });

  it('uploads the prescription via the API when a Camera image is picked', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/photo.jpg' }],
    });
    mockApiPost.mockResolvedValue({
      data: {
        prescriptionId: 'rx-123',
        status: 'PENDING_REVIEW',
        fileUrl: 'https://cdn.example.com/rx-123.jpg',
      },
    });

    renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByText('Camera'));
    });

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledTimes(1);
    });
    const [endpoint, body] = mockApiPost.mock.calls[0];
    expect(endpoint).toContain('prescription');
    // FormData is the second arg
    expect(body).toBeDefined();

    // Store should reflect the uploaded prescription metadata.
    const state = usePharmacyOrderStore.getState();
    expect(state.prescriptionUrl).toBe('https://cdn.example.com/rx-123.jpg');
    expect(state.uploadedPrescriptionId).toBe('rx-123');
    expect(state.uploadedPrescriptionStatus).toBe('PENDING_REVIEW');
  });

  it('surfaces an upload error when the API rejects the prescription upload', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/from-gallery.jpg' }],
    });
    const err = new Error('boom') as Error & {
      response?: { data?: { message?: string } };
    };
    err.response = { data: { message: 'File too large' } };
    mockApiPost.mockRejectedValue(err);

    renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByText('Gallery'));
    });

    await waitFor(() => {
      expect(usePharmacyOrderStore.getState().uploadError).toBe('File too large');
    });
    // It still falls back to the local image so the user has something to see
    expect(usePharmacyOrderStore.getState().prescriptionUrl).toBe(
      'file:///tmp/from-gallery.jpg',
    );
  });

  it('does not call the upload API when the user denies camera permission', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: false,
    });

    renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByText('Camera'));
    });

    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    expect(mockApiPost).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });
});
