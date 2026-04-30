import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const baseOrder: PharmacyOrder = {
  id: 'order-1', orderNumber: 'ORD-001', patientProfileId: 'patient-1',
  pharmacyPartnerId: 'partner-1', partnerCode: 'mock', partnerName: 'Mock Pharmacy',
  partnerOrderId: 'MOCK-1', status: 'PLACED', deliveryAddressId: 'addr-1',
  deliveryAddress: '123 Street', subtotal: 200, deliveryFee: 25, discount: 0,
  totalAmount: 225, estimatedDeliveryAt: null, deliveredAt: null, notes: null,
  createdAt: new Date('2026-04-23T10:00:00Z').toISOString() as any,
  updatedAt: new Date('2026-04-23T10:00:00Z').toISOString() as any,
  items: [],
} as unknown as PharmacyOrder;

describe('DEBUG OrderTrackingScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setInterval', 'clearInterval'] });
    jest.clearAllMocks();
    mockUseRoute.mockReturnValue({ params: { orderId: 'order-1' } });
  });
  afterEach(() => { act(() => { jest.clearAllTimers(); }); });

  it('DEBUG with waitFor', async () => {
    let resolveOrder: (o: PharmacyOrder) => void;
    mockGetOrderById.mockReturnValue(
      new Promise<PharmacyOrder>((resolve) => { resolveOrder = resolve; }),
    );

    renderWithClient(<OrderTrackingScreen />);
    expect(screen.getByText(/Loading your order/i)).toBeTruthy();

    await act(async () => { resolveOrder!(baseOrder); });
    await act(async () => { jest.runOnlyPendingTimers(); });
    
    console.log('Before waitFor: loading =', !!screen.queryByText(/Loading your order/i));
    
    // Using exact same waitFor call as original test
    await waitFor(() => {
      console.log('  Inside waitFor expectation: loading =', !!screen.queryByText(/Loading your order/i));
      expect(screen.queryByText(/Loading your order/i)).toBeNull();
    });
    
    console.log('After waitFor: passed!');
  }, 10000);
});
