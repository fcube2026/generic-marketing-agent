import { create } from 'zustand';
import { ServiceCategory, ProviderProfile, BookingMode, Address } from '../types';

interface BookingState {
  selectedService: ServiceCategory | null;
  selectedProvider: ProviderProfile | null;
  selectedMode: BookingMode | null;
  selectedAddress: Address | null;
  symptoms: string;
  scheduledAt: Date | null;
  lastBookingId: string | null;
  setSelectedService: (service: ServiceCategory | null) => void;
  setSelectedProvider: (provider: ProviderProfile | null) => void;
  setSelectedMode: (mode: BookingMode | null) => void;
  setSelectedAddress: (address: Address | null) => void;
  setSymptoms: (symptoms: string) => void;
  setScheduledAt: (date: Date | null) => void;
  setLastBookingId: (id: string | null) => void;
  resetBooking: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  selectedService: null,
  selectedProvider: null,
  selectedMode: null,
  selectedAddress: null,
  symptoms: '',
  scheduledAt: null,
  lastBookingId: null,

  setSelectedService: (service) => set({ selectedService: service }),
  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  setSelectedMode: (mode) => set({ selectedMode: mode }),
  setSelectedAddress: (address) => set({ selectedAddress: address }),
  setSymptoms: (symptoms) => set({ symptoms }),
  setScheduledAt: (date) => set({ scheduledAt: date }),
  setLastBookingId: (id) => set({ lastBookingId: id }),
  resetBooking: () =>
    set({
      selectedService: null,
      selectedProvider: null,
      selectedMode: null,
      selectedAddress: null,
      symptoms: '',
      scheduledAt: null,
      lastBookingId: null,
    }),
}));
