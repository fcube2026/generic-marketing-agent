/**
 * Curex24 Doctor Portal — Seed Data
 * ─────────────────────────────────
 * Used for local testing before Supabase connection is wired.
 * Set USE_SEED = false and remove imports when connecting to real API.
 */

export const USE_SEED = true;

// ─── Types ────────────────────────────────────────────────────────────────────

export type Gender = 'Male' | 'Female' | 'Other';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type ConsultationType = 'in_person' | 'video' | 'teleconsult';
export type ConsultationStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type ReportStatus = 'pending' | 'in_progress' | 'completed';
export type ParamStatus = 'normal' | 'high' | 'low' | 'critical';

export interface Vitals {
  bp: string;           // e.g. "120/80 mmHg"
  tempF: number;        // fahrenheit
  pulsePerMin: number;
  spo2Percent: number;
  weightKg: number;
  heightCm: number;
  bmi: number;
  rr: number;           // respiratory rate
}

export interface PrescriptionItem {
  id: string;
  medication: string;
  genericName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: 'Oral' | 'Topical' | 'Injection' | 'Inhalation' | 'Sublingual';
  instructions: string;
  refills: number;
}

export interface LabParameter {
  name: string;
  value: string;
  unit: string;
  normalRange: string;
  status: ParamStatus;
}

export interface LabReport {
  id: string;
  testName: string;
  requestedDate: string;
  reportDate: string | null;
  status: ReportStatus;
  labName: string;
  findings: string;
  parameters: LabParameter[];
}

export interface Consultation {
  id: string;
  uhid: string;
  doctorName: string;
  doctorId: string;
  specialty: string;
  date: string;
  scheduledAt: string;
  type: ConsultationType;
  status: ConsultationStatus;
  chiefComplaint: string;
  diagnosis: string;
  icd10Code: string;
  clinicalNotes: string;
  followUpDate: string | null;
  vitals: Vitals | null;
  prescription: PrescriptionItem[];
  labReports: LabReport[];
  referral: string | null;
  durationMin: number;
}

export interface Patient {
  uhid: string;
  name: string;
  dob: string;
  age: number;
  gender: Gender;
  phone: string;
  email: string;
  bloodGroup: BloodGroup;
  address: string;
  city: string;
  state: string;
  pincode: string;
  emergencyContact: { name: string; relation: string; phone: string };
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  insuranceId: string | null;
  registeredAt: string;
  profilePhotoInitials: string; // 2-letter fallback
  consultations: Consultation[];
}

// ─── Seed Patients ────────────────────────────────────────────────────────────

export const SEED_PATIENTS: Patient[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // PATIENT 1: Priya Sharma
  // ──────────────────────────────────────────────────────────────────────────
  {
    uhid: 'CRX-2024-000001',
    name: 'Priya Sharma',
    dob: '1990-05-15',
    age: 35,
    gender: 'Female',
    phone: '+91-9876543210',
    email: 'priya.sharma@gmail.com',
    bloodGroup: 'B+',
    address: '123, MG Road, Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560095',
    emergencyContact: { name: 'Rahul Sharma', relation: 'Spouse', phone: '+91-9876543211' },
    allergies: ['Penicillin', 'Sulfonamides'],
    chronicConditions: ['Hypertension', 'Hypothyroidism'],
    currentMedications: ['Amlodipine 5mg OD', 'Levothyroxine 50mcg OD'],
    insuranceId: 'STAR-HLTH-987654',
    registeredAt: '2024-01-10T09:30:00Z',
    profilePhotoInitials: 'PS',
    consultations: [
      {
        id: 'CONS-2024-0001',
        uhid: 'CRX-2024-000001',
        doctorName: 'Dr. Arjun Mehta',
        doctorId: 'DOC-001',
        specialty: 'Internal Medicine',
        date: '2026-04-15',
        scheduledAt: '2026-04-15T10:00:00Z',
        type: 'in_person',
        status: 'completed',
        chiefComplaint: 'Persistent headache and dizziness for 3 days',
        diagnosis: 'Hypertensive urgency with tension headache',
        icd10Code: 'I16.0',
        clinicalNotes:
          'Patient presents with BP 162/98 mmHg. History of poorly controlled hypertension. Reports missing Amlodipine doses for 2 days. Advised strict medication adherence. Dietary salt restriction reinforced. ECG normal. Ophthalmoscopy — no papilloedema. Review in 1 week.',
        followUpDate: '2026-04-22',
        durationMin: 25,
        vitals: {
          bp: '162/98',
          tempF: 98.4,
          pulsePerMin: 92,
          spo2Percent: 98,
          weightKg: 64,
          heightCm: 162,
          bmi: 24.4,
          rr: 16,
        },
        prescription: [
          {
            id: 'RX-0001-01',
            medication: 'Amlodipine',
            genericName: 'Amlodipine Besylate',
            dosage: '5 mg',
            frequency: 'Once daily — morning',
            duration: '30 days',
            route: 'Oral',
            instructions: 'Take at the same time every day. Do not skip doses.',
            refills: 2,
          },
          {
            id: 'RX-0001-02',
            medication: 'Metoprolol Succinate',
            genericName: 'Metoprolol Succinate ER',
            dosage: '25 mg',
            frequency: 'Once daily — morning',
            duration: '30 days',
            route: 'Oral',
            instructions: 'Swallow whole, do not crush. Do not stop abruptly.',
            refills: 1,
          },
          {
            id: 'RX-0001-03',
            medication: 'Paracetamol',
            genericName: 'Acetaminophen',
            dosage: '500 mg',
            frequency: 'SOS — every 6 hours if pain',
            duration: '5 days',
            route: 'Oral',
            instructions: 'Take only if headache persists. Max 4 doses/day.',
            refills: 0,
          },
        ],
        labReports: [
          {
            id: 'LAB-0001-01',
            testName: 'Complete Blood Count (CBC)',
            requestedDate: '2026-04-15',
            reportDate: '2026-04-16',
            status: 'completed',
            labName: 'SRL Diagnostics, Koramangala',
            findings:
              'CBC within normal limits. No anaemia. WBC counts normal. Platelets adequate.',
            parameters: [
              { name: 'Haemoglobin', value: '13.2', unit: 'g/dL', normalRange: '12–16', status: 'normal' },
              { name: 'WBC Count', value: '7800', unit: 'cells/µL', normalRange: '4000–11000', status: 'normal' },
              { name: 'Platelet Count', value: '2.4 lac', unit: 'cells/µL', normalRange: '1.5–4.5 lac', status: 'normal' },
              { name: 'RBC', value: '4.5', unit: 'million/µL', normalRange: '4.2–5.4', status: 'normal' },
            ],
          },
          {
            id: 'LAB-0001-02',
            testName: 'Renal Function Test (RFT)',
            requestedDate: '2026-04-15',
            reportDate: '2026-04-16',
            status: 'completed',
            labName: 'SRL Diagnostics, Koramangala',
            findings: 'Mild elevation in serum creatinine. Monitor renal function at next visit.',
            parameters: [
              { name: 'Serum Creatinine', value: '1.18', unit: 'mg/dL', normalRange: '0.5–1.1', status: 'high' },
              { name: 'BUN', value: '18', unit: 'mg/dL', normalRange: '7–20', status: 'normal' },
              { name: 'eGFR', value: '72', unit: 'mL/min/1.73m²', normalRange: '>60', status: 'normal' },
              { name: 'Serum Sodium', value: '140', unit: 'mEq/L', normalRange: '136–145', status: 'normal' },
              { name: 'Serum Potassium', value: '4.1', unit: 'mEq/L', normalRange: '3.5–5.0', status: 'normal' },
            ],
          },
        ],
        referral: null,
      },
      {
        id: 'CONS-2024-0002',
        uhid: 'CRX-2024-000001',
        doctorName: 'Dr. Arjun Mehta',
        doctorId: 'DOC-001',
        specialty: 'Internal Medicine',
        date: '2026-03-01',
        scheduledAt: '2026-03-01T11:00:00Z',
        type: 'teleconsult',
        status: 'completed',
        chiefComplaint: 'Follow-up for hypothyroidism — routine review',
        diagnosis: 'Hypothyroidism, well-controlled on Levothyroxine',
        icd10Code: 'E03.9',
        clinicalNotes:
          'TSH within normal limits at 2.8 mIU/L. Patient reports improved energy levels and no palpitations. Continue current dose. Recheck TSH in 6 months. Diet and lifestyle counselling given.',
        followUpDate: '2026-09-01',
        durationMin: 15,
        vitals: {
          bp: '128/82',
          tempF: 98.2,
          pulsePerMin: 74,
          spo2Percent: 99,
          weightKg: 63,
          heightCm: 162,
          bmi: 24.0,
          rr: 14,
        },
        prescription: [
          {
            id: 'RX-0002-01',
            medication: 'Levothyroxine',
            genericName: 'Levothyroxine Sodium',
            dosage: '50 mcg',
            frequency: 'Once daily — empty stomach, 30 min before breakfast',
            duration: '180 days',
            route: 'Oral',
            instructions: 'Take 30 minutes before food. Avoid calcium/iron supplements within 4 hours.',
            refills: 3,
          },
        ],
        labReports: [
          {
            id: 'LAB-0002-01',
            testName: 'Thyroid Function Test (TFT)',
            requestedDate: '2026-02-28',
            reportDate: '2026-03-01',
            status: 'completed',
            labName: 'Metropolis Healthcare',
            findings: 'TSH within reference range. T3, T4 normal. Levothyroxine dose is adequate.',
            parameters: [
              { name: 'TSH', value: '2.8', unit: 'mIU/L', normalRange: '0.4–4.0', status: 'normal' },
              { name: 'Free T3', value: '3.1', unit: 'pg/mL', normalRange: '2.3–4.2', status: 'normal' },
              { name: 'Free T4', value: '1.2', unit: 'ng/dL', normalRange: '0.8–1.8', status: 'normal' },
            ],
          },
        ],
        referral: null,
      },
      {
        id: 'CONS-2026-0010',
        uhid: 'CRX-2024-000001',
        doctorName: 'Dr. Arjun Mehta',
        doctorId: 'DOC-001',
        specialty: 'Internal Medicine',
        date: '2026-04-22',
        scheduledAt: '2026-04-22T10:30:00Z',
        type: 'in_person',
        status: 'scheduled',
        chiefComplaint: 'Hypertension follow-up',
        diagnosis: '',
        icd10Code: '',
        clinicalNotes: '',
        followUpDate: null,
        durationMin: 0,
        vitals: null,
        prescription: [],
        labReports: [],
        referral: null,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PATIENT 2: Rajesh Kumar
  // ──────────────────────────────────────────────────────────────────────────
  {
    uhid: 'CRX-2024-000002',
    name: 'Rajesh Kumar',
    dob: '1979-11-03',
    age: 46,
    gender: 'Male',
    phone: '+91-9823456780',
    email: 'rajesh.kumar79@yahoo.com',
    bloodGroup: 'O+',
    address: '45, Sector 18, Noida',
    city: 'Noida',
    state: 'Uttar Pradesh',
    pincode: '201301',
    emergencyContact: { name: 'Sunita Kumar', relation: 'Wife', phone: '+91-9823456781' },
    allergies: ['Aspirin'],
    chronicConditions: ['Type 2 Diabetes Mellitus', 'Dyslipidaemia'],
    currentMedications: ['Metformin 500mg BD', 'Atorvastatin 10mg HS', 'Glimepiride 1mg OD'],
    insuranceId: 'NIVA-BUPA-234567',
    registeredAt: '2024-03-22T10:00:00Z',
    profilePhotoInitials: 'RK',
    consultations: [
      {
        id: 'CONS-2024-0003',
        uhid: 'CRX-2024-000002',
        doctorName: 'Dr. Arjun Mehta',
        doctorId: 'DOC-001',
        specialty: 'Endocrinology',
        date: '2026-04-10',
        scheduledAt: '2026-04-10T09:00:00Z',
        type: 'in_person',
        status: 'completed',
        chiefComplaint: 'Increased thirst, polyuria, fatigue — 2 weeks',
        diagnosis: 'Type 2 DM — Suboptimal glycaemic control',
        icd10Code: 'E11.9',
        clinicalNotes:
          'HbA1c elevated at 8.6%. FBS 186, PPBS 248. Patient admits poor dietary compliance. Added Sitagliptin 50mg to existing regimen. Detailed dietary counselling. Foot examination — no ulcers. Referred to ophthalmology for annual retinal screening. Next review in 4 weeks with repeat HbA1c.',
        followUpDate: '2026-05-10',
        durationMin: 35,
        vitals: {
          bp: '134/88',
          tempF: 98.6,
          pulsePerMin: 80,
          spo2Percent: 97,
          weightKg: 83,
          heightCm: 172,
          bmi: 28.1,
          rr: 15,
        },
        prescription: [
          {
            id: 'RX-0003-01',
            medication: 'Metformin',
            genericName: 'Metformin Hydrochloride',
            dosage: '500 mg',
            frequency: 'Twice daily — with meals',
            duration: '30 days',
            route: 'Oral',
            instructions: 'Take with meals to reduce GI side effects.',
            refills: 2,
          },
          {
            id: 'RX-0003-02',
            medication: 'Sitagliptin',
            genericName: 'Sitagliptin Phosphate',
            dosage: '50 mg',
            frequency: 'Once daily — morning',
            duration: '30 days',
            route: 'Oral',
            instructions: 'Can be taken with or without food.',
            refills: 1,
          },
          {
            id: 'RX-0003-03',
            medication: 'Glimepiride',
            genericName: 'Glimepiride',
            dosage: '1 mg',
            frequency: 'Once daily — before breakfast',
            duration: '30 days',
            route: 'Oral',
            instructions: 'Take 15 minutes before breakfast. Watch for hypoglycaemia.',
            refills: 1,
          },
          {
            id: 'RX-0003-04',
            medication: 'Atorvastatin',
            genericName: 'Atorvastatin Calcium',
            dosage: '20 mg',
            frequency: 'Once daily — at bedtime',
            duration: '90 days',
            route: 'Oral',
            instructions: 'Avoid grapefruit juice. Report muscle pain immediately.',
            refills: 2,
          },
        ],
        labReports: [
          {
            id: 'LAB-0003-01',
            testName: 'HbA1c + Fasting Blood Sugar',
            requestedDate: '2026-04-10',
            reportDate: '2026-04-11',
            status: 'completed',
            labName: 'Thyrocare, Noida',
            findings:
              'HbA1c significantly elevated indicating poor 3-month glycaemic control. FBS above target. Intensification of therapy warranted.',
            parameters: [
              { name: 'HbA1c', value: '8.6', unit: '%', normalRange: '<7.0 (diabetic target)', status: 'high' },
              { name: 'Fasting Blood Sugar', value: '186', unit: 'mg/dL', normalRange: '70–100', status: 'high' },
              { name: 'Post-Prandial Blood Sugar', value: '248', unit: 'mg/dL', normalRange: '<140', status: 'high' },
            ],
          },
          {
            id: 'LAB-0003-02',
            testName: 'Lipid Profile',
            requestedDate: '2026-04-10',
            reportDate: '2026-04-11',
            status: 'completed',
            labName: 'Thyrocare, Noida',
            findings:
              'LDL borderline elevated. HDL low. Triglycerides elevated. Lipid-lowering therapy dose escalated.',
            parameters: [
              { name: 'Total Cholesterol', value: '218', unit: 'mg/dL', normalRange: '<200', status: 'high' },
              { name: 'LDL Cholesterol', value: '138', unit: 'mg/dL', normalRange: '<100 (diabetic)', status: 'high' },
              { name: 'HDL Cholesterol', value: '36', unit: 'mg/dL', normalRange: '>40', status: 'low' },
              { name: 'Triglycerides', value: '198', unit: 'mg/dL', normalRange: '<150', status: 'high' },
            ],
          },
        ],
        referral: 'Ophthalmology — Annual diabetic retinal screening',
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PATIENT 3: Ananya Patel
  // ──────────────────────────────────────────────────────────────────────────
  {
    uhid: 'CRX-2025-000003',
    name: 'Ananya Patel',
    dob: '1997-07-22',
    age: 28,
    gender: 'Female',
    phone: '+91-9712345678',
    email: 'ananya.patel97@gmail.com',
    bloodGroup: 'A+',
    address: '8B, Satellite Road, Bodakdev',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380054',
    emergencyContact: { name: 'Kiran Patel', relation: 'Father', phone: '+91-9712345679' },
    allergies: ['Dust', 'Pollen', 'Cat dander'],
    chronicConditions: ['Bronchial Asthma', 'Allergic Rhinitis'],
    currentMedications: ['Budesonide/Formoterol 160/4.5mcg inhaler BD', 'Montelukast 10mg HS'],
    insuranceId: null,
    registeredAt: '2025-02-14T14:00:00Z',
    profilePhotoInitials: 'AP',
    consultations: [
      {
        id: 'CONS-2025-0004',
        uhid: 'CRX-2025-000003',
        doctorName: 'Dr. Arjun Mehta',
        doctorId: 'DOC-001',
        specialty: 'Pulmonology',
        date: '2026-04-08',
        scheduledAt: '2026-04-08T14:00:00Z',
        type: 'video',
        status: 'completed',
        chiefComplaint: 'Nocturnal wheezing and shortness of breath — worsened past 1 week',
        diagnosis: 'Bronchial Asthma — Mild-to-moderate exacerbation',
        icd10Code: 'J45.40',
        clinicalNotes:
          'Patient reports increased rescue inhaler use (>3 times/week). Possible allergen exposure at new workplace. SpO2 96% at rest. Lungs — bilateral expiratory wheeze. No cyanosis. PEF 72% predicted. Step up therapy initiated. Advised allergen avoidance measures at workplace. Spirometry ordered. Emergency action plan given.',
        followUpDate: '2026-05-01',
        durationMin: 20,
        vitals: {
          bp: '110/70',
          tempF: 98.6,
          pulsePerMin: 88,
          spo2Percent: 96,
          weightKg: 54,
          heightCm: 158,
          bmi: 21.6,
          rr: 20,
        },
        prescription: [
          {
            id: 'RX-0004-01',
            medication: 'Budesonide + Formoterol',
            genericName: 'Budesonide/Formoterol Fumarate',
            dosage: '160/4.5 mcg',
            frequency: 'Two puffs twice daily — morning and evening',
            duration: '30 days',
            route: 'Inhalation',
            instructions: 'Rinse mouth after each use. Use spacer device.',
            refills: 1,
          },
          {
            id: 'RX-0004-02',
            medication: 'Salbutamol',
            genericName: 'Albuterol/Salbutamol',
            dosage: '100 mcg',
            frequency: 'SOS — 2 puffs when needed (max 8 puffs/day)',
            duration: '30 days',
            route: 'Inhalation',
            instructions: 'Rescue inhaler. If using >3 times/week, contact doctor.',
            refills: 0,
          },
          {
            id: 'RX-0004-03',
            medication: 'Montelukast',
            genericName: 'Montelukast Sodium',
            dosage: '10 mg',
            frequency: 'Once daily — bedtime',
            duration: '30 days',
            route: 'Oral',
            instructions: 'Take consistently every evening.',
            refills: 1,
          },
          {
            id: 'RX-0004-04',
            medication: 'Prednisolone',
            genericName: 'Prednisolone',
            dosage: '20 mg',
            frequency: 'Once daily — morning with food',
            duration: '5 days (tapering course)',
            route: 'Oral',
            instructions: 'Short course. Take with food. Do not stop abruptly.',
            refills: 0,
          },
        ],
        labReports: [
          {
            id: 'LAB-0004-01',
            testName: 'Spirometry (PFT)',
            requestedDate: '2026-04-08',
            reportDate: null,
            status: 'pending',
            labName: 'Ahmedabad Chest Clinic',
            findings: 'Awaiting results',
            parameters: [],
          },
        ],
        referral: null,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PATIENT 4: Suresh Reddy
  // ──────────────────────────────────────────────────────────────────────────
  {
    uhid: 'CRX-2025-000004',
    name: 'Suresh Reddy',
    dob: '1963-03-10',
    age: 63,
    gender: 'Male',
    phone: '+91-9989876543',
    email: 'sreddy1963@rediffmail.com',
    bloodGroup: 'AB+',
    address: '22, Film Nagar, Jubilee Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500033',
    emergencyContact: { name: 'Kavitha Reddy', relation: 'Daughter', phone: '+91-9898765432' },
    allergies: [],
    chronicConditions: ['Osteoarthritis (bilateral knees)', 'Hypertension', 'Benign Prostatic Hyperplasia'],
    currentMedications: ['Telmisartan 40mg OD', 'Tamsulosin 0.4mg HS', 'Calcium + Vit D3 BD'],
    insuranceId: 'HDFC-ERGO-456789',
    registeredAt: '2025-06-01T08:00:00Z',
    profilePhotoInitials: 'SR',
    consultations: [
      {
        id: 'CONS-2025-0005',
        uhid: 'CRX-2025-000004',
        doctorName: 'Dr. Arjun Mehta',
        doctorId: 'DOC-001',
        specialty: 'Orthopaedics',
        date: '2026-04-12',
        scheduledAt: '2026-04-12T11:00:00Z',
        type: 'in_person',
        status: 'completed',
        chiefComplaint: 'Severe bilateral knee pain — difficulty climbing stairs for 6 months',
        diagnosis: 'Bilateral Osteoarthritis Knee — Grade III (Kellgren-Lawrence)',
        icd10Code: 'M17.1',
        clinicalNotes:
          'Patient presents with bilateral knee crepitus, restricted ROM (flexion 90°). Muscle wasting around knees. X-ray shows Grade III OA changes — joint space narrowing, osteophytes. Pain score 7/10. Initiated combined analgesic + physiotherapy plan. Intra-articular hyaluronic acid injection left knee administered today. Referred for physiotherapy assessment. Knee replacement discussed as future option if conservative management fails.',
        followUpDate: '2026-05-12',
        durationMin: 40,
        vitals: {
          bp: '138/90',
          tempF: 98.4,
          pulsePerMin: 76,
          spo2Percent: 98,
          weightKg: 88,
          heightCm: 168,
          bmi: 31.2,
          rr: 14,
        },
        prescription: [
          {
            id: 'RX-0005-01',
            medication: 'Etoricoxib',
            genericName: 'Etoricoxib',
            dosage: '60 mg',
            frequency: 'Once daily — after food',
            duration: '14 days',
            route: 'Oral',
            instructions: 'Take after meals. Avoid if experiencing chest pain or stomach upset.',
            refills: 0,
          },
          {
            id: 'RX-0005-02',
            medication: 'Pantoprazole',
            genericName: 'Pantoprazole Sodium',
            dosage: '40 mg',
            frequency: 'Once daily — 30 min before breakfast',
            duration: '14 days',
            route: 'Oral',
            instructions: 'Protects stomach lining while on NSAID.',
            refills: 0,
          },
          {
            id: 'RX-0005-03',
            medication: 'Glucosamine + Chondroitin',
            genericName: 'Glucosamine Sulphate + Chondroitin Sulphate',
            dosage: '750mg/600mg',
            frequency: 'Once daily — with food',
            duration: '90 days',
            route: 'Oral',
            instructions: 'Long-term cartilage support supplement.',
            refills: 2,
          },
          {
            id: 'RX-0005-04',
            medication: 'Diclofenac Gel',
            genericName: 'Diclofenac Diethylamine',
            dosage: '1.16% w/w',
            frequency: 'Apply to knees 3 times daily',
            duration: '30 days',
            route: 'Topical',
            instructions: 'Apply thin layer, massage gently. Wash hands after application.',
            refills: 1,
          },
        ],
        labReports: [
          {
            id: 'LAB-0005-01',
            testName: 'X-Ray Bilateral Knees (Weight-bearing AP & Lateral)',
            requestedDate: '2026-04-12',
            reportDate: '2026-04-12',
            status: 'completed',
            labName: 'Yashoda Imaging, Hyderabad',
            findings:
              'Bilateral Grade III osteoarthritic changes. Medial joint space narrowing bilaterally (left > right). Marginal osteophytes present at tibio-femoral and patello-femoral joints. Subchondral sclerosis noted. No fracture or dislocation.',
            parameters: [],
          },
        ],
        referral: 'Physiotherapy — Knee strengthening & gait training programme',
      },
      {
        id: 'CONS-2026-0011',
        uhid: 'CRX-2025-000004',
        doctorName: 'Dr. Arjun Mehta',
        doctorId: 'DOC-001',
        specialty: 'Internal Medicine',
        date: '2026-04-18',
        scheduledAt: '2026-04-18T15:00:00Z',
        type: 'in_person',
        status: 'in_progress',
        chiefComplaint: 'Routine hypertension check',
        diagnosis: 'Hypertension — follow-up',
        icd10Code: 'I10',
        clinicalNotes: 'BP today 144/92. On Telmisartan. Dose adjustment being considered.',
        followUpDate: null,
        durationMin: 0,
        vitals: {
          bp: '144/92',
          tempF: 98.2,
          pulsePerMin: 78,
          spo2Percent: 98,
          weightKg: 88,
          heightCm: 168,
          bmi: 31.2,
          rr: 14,
        },
        prescription: [],
        labReports: [],
        referral: null,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PATIENT 5: Meera Nair
  // ──────────────────────────────────────────────────────────────────────────
  {
    uhid: 'CRX-2026-000005',
    name: 'Meera Nair',
    dob: '1994-12-01',
    age: 31,
    gender: 'Female',
    phone: '+91-9445678901',
    email: 'meera.nair.kochi@gmail.com',
    bloodGroup: 'O-',
    address: '14, Marine Drive, Ernakulam',
    city: 'Kochi',
    state: 'Kerala',
    pincode: '682011',
    emergencyContact: { name: 'Rajan Nair', relation: 'Father', phone: '+91-9445678902' },
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    insuranceId: null,
    registeredAt: '2026-04-01T12:00:00Z',
    profilePhotoInitials: 'MN',
    consultations: [
      {
        id: 'CONS-2026-0006',
        uhid: 'CRX-2026-000005',
        doctorName: 'Dr. Arjun Mehta',
        doctorId: 'DOC-001',
        specialty: 'General Practice',
        date: '2026-04-17',
        scheduledAt: '2026-04-17T13:00:00Z',
        type: 'in_person',
        status: 'completed',
        chiefComplaint: 'Sore throat, low-grade fever, body aches — 4 days',
        diagnosis: 'Acute Viral Pharyngitis with Myalgia',
        icd10Code: 'J02.9',
        clinicalNotes:
          'New patient. Throat hyperaemic, no pus. No lymphadenopathy. Fever 99.8°F. Rapid strep — negative. Viral aetiology most likely. Symptomatic management. Advised rest and adequate fluids. Return if fever persists >5 days or if worsening.',
        followUpDate: null,
        durationMin: 15,
        vitals: {
          bp: '108/68',
          tempF: 99.8,
          pulsePerMin: 90,
          spo2Percent: 98,
          weightKg: 56,
          heightCm: 163,
          bmi: 21.1,
          rr: 16,
        },
        prescription: [
          {
            id: 'RX-0006-01',
            medication: 'Paracetamol',
            genericName: 'Acetaminophen',
            dosage: '650 mg',
            frequency: 'Every 6–8 hours as needed for fever/pain',
            duration: '5 days',
            route: 'Oral',
            instructions: 'Take after food. Do not exceed 4g/day.',
            refills: 0,
          },
          {
            id: 'RX-0006-02',
            medication: 'Cetirizine',
            genericName: 'Cetirizine Hydrochloride',
            dosage: '10 mg',
            frequency: 'Once daily — bedtime',
            duration: '5 days',
            route: 'Oral',
            instructions: 'May cause drowsiness. Avoid driving.',
            refills: 0,
          },
          {
            id: 'RX-0006-03',
            medication: 'Benzydamine Gargle',
            genericName: 'Benzydamine HCl',
            dosage: '0.15% solution',
            frequency: 'Gargle 15 mL every 3 hours',
            duration: '5 days',
            route: 'Topical',
            instructions: 'Do not swallow. Spit out after gargling.',
            refills: 0,
          },
        ],
        labReports: [],
        referral: null,
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get a patient by UHID */
export function getPatientByUHID(uhid: string): Patient | undefined {
  return SEED_PATIENTS.find((p) => p.uhid === uhid);
}

/** Get a consultation across all patients */
export function getConsultationById(consultationId: string): { patient: Patient; consultation: Consultation } | undefined {
  for (const patient of SEED_PATIENTS) {
    const consultation = patient.consultations.find((c) => c.id === consultationId);
    if (consultation) return { patient, consultation };
  }
  return undefined;
}

/** Aggregate dashboard stats from seed data */
export function getSeedDashboardStats() {
  const today = new Date().toISOString().split('T')[0];
  const allConsultations = SEED_PATIENTS.flatMap((p) => p.consultations);

  return {
    totalPatients: SEED_PATIENTS.length,
    todayConsultations: allConsultations.filter((c) => c.date === today).length,
    upcomingConsultations: allConsultations.filter((c) => c.status === 'scheduled').length,
    inProgressConsultations: allConsultations.filter((c) => c.status === 'in_progress').length,
    completedConsultations: allConsultations.filter((c) => c.status === 'completed').length,
    pendingLabReports: allConsultations
      .flatMap((c) => c.labReports)
      .filter((r) => r.status === 'pending').length,
    totalEarnings: 48500,
  };
}

/** Flattened consultation list for the consultations page */
export function getSeedConsultationsList() {
  return SEED_PATIENTS.flatMap((patient) =>
    patient.consultations.map((c) => ({
      ...c,
      patientName: patient.name,
      patientUHID: patient.uhid,
      patientAge: patient.age,
      patientGender: patient.gender,
    }))
  ).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
}
