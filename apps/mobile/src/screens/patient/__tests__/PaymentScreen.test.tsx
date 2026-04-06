import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { PaymentScreen } from '../PaymentScreen';

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    put: jest.fn(),
  },
}));

jest.mock('../../../utils/format', () => ({
  formatCurrency: (amount: number) => `₹${amount}`,
}));

// Get references to the mocked functions after module mock is applied
import api from '../../../services/api';
const mockPost = api.post as jest.Mock;
const mockPut = api.put as jest.Mock;

describe('PaymentScreen', () => {
  const mockNavigation: any = {
    replace: jest.fn(),
  };
  const mockRoute: any = {
    params: { bookingId: 'booking-1', amount: 500 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockPost.mockReset();
    mockPut.mockReset();
  });

  it('renders total amount', () => {
    render(<PaymentScreen navigation={mockNavigation} route={mockRoute} />);
    expect(screen.getByText('₹500')).toBeTruthy();
    expect(screen.getByText('Total Amount')).toBeTruthy();
  });

  it('renders payment methods', () => {
    render(<PaymentScreen navigation={mockNavigation} route={mockRoute} />);
    expect(screen.getByText('UPI')).toBeTruthy();
    expect(screen.getByText('Card')).toBeTruthy();
    expect(screen.getByText('Net Banking')).toBeTruthy();
    expect(screen.getByText('Cash on Visit')).toBeTruthy();
  });

  it('renders pay button with amount', () => {
    render(<PaymentScreen navigation={mockNavigation} route={mockRoute} />);
    expect(screen.getByText('Pay ₹500')).toBeTruthy();
  });

  it('processes payment successfully and shows success screen', async () => {
    mockPost.mockResolvedValue({ data: { id: 'payment-1' } });
    mockPut.mockResolvedValue({ data: { status: 'PAID' } });

    render(<PaymentScreen navigation={mockNavigation} route={mockRoute} />);

    await act(async () => {
      fireEvent.press(screen.getByText('Pay ₹500'));
    });

    expect(screen.getByText('Payment Successful!')).toBeTruthy();
    expect(mockPost).toHaveBeenCalledWith('/payments', {
      bookingId: 'booking-1',
      amount: 500,
    });
    expect(mockPut).toHaveBeenCalledWith(
      '/payments/payment-1/status',
      expect.objectContaining({ status: 'PAID' }),
    );
  });

  it('navigates to Tracking after successful payment', async () => {
    mockPost.mockResolvedValue({ data: { id: 'payment-1' } });
    mockPut.mockResolvedValue({ data: { status: 'PAID' } });

    render(<PaymentScreen navigation={mockNavigation} route={mockRoute} />);

    await act(async () => {
      fireEvent.press(screen.getByText('Pay ₹500'));
    });

    fireEvent.press(screen.getByText('Track Provider'));
    expect(mockNavigation.replace).toHaveBeenCalledWith('Tracking', {
      bookingId: 'booking-1',
    });
  });

  it('shows error alert when payment fails', async () => {
    const error = new Error('fail') as any;
    error.response = { data: { error: 'Insufficient funds' } };
    mockPost.mockRejectedValue(error);

    render(<PaymentScreen navigation={mockNavigation} route={mockRoute} />);

    await act(async () => {
      fireEvent.press(screen.getByText('Pay ₹500'));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Payment Failed',
      'Insufficient funds',
    );
  });

  it('shows generic error when payment fails without message', async () => {
    mockPost.mockRejectedValue(new Error('Network error'));

    render(<PaymentScreen navigation={mockNavigation} route={mockRoute} />);

    await act(async () => {
      fireEvent.press(screen.getByText('Pay ₹500'));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Payment Failed',
      'Payment failed. Please try again.',
    );
  });
});
