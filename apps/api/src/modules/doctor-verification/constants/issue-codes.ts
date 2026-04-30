export const ISSUE_CODES = {
  FULLY_VERIFIED: 100,
  VERIFIED_VIA_DOCUMENTS: 200,
  NOT_FOUND_IN_OFFICIAL_RECORDS: 300,
  DATA_MISMATCH: 400,
  PENDING_ADMIN_APPROVAL: 500,
  FACE_MISMATCH: 600,
  INCOMPLETE_SUBMISSION: 700,
} as const;

export type IssueCode = (typeof ISSUE_CODES)[keyof typeof ISSUE_CODES];

export const ISSUE_CODE_LABELS: Record<number, string> = {
  100: 'Fully Verified',
  200: 'Verified via Documents',
  300: 'Not Found in Official Records',
  400: 'Data Mismatch',
  500: 'Pending Admin Approval',
  600: 'Face Mismatch',
  700: 'Incomplete Submission',
};

/** Confidence score weights per verification source (out of 100). */
export const CONFIDENCE_WEIGHTS = {
  NMC_API: 65,
  DIGILOCKER: 15,
  OCR: 10,
  FACE: 10,
} as const;
