import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

// ── 100ms HMS SDK mock ────────────────────────────────────────────────────────
const mockLeave = jest.fn(() => Promise.resolve());
const mockJoin = jest.fn(() => Promise.resolve());
const mockAddEventListener = jest.fn();
const mockRemoveAllListeners = jest.fn();

const makeMockInstance = () => ({
  join: mockJoin,
  leave: mockLeave,
  addEventListener: mockAddEventListener,
  removeAllListeners: mockRemoveAllListeners,
  getLocalPeer: jest.fn(() => Promise.resolve(null)),
});

const mockBuild = jest.fn(() => Promise.resolve(makeMockInstance()));

jest.mock('@100mslive/react-native-hms', () => ({
  HMSSDK: {
    build: (...args: unknown[]) => mockBuild(...args),
  },
  HMSConfig: jest.fn().mockImplementation((params: object) => params),
  HMSUpdateListenerActions: {
    ON_JOIN: 'ON_JOIN',
    ON_PEER_UPDATE: '3',
    ON_TRACK_UPDATE: 'ON_TRACK_UPDATE',
    ON_ERROR: 'ON_ERROR',
    RECONNECTING: 'RECONNECTING',
    RECONNECTED: 'RECONNECTED',
    ON_REMOVED_FROM_ROOM: 'ON_REMOVED_FROM_ROOM',
  },
  HmsViewComponent: ({ id }: { id: string }) => {
    const { View } = require('react-native');
    return <View testID={`hms-view-${id}`} />;
  },
  HMSVideoViewMode: {
    ASPECT_FILL: 'ASPECT_FILL',
  },
}));

// ── Navigation ────────────────────────────────────────────────────────────────
const mockGoBack = jest.fn();
let mockRouteParams = {
  bookingId: 'booking-123',
  token: 'real-jwt-token-abc',
  roomId: 'room-abc',
  role: 'patient' as const,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));

// ── AsyncStorage ──────────────────────────────────────────────────────────────
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

import { VideoCallScreen } from '../VideoCallScreen';

// ─────────────────────────────────────────────────────────────────────────────

describe('VideoCallScreen — mock token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuild.mockResolvedValue(makeMockInstance());
    mockRouteParams = {
      bookingId: 'booking-123',
      token: 'mock-token-room-abc-user-123-guest',
      roomId: 'mock-room-booking-123',
      role: 'patient',
    };
  });

  it('renders mock session timer with mock token', () => {
    render(<VideoCallScreen />);
    // MockCallScreen shows a timer starting at 00:00
    expect(screen.getByText('00:00')).toBeTruthy();
  });

  it('shows mock badge in mock mode', () => {
    render(<VideoCallScreen />);
    expect(screen.getByText('🧪 MOCK SESSION')).toBeTruthy();
  });

  it('shows mute button in mock mode', () => {
    render(<VideoCallScreen />);
    expect(screen.getByText('Mute')).toBeTruthy();
  });

  it('toggles mute in mock mode', () => {
    render(<VideoCallScreen />);
    fireEvent.press(screen.getByText('Mute'));
    expect(screen.getByText('Unmute')).toBeTruthy();
  });

  it('calls goBack when End Call is pressed in mock mode', () => {
    render(<VideoCallScreen />);
    fireEvent.press(screen.getByText('End Call'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});

describe('VideoCallScreen — real HMS token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuild.mockResolvedValue(makeMockInstance());
    mockRouteParams = {
      bookingId: 'booking-123',
      token: 'real-jwt-token-abc',
      roomId: 'room-abc',
      role: 'patient',
    };
  });

  it('shows connecting screen initially', () => {
    render(<VideoCallScreen />);
    expect(screen.getByText('Connecting to room…')).toBeTruthy();
  });

  it('calls HMSSDK.build on mount', async () => {
    render(<VideoCallScreen />);
    await waitFor(() => {
      expect(mockBuild).toHaveBeenCalledTimes(1);
    });
  });

  it('calls hmsInstance.join with correct auth token', async () => {
    render(<VideoCallScreen />);
    await waitFor(() => {
      expect(mockJoin).toHaveBeenCalledWith(
        expect.objectContaining({ authToken: 'real-jwt-token-abc' }),
      );
    });
  });

  it('registers all required event listeners', async () => {
    render(<VideoCallScreen />);
    await waitFor(() => {
      const registeredEvents = mockAddEventListener.mock.calls.map((c) => c[0]);
      expect(registeredEvents).toContain('ON_JOIN');
      expect(registeredEvents).toContain('ON_TRACK_UPDATE');
      expect(registeredEvents).toContain('ON_ERROR');
      expect(registeredEvents).toContain('RECONNECTING');
      expect(registeredEvents).toContain('RECONNECTED');
      expect(registeredEvents).toContain('ON_REMOVED_FROM_ROOM');
    });
  });

  it('shows error state when HMSSDK.build rejects', async () => {
    mockBuild.mockRejectedValueOnce(new Error('Network error'));
    render(<VideoCallScreen />);
    await waitFor(() => {
      expect(screen.getByText('Connection Error')).toBeTruthy();
      expect(screen.getByText('Network error')).toBeTruthy();
    });
  });

  it('calls goBack when "Return" is pressed on error state', async () => {
    mockBuild.mockRejectedValueOnce(new Error('Invalid token'));
    render(<VideoCallScreen />);
    await waitFor(() => {
      expect(screen.getByText('Return')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Return'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls removeAllListeners and leave on unmount', async () => {
    const { unmount } = render(<VideoCallScreen />);
    await waitFor(() => expect(mockBuild).toHaveBeenCalled());
    unmount();
    await waitFor(() => {
      expect(mockRemoveAllListeners).toHaveBeenCalled();
      expect(mockLeave).toHaveBeenCalled();
    });
  });
});

