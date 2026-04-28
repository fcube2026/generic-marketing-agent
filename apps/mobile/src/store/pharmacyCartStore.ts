import { create } from 'zustand';
import type { MedicineResult } from '../types';

export interface PharmacyCartItem {
  medicine: MedicineResult;
  quantity: number;
}

interface PharmacyCartState {
  items: Record<string, PharmacyCartItem>;
  addItem: (medicine: MedicineResult, quantity?: number) => void;
  decreaseItem: (medicineId: string) => void;
  removeItem: (medicineId: string) => void;
  clearCart: () => void;
}

export const usePharmacyCartStore = create<PharmacyCartState>((set) => ({
  items: {},

  addItem: (medicine, quantity = 1) =>
    set((state) => {
      const existing = state.items[medicine.id];
      return {
        items: {
          ...state.items,
          [medicine.id]: {
            medicine,
            quantity: (existing?.quantity ?? 0) + Math.max(1, quantity),
          },
        },
      };
    }),

  decreaseItem: (medicineId) =>
    set((state) => {
      const existing = state.items[medicineId];
      if (!existing) {
        return state;
      }

      if (existing.quantity <= 1) {
        const nextItems = { ...state.items };
        delete nextItems[medicineId];
        return { items: nextItems };
      }

      return {
        items: {
          ...state.items,
          [medicineId]: {
            ...existing,
            quantity: existing.quantity - 1,
          },
        },
      };
    }),

  removeItem: (medicineId) =>
    set((state) => {
      const nextItems = { ...state.items };
      delete nextItems[medicineId];
      return { items: nextItems };
    }),

  clearCart: () => set({ items: {} }),
}));