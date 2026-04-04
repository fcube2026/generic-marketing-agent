import { create } from 'zustand';
import { ServiceCategory, ProviderProfile, BookingMode } from '../types';

interface BookingState {
  selectedService: ServiceCategory | null;
  selectedProvider: ProviderProfile | null;
  selectedMode: BookingMode | null;
  symptoms: string;
  scheduledAt: Date | null;
  setSelectedService: (service: ServiceCategory | null) => void;
  setSelectedProvider: (provider: ProviderProfile | null) => void;
  setSelectedMode: (mode: BookingMode | null) => void;
  setSymptoms: (symptoms: string) => void;
  setScheduledAt: (date: Date | null) => void;
  resetBooking: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  selectedService: null,
  selectedProvider: null,
  selectedMode: null,
  symptoms: '',
  scheduledAt: null,

  setSelectedService: (service) => set({ selectedService: service }),
  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  setSelectedMode: (mode) => set({ selectedMode: mode }),
  setSymptoms: (symptoms) => set({ symptoms }),
  setScheduledAt: (date) => set({ scheduledAt: date }),
  resetBooking: () =>
    set({
      selectedService: null,
      selectedProvider: null,
      selectedMode: null,
      symptoms: '',
      scheduledAt: null,
    }),
}));
