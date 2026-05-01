/**
 * Cross-screen draft state for the patient KYC wizard.
 *
 * The Aadhaar OCR result lives here briefly, so that when the patient lands
 * on the Personal Details screen we can pre-fill name/DOB/gender and the
 * Address screen can pre-fill the street/city/state/pincode. Every field
 * stays editable on those screens — the draft is only a hint.
 *
 * Cleared on `reset()` and after a successful Review submission.
 */

import { create } from 'zustand';

export interface AadhaarOcrDraft {
  fullName: string | null;
  dob: string | null; // ISO YYYY-MM-DD
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  aadhaarLast4: string | null;
}

interface PatientKycDraftState {
  ocr: AadhaarOcrDraft | null;
  setOcr: (draft: AadhaarOcrDraft) => void;
  clearOcr: () => void;
  reset: () => void;
}

const _normaliseGender = (g: string | null): AadhaarOcrDraft['gender'] => {
  if (!g) return null;
  const u = g.toUpperCase();
  if (u === 'MALE' || u === 'FEMALE' || u === 'OTHER') return u;
  return 'OTHER';
};

export const usePatientKycDraft = create<PatientKycDraftState>((set) => ({
  ocr: null,
  setOcr: (draft) =>
    set({
      ocr: {
        ...draft,
        gender: _normaliseGender(draft.gender ?? null),
      },
    }),
  clearOcr: () => set({ ocr: null }),
  reset: () => set({ ocr: null }),
}));
