/**
 * OrderTrackingScreen tests.
 *
 * The screen uses:
 *   - useRoute() for the orderId param
 *   - @tanstack/react-query's useQuery / useMutation for data fetching
 *   - pharmacyService.getOrderById / cancelOrder
 *
 * We provide a real QueryClient (with retry disabled and a long staleTime)
 * and mock pharmacyService + navigation only.
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Use fake timers so that Animated timers (from the Timeline component) do not
// fire after each test's environment is torn down, causing spurious
// "Jest environment already torn down" ReferenceErrors.
// We skip faking setInterval/clearInterval (as a pair) so that
// @tanstack/react-query can use its internal polling/GC intervals without
// interference.
jest.useFakeTimers({ doNotFake: ['setInterval', 'clearInterval'] });

const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockUseRoute(),
}));

jest.mock('../../../services/pharmacyService', () => ({
  pharmacyService: {
    getOrderById: jest.fn(),
    cancelOrder: jest.fn(),
  },
}));

import { pharmacyService } from '../../../services/pharmacyService';
import { OrderTrackingScreen } from '../OrderTrackingScreen';
import type { PharmacyOrder } from '../../../types';

const mockGetOrderById = pharmacyService.getOrderById as jest.Mock;
const mockCancelOrder = pharmacyService.cancelOrder as jest.Mock;

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
  return { ...result, queryClient };
};

const baseOrder: PharmacyOrder = {
  id: 'order-1',
  orderNumber: 'ORD-001',
  patientProfileId: 'patient-1',
  pharmacyPartnerId: 'partner-1',
  partnerCode: 'mock',
  partnerName: 'Mock Pharmacy',
  partnerOrderId: 'MOCK-1',
  status: 'PLACED',
  deliveryAddressId: 'addr-1',
  deliveryAddress: '123 Street, City, State, 110001',
  subtotal: 200,
  deliveryFee: 25,
  discount: 0,
  totalAmount: 225,
  estimatedDeliveryAt: null,
  deliveredAt: null,
  notes: null,
  createdAt: new Date('2026-04-23T10:00:00Z').toISOString() as any,
  updatedAt: new Date('2026-04-23T10:00:00Z').toISOString() as any,
  items: [
    {
      id: 'item-1',
      medicineCode: 'mock-med-001',
      medicineName: 'Paracetamol 500mg',
      quantity: 2,
      unitPrice: 25,
      totalPrice: 50,
    } as any,
  ],
} as unknown as PharmacyOrder;

describe('OrderTrackingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoute.mockReturnValue({ params: { orderId: 'order-1' } });
  });

  afterEach(() => {
    // Flush and clear all pending timers (e.g. Animated callbacks) so they
    // don't fire after the test environment is torn down.
    act(() => {
      jest.runAllTimers();
    });
  });

  it('renders the loading state while the order is being fetched', async () => {
    // Resolves later so we can observe the loading UI synchronously.
    let resolveOrder: (o: PharmacyOrder) => void;
    mockGetOrderById.mockReturnValue(
      new Promise<PharmacyOrder>((resolve) => {
        resolveOrder = resolve;
      }),
    );

    renderWithClient(<OrderTrackingScreen />);
    expect(screen.getByText(/Loading your order/i)).toBeTruthy();

    // Resolve the pending request to avoid leaving open work between tests.
    await act(async () => {
      resolveOrder!(baseOrder);
    });
    await waitFor(() => {
      expect(screen.queryByText(/Loading your order/i)).toBeNull();
    });
  });

  it('renders the timeline and order details for a placed order', async () => {
    mockGetOrderById.mockResolvedValue(baseOrder);

    renderWithClient(<OrderTrackingScreen />);

    expect(await screen.findByText('Mock Pharmacy')).toBeTruthy();
    expect(screen.getByText('Order #ORD-001')).toBeTruthy();
    // Timeline rendered with all the documented steps
    expect(screen.getByText('Order Placed')).toBeTruthy();
    expect(screen.getByText('Confirmed')).toBeTruthy();
    expect(screen.getByText('Packed')).toBeTruthy();
    expect(screen.getByText('Shipped')).toBeTruthy();
    expect(screen.getByText('Out for Delivery')).toBeTruthy();
    expect(screen.getByText('Delivered')).toBeTruthy();
  });

  it('reflects status changes: shows the cancelled banner for a cancelled order', async () => {
    mockGetOrderById.mockResolvedValue({
      ...baseOrder,
      status: 'CANCELLED',
    } as PharmacyOrder);

    renderWithClient(<OrderTrackingScreen />);

    expect(await screen.findByText('Order Cancelled')).toBeTruthy();
  });

  it('renders the not-found state when the API returns a 404', async () => {
    const err = new Error('not found') as Error & {
      response?: { status?: number };
    };
    err.response = { status: 404 };
    mockGetOrderById.mockRejectedValue(err);

    renderWithClient(<OrderTrackingScreen />);

    expect(await screen.findByText('Order Not Found')).toBeTruthy();
  });

  it('renders the network-error state for non-404 errors', async () => {
    mockGetOrderById.mockRejectedValue(new Error('boom'));

    renderWithClient(<OrderTrackingScreen />);

    expect(await screen.findByText('Network Error')).toBeTruthy();
  });
});
