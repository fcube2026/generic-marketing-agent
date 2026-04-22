import React from 'react';
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
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' }),
    ),
  },
}));

// ── expo-av ───────────────────────────────────────────────────────────────────
jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' }),
    ),
  },
}));

// ── fetch (network check) ─────────────────────────────────────────────────────
global.fetch = jest.fn(() => Promise.resolve({ ok: true } as Response));

// ── bookingService ────────────────────────────────────────────────────────────
jest.mock('../../../services/bookingService', () => ({
  bookingService: {
    getBookingById: jest.fn(),
    getVideoSession: jest.fn(),
  },
}));

// ── Navigation ────────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { bookingId: 'booking-123' } }),
}));

// ── React Query ───────────────────────────────────────────────────────────────
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
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
  scheduledAt: '2026-05-01T10:00:00Z',
  totalFee: 500,
  provider: { name: 'Dr. Smith' },
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
  });

  it('shows loading spinner while data is fetching', () => {
    setupQuery(undefined, undefined, true);
    render(<VideoLobbyScreen />);
    expect(screen.getByText('Preparing lobby...')).toBeTruthy();
  });

  it('renders pre-call check labels', () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);
    expect(screen.getByText('Camera Permission')).toBeTruthy();
    expect(screen.getByText('Microphone Permission')).toBeTruthy();
    expect(screen.getByText('Network Connectivity')).toBeTruthy();
  });

  it('renders booking details when available', () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);
    expect(screen.getByText('Dr. Smith')).toBeTruthy();
    expect(screen.getByText('General Consultation')).toBeTruthy();
    expect(screen.getByText(/Formatted/)).toBeTruthy();
  });

  it('renders session status badge when session exists', () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);
    expect(screen.getByText('📹 Session Status')).toBeTruthy();
    expect(screen.getByText('⏳ Waiting')).toBeTruthy();
  });

  it('shows "no session" message when session is absent', () => {
    setupQuery(BOOKING, null);
    render(<VideoLobbyScreen />);
    expect(
      screen.getByText(/The video room will be ready once the provider sets up the session/),
    ).toBeTruthy();
  });

  it('initially shows "Running checks…" on Join button', () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);
    expect(screen.getByText('⏳ Running checks…')).toBeTruthy();
  });

  it('enables Join button after checks complete', async () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);

    await waitFor(() => {
      expect(screen.getByText('🎥 Join Call')).toBeTruthy();
    });
  });

  it('navigates to VideoConsultation on join', async () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);

    await waitFor(() => {
      expect(screen.getByText('🎥 Join Call')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('🎥 Join Call'));
    expect(mockNavigate).toHaveBeenCalledWith('VideoConsultation', { bookingId: 'booking-123' });
  });

  it('navigates back on Back button press', () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);
    fireEvent.press(screen.getByText('← Back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('toggles mic off when mic button is pressed', () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);

    fireEvent.press(screen.getByText('Mic On'));
    expect(screen.getByText('Mic Off')).toBeTruthy();
  });

  it('toggles camera off when camera button is pressed', () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);

    fireEvent.press(screen.getByText('Cam On'));
    expect(screen.getByText('Cam Off')).toBeTruthy();
  });

  it('toggles mic back on after second press', () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);

    fireEvent.press(screen.getByText('Mic On'));
    fireEvent.press(screen.getByText('Mic Off'));
    expect(screen.getByText('Mic On')).toBeTruthy();
  });

  it('shows "Session Not Ready" when session status is terminal', async () => {
    const completedSession = { ...SESSION, status: 'COMPLETED' };
    setupQuery(BOOKING, completedSession);
    render(<VideoLobbyScreen />);

    await waitFor(() => {
      expect(screen.getByText('🔒 Session Not Ready')).toBeTruthy();
    });
  });

  it('shows booking details section title', () => {
    setupQuery(BOOKING, SESSION);
    render(<VideoLobbyScreen />);
    expect(screen.getByText('📋 Booking Details')).toBeTruthy();
  });

  it('shows "Booking details unavailable" when booking is null', () => {
    setupQuery(null, SESSION);
    render(<VideoLobbyScreen />);
    expect(screen.getByText('Booking details unavailable')).toBeTruthy();
  });
});
