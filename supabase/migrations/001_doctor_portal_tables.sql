-- ============================================================
-- Curex24 Doctor Portal — Supabase Tables
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New Query)
-- ============================================================

-- 1. DOCTORS (provider profiles)
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  specialization TEXT,
  license_number TEXT,
  bio TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  is_available BOOLEAN NOT NULL DEFAULT false,
  home_visit_enabled BOOLEAN NOT NULL DEFAULT false,
  doctor_place_visit_enabled BOOLEAN NOT NULL DEFAULT false,
  video_consultation_enabled BOOLEAN NOT NULL DEFAULT false,
  consultation_fee_home_visit NUMERIC(10,2) NOT NULL DEFAULT 0,
  consultation_fee_doctor_place NUMERIC(10,2) NOT NULL DEFAULT 0,
  consultation_fee_video NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  service_radius NUMERIC(6,2) NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. PATIENTS
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  date_of_birth DATE,
  gender TEXT,
  email TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. SERVICE CATEGORIES
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. BOOKINGS (doctor-patient interactions)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  service_category_id UUID REFERENCES service_categories(id),
  mode TEXT NOT NULL DEFAULT 'HOME_VISIT'
    CHECK (mode IN ('HOME_VISIT', 'DOCTOR_PLACE', 'VIDEO_CONSULTATION')),
  status TEXT NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN (
      'REQUESTED','ACCEPTED','DECLINED','ON_THE_WAY','ARRIVED',
      'IN_PROGRESS','COMPLETED','SUMMARY_SUBMITTED','CLOSED','CANCELLED'
    )),
  scheduled_at TIMESTAMPTZ,
  symptoms TEXT,
  total_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (payment_status IN ('PENDING','PAID','REFUNDED','FAILED')),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. CONSULTATION SUMMARIES
CREATE TABLE IF NOT EXISTS consultation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  symptoms TEXT,
  observations TEXT,
  diagnosis TEXT,
  medicines_advised JSONB DEFAULT '[]',
  next_steps TEXT,
  follow_up_recommendation TEXT,
  diagnostic_tests TEXT,
  specialist_referral TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. EARNINGS / PAYMENTS
CREATE TABLE IF NOT EXISTS earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  booking_id UUID REFERENCES bookings(id),
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'processing')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bookings_doctor ON bookings(doctor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_patient ON bookings(patient_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled ON bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_consultation_summaries_doctor ON consultation_summaries(doctor_id);
CREATE INDEX IF NOT EXISTS idx_earnings_doctor ON earnings(doctor_id);

-- ============================================================
-- ENABLE REALTIME  (allows Supabase Realtime subscriptions)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE consultation_summaries;
ALTER PUBLICATION supabase_realtime ADD TABLE earnings;
ALTER PUBLICATION supabase_realtime ADD TABLE doctors;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- Service categories are public-read
CREATE POLICY "Anyone can read service_categories"
  ON service_categories FOR SELECT USING (true);

-- Doctors can read their own profile
CREATE POLICY "Doctors can view own profile"
  ON doctors FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Doctors can update own profile"
  ON doctors FOR UPDATE USING (auth.uid()::text = user_id);

-- Patients can read their own profile
CREATE POLICY "Patients can view own profile"
  ON patients FOR SELECT USING (auth.uid()::text = user_id);

-- Bookings: doctors see their bookings, patients see theirs
CREATE POLICY "Doctors can view their bookings"
  ON bookings FOR SELECT
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()::text));
CREATE POLICY "Patients can view their bookings"
  ON bookings FOR SELECT
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()::text));
CREATE POLICY "Patients can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()::text));
CREATE POLICY "Doctors can update their bookings"
  ON bookings FOR UPDATE
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()::text));

-- Consultation summaries
CREATE POLICY "Doctors can view their summaries"
  ON consultation_summaries FOR SELECT
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()::text));
CREATE POLICY "Doctors can insert summaries"
  ON consultation_summaries FOR INSERT
  WITH CHECK (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()::text));
CREATE POLICY "Patients can view their summaries"
  ON consultation_summaries FOR SELECT
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()::text));

-- Earnings
CREATE POLICY "Doctors can view their earnings"
  ON earnings FOR SELECT
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()::text));

-- ============================================================
-- UPDATED_AT trigger (auto-update updated_at column)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_doctors
  BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_patients
  BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_bookings
  BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_consultation_summaries
  BEFORE UPDATE ON consultation_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED: Default service categories
-- ============================================================
INSERT INTO service_categories (name, slug, description) VALUES
  ('General Medicine', 'general-medicine', 'Primary care and general health consultations'),
  ('Pediatrics', 'pediatrics', 'Healthcare for infants, children, and adolescents'),
  ('Dermatology', 'dermatology', 'Skin, hair, and nail conditions'),
  ('Orthopedics', 'orthopedics', 'Bone, joint, and muscle conditions'),
  ('Gynecology', 'gynecology', 'Women''s reproductive health'),
  ('ENT', 'ent', 'Ear, nose, and throat conditions'),
  ('Cardiology', 'cardiology', 'Heart and cardiovascular conditions'),
  ('Ophthalmology', 'ophthalmology', 'Eye care and vision conditions')
ON CONFLICT (slug) DO NOTHING;
