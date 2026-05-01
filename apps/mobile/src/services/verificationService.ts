import api from './api';

export type SelfServeStep =
  | 'PERSONAL_DETAILS'
  | 'ADDRESS'
  | 'ID_UPLOAD'
  | 'FACE_CAPTURE'
  | 'GUARDIAN'
  | 'REVIEW';

export interface SelfServeStatus {
  verificationId: string | null;
  status: string;
  riskTier: string | null;
  riskScore: number | null;
  isMinor: boolean;
  completedSteps: SelfServeStep[];
  pendingSteps: SelfServeStep[];
  nextStep: SelfServeStep | null;
  personalDetails: {
    fullName: string;
    dateOfBirth: string | null;
    gender: string | null;
  } | null;
  address: {
    source: string | null;
    addressLine: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
  idDocument: {
    documentId: string;
    documentType: string;
    extractedName: string | null;
    extractedIdNumber: string | null;
    ocrMatchPassed: boolean | null;
  } | null;
  faceCapture: {
    captured: boolean;
    faceMatchPassed: boolean | null;
    faceMatchScore: number | null;
    identityVerifiedAt?: string | null;
  } | null;
  aadhaarLast4?: string | null;
  guardian: {
    guardianName: string;
    relationship: string | null;
    guardianPhone: string | null;
    guardianAadhaarLast4: string | null;
  } | null;
  submittedAt?: string | null;
  autoApprovedAt?: string | null;
}

export const verificationService = {
  // ── Legacy booking-coupled flow (kept for VerificationStatusScreen) ──
  initiateVerification: async (bookingId: string) => {
    const r = await api.post('/verification/initiate', { bookingId });
    return r.data;
  },

  getIdUploadUrl: async (verificationId: string, documentType: string, mimeType: string) => {
    const r = await api.post('/verification/id-upload', { verificationId, documentType, mimeType });
    return r.data;
  },

  confirmIdUpload: async (documentId: string, verificationId: string) => {
    const r = await api.post('/verification/id-confirm', { documentId, verificationId });
    return r.data;
  },

  getVerificationStatus: async (bookingId: string) => {
    const r = await api.get(`/verification/status/${bookingId}`);
    return r.data;
  },

  getMyVerificationStatus: async (): Promise<SelfServeStatus> => {
    const r = await api.get('/verification/my-status');
    return r.data;
  },

  // ── Self-serve KYC (profile-launched wizard) ──
  selfStart: async (): Promise<SelfServeStatus> => {
    const r = await api.post('/verification/self/start');
    return r.data;
  },

  selfSubmitPersonalDetails: async (payload: {
    fullName: string;
    dateOfBirth: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
  }): Promise<SelfServeStatus> => {
    const r = await api.post('/verification/self/personal-details', payload);
    return r.data;
  },

  selfSubmitAddress: async (payload: {
    source: 'MANUAL' | 'MAP';
    addressLine?: string;
    city?: string;
    state?: string;
    pincode?: string;
    lat?: number;
    lng?: number;
    formatted?: string;
  }): Promise<SelfServeStatus> => {
    const r = await api.post('/verification/self/address', payload);
    return r.data;
  },

  selfGetIdUploadUrl: async (
    documentType: string,
    mimeType: string,
  ): Promise<{ uploadUrl: string; documentId: string; expiresIn: number }> => {
    const r = await api.post('/verification/self/id-upload', { documentType, mimeType });
    return r.data;
  },

  selfConfirmIdUpload: async (
    documentId: string,
  ): Promise<{ ocrResult: any; ocrMatchPassed: boolean }> => {
    const r = await api.post('/verification/self/id-confirm', { documentId });
    return r.data;
  },

  selfSubmitFace: async (payload: {
    mimeType: string;
    qualityHint?: 'good' | 'poor';
  }): Promise<{
    uploadUrl: string;
    storagePath: string;
    faceMatchPassed: boolean;
    faceMatchScore: number;
  }> => {
    const r = await api.post('/verification/self/face-capture', payload);
    return r.data;
  },

  selfSubmitGuardian: async (payload: {
    guardianName: string;
    relationship: string;
    guardianPhone: string;
    guardianAadhaarLast4: string;
  }): Promise<SelfServeStatus> => {
    const r = await api.post('/verification/self/guardian', payload);
    return r.data;
  },

  selfSubmitForApproval: async (): Promise<SelfServeStatus> => {
    const r = await api.post('/verification/self/submit');
    return r.data;
  },

  // ── ML-backed Aadhaar OCR + face match ───────────────────────────
  // These call the new multipart endpoints backed by the apps/kyc-ml
  // Python sidecar. The mobile UI uses these instead of the older
  // signed-URL flow when the Aadhaar-first wizard runs.

  /**
   * Multipart upload of an eAadhaar PDF; validates via Surepass and returns
   * extracted personal details for pre-filling the wizard screens.
   */
  selfProcessEaadhaar: async (
    fileUri: string,
    mimeType: string = 'application/pdf',
    password?: string,
  ): Promise<{
    fullName: string | null;
    dob: string | null;
    gender: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    aadhaarLast4: string | null;
    isMinor: boolean;
  }> => {
    const form = new FormData();
    form.append(
      'file',
      {
        uri: fileUri,
        name: 'eaadhaar.pdf',
        type: mimeType,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    );
    if (password) {
      form.append('password', password);
    }
    const r = await api.post('/verification/self/eaadhaar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: (data) => data,
      timeout: 60000,
    });
    return r.data;
  },

  /** Multipart upload of the Aadhaar image; returns extracted fields. */
  selfProcessAadhaar: async (
    fileUri: string,
    mimeType: string = 'image/jpeg',
  ): Promise<{
    fullName: string | null;
    dob: string | null;
    gender: string | null;
    address: string | null;
    aadhaarLast4: string | null;
    faceStored: boolean;
    isMinor: boolean;
  }> => {
    const form = new FormData();
    // React Native's FormData accepts the {uri, name, type} shape; the
    // upstream Multer interceptor reads it as a normal multipart part.
    form.append(
      'image',
      {
        uri: fileUri,
        name: 'aadhaar.jpg',
        type: mimeType,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    );
    const r = await api.post('/verification/self/aadhaar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: (data) => data, // axios must not JSON-stringify FormData
      timeout: 60000,
    });
    return r.data;
  },

  /** Multipart upload of a live selfie; runs DeepFace match on the API. */
  selfFaceMatch: async (
    fileUri: string,
    mimeType: string = 'image/jpeg',
  ): Promise<{
    matched: boolean;
    similarity: number;
    distance: number;
    threshold: number;
  }> => {
    const form = new FormData();
    form.append(
      'selfie',
      {
        uri: fileUri,
        name: 'selfie.jpg',
        type: mimeType,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    );
    const r = await api.post('/verification/self/face-match', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: (data) => data,
      timeout: 60000,
    });
    return r.data;
  },

  /**
   * Best-effort signed-URL upload of a captured selfie / document. Returns
   * true on HTTP 2xx. The mock backend returns a no-op URL when Supabase is
   * not configured — we still treat those uploads as successful so the
   * staging flow remains testable.
   *
   * To avoid the URL-substring sanitization pitfall, we parse the URL and
   * check the hostname strictly rather than using `String#includes`.
   */
  uploadToSignedUrl: async (
    uploadUrl: string,
    fileUri: string,
    mimeType: string,
  ): Promise<boolean> => {
    let parsed: URL | null = null;
    try {
      parsed = new URL(uploadUrl);
    } catch {
      // Malformed URL — treat as no-op so staging continues to work.
      return true;
    }
    if (parsed.hostname === 'mock-supabase.example.com') {
      // Mock backend — skip the network call entirely.
      return true;
    }
    try {
      const blob = await fetch(fileUri).then((r) => r.blob());
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: blob,
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
