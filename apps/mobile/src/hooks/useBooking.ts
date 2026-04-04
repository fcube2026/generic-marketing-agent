import { useQuery } from '@tanstack/react-query';
import { bookingService } from '../services/bookingService';

export const useMyBookings = () => {
  return useQuery({
    queryKey: ['patient-bookings'],
    queryFn: bookingService.getMyBookings,
  });
};

export const useBooking = (bookingId: string) => {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingService.getBooking(bookingId),
    enabled: !!bookingId,
  });
};
