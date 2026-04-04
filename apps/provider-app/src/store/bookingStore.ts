import { create } from 'zustand';
interface BookingState {
  activeBookingId: string | null;
  setActiveBooking: (id: string | null) => void;
}
export const useBookingStore = create<BookingState>((set) => ({
  activeBookingId: null,
  setActiveBooking: (id) => set({ activeBookingId: id }),
}));
