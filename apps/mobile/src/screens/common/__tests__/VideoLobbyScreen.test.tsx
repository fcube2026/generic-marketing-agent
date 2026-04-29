import React from 'react';
import { Linking } from 'react-native';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { VideoLobbyScreen } from '../VideoLobbyScreen';

// ── AsyncStorage (required by services/api.ts) ────────────────────────────────
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

// ── expo-camera ───────────────────────────────────────────────────────────────
// IMPORTANT: useCameraPermissions/useMicrophonePermissions must return
// STABLE object references between renders, otherwise the VideoLobbyScreen
// useEffect([cameraPermission, micPermissionResponse]) treats every render
// as a dependency change, triggering an infinite re-render → OOM.
jest.mock('expo-camera', () => {
  const { View } = require('react-native');
  const perm = { granted: true, canAskAgain: true };
  const reqCam = jest.fn().mockResolvedValue(perm);
  const reqMic = jest.fn().mockResolvedValue(perm);
  return {
    CameraView: View,
    useCameraPermissions: jest.fn(() => [perm, reqCam]),
    useMicrophonePermissions: jest.fn(() => [perm, reqMic]),
    Camera: {
      requestCameraPermissionsAsync: jest.fn(() =>
        Promise.resolve({ status: 'granted' }),
      ),
    },
  };
});

// ── expo-av ───────────────────────────────────────────────────────────────────
jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' }),
    ),
  },
}));

// ── api (network health check) ────────────────────────────────────────────────
jest.mock('../../../services/api', () => ({
  default: {
    head: jest.fn(() => Promise.reject(new Error('no network in tests'))),
  },
}));

// ── useAuthStore ──────────────────────────────────────────────────────────────
jest.mock('../../../store/authStore', () => ({
  useAuthStore: jest.fn((selector: (s: { user: { id: string } }) => unknown) =>
    selector({ user: { id: 'user-patient-1' } }),
  ),
}));

// ── bookingService ────────────────────────────────────────────────────────────
jest.mock('../../../services/bookingService', () => ({
  bookingService: {
    getBookingById: jest.fn(),
    getVideoSession: jest.fn(),
    startVideoSession: jest.fn(() => Promise.resolve()),
    getVideoToken: jest.fn(() => Promise.resolve({ roomId: 'room-test-abc' })),
    endVideoSession: jest.fn(() => Promise.resolve({ duration: 300 })),
  },
}));

// ── Navigation ────────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, replace: jest.fn() }),
  useRoute: () => ({ params: { bookingId: 'booking-123' } }),
}));

// ── React Query ───────────────────────────────────────────────────────────────
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

import { useQuery } from '@tanstack/react-query';
const mockUseQuery = useQuery as jest.Mock;

// ── Format util ───────────────────────────────────────────────────────────────
jest.mock('../../../utils/format', () => ({
  formatDateTime: (v: string) => `Formatted(${v})`,
}));

// ── Sub-components ────────────────────────────────────────────────────────────
jest.mock('../../../components/common/LoadingSpinner', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => {
    const { Text } = require('react-native');
    return <Text>{message ?? 'Loading'}</Text>;
  },
}));

jest.mock('../../../components/common/Card', () => ({
  Card: ({ children, style }: { children: React.ReactNode; style?: object }) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

jest.mock('../../../components/booking/BookingStatusBadge', () => ({
  BookingStatusBadge: ({ status }: { status: string }) => {
    const { Text } = require('react-native');
    return <Text>{status}</Text>;
  },
}));

// ──────────────────────────────────────────────────────────────────────────────

const BOOKING = {
  id: 'booking-123',
  status: 'ACCEPTED',
  // Use a date firmly in the past so isFuture=false and isTimeReady=true on
  // every test run, ensuring the join-button text doesn't depend on real time.
  scheduledAt: '2020-01-15T10:00:00Z',
  totalFee: 500,
  provider: { name: 'Dr. Smith', userId: 'user-provider-1' },
  serviceCategory: { name: 'General Consultation' },
};

const SESSION = {
  id: 'session-1',
  bookingId: 'booking-123',
  roomId: 'room-abc',
  status: 'WAITING',
  createdAt: '2026-05-01T09:50:00Z',
  updatedAt: '2026-05-01T09:55:00Z',
};

function setupQuery(booking: unknown, session: unknown, loading = false) {
  mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'booking') {
      return { data: booking, isLoading: loading };
    }
    if (queryKey[0] === 'video-session') {
      return { data: session, isLoading: loading };
    }
    return { data: undefined, isLoading: false };
  });
}

describe('VideoLobbyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Re-establish Linking spies after clearAllMocks wipes call history.
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  it('shows loading spinner while data is fetching', () => {
    setupQuery(undefined, undefined, true);
    render(<VideoLobbyScreen />);
    expect(screen.getByText('Preparing Lobby...')).toBeTruthy();
  });

  it('renders pre-call check labels', () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);
    expect(screen.getByText('Camera')).toBeTruthy();
    expect(screen.getByText('Microphone')).toBeTruthy();
    expect(screen.getByText('Connection')).toBeTruthy();
  });

  it('renders booking details when available', () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);
    expect(screen.getByText('Dr. Smith')).toBeTruthy();
    expect(screen.getByText('General Consultation')).toBeTruthy();
    expect(screen.getByText(/Formatted/)).toBeTruthy();
  });

  it('renders the screen header title', () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);
    expect(screen.getByText('Video Consultation')).toBeTruthy();
  });

  it('shows "Start Session Now" when no active session exists', () => {
    // Session is null; scheduledAt is in the past → isTimeReady=true, button
    // is enabled and shows 'Start Session Now'.
    setupQuery(BOOKING, null);
    render(<VideoLobbyScreen />);
    expect(screen.getByText('Start Session Now')).toBeTruthy();
  });

  it('shows scheduled time label', () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);
    expect(screen.getByText('📅 SCHEDULED TIME')).toBeTruthy();
  });

  it('enables join button after permission checks complete', async () => {
    // After useEffect runs and micPermission is set to true, canJoin becomes
    // true with an active session and an ACCEPTED booking.
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);

    await waitFor(() => {
      expect(screen.getByText('Join Consultation Now')).toBeTruthy();
    });
  });

  it('calls Linking.openURL with Jitsi URL on join', async () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);

    await waitFor(() => {
      expect(screen.getByText('Join Consultation Now')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Join Consultation Now'));
      // Flush the async handleJoinCall promise chain
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('https://meet.jit.si/'),
    );
  });

  it('navigates back when ✕ button is pressed', () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);
    // ✕ appears in the header back button AND in any 'denied' check circle;
    // the header comes first in the render tree so index [0] is the back button.
    fireEvent.press(screen.getAllByText('✕')[0]);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('toggles mic to muted when mic control is pressed', () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);

    // Control emoji is '🎤' (no trailing text); overlay shows '🎤 Audio Live'
    fireEvent.press(screen.getByText('🎤'));
    expect(screen.getByText('🔇')).toBeTruthy();
  });

  it('toggles camera to off when camera control is pressed', () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);

    fireEvent.press(screen.getByText('📷'));
    expect(screen.getAllByText('📵').length).toBeGreaterThan(0);
  });

  it('toggles mic back to active after second press', () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);

    fireEvent.press(screen.getByText('🎤'));
    fireEvent.press(screen.getByText('🔇'));
    expect(screen.getByText('🎤')).toBeTruthy();
  });

  it('join button shows "Start Session Now" for a terminal session', async () => {
    // COMPLETED session → sessionActive=false; scheduledAt in past → isTimeReady=true
    // canJoin=true but button text 'Start Session Now' (no active session to join).
    const completedSession = { ...SESSION, status: 'COMPLETED' };
    setupQuery(BOOKING, completedSession);
    render(<VideoLobbyScreen />);

    await waitFor(() => {
      expect(screen.getByText('Start Session Now')).toBeTruthy();
    });
  });

  it('shows error message when booking fails to load', () => {
    setupQuery(null, SESSION);
    render(<VideoLobbyScreen />);
    expect(screen.getByText(/Failed to load booking details/)).toBeTruthy();
  });
});
