-- Enable Row-Level Security on all tables in the public schema.
--
-- WHY: Supabase exposes every public-schema table via PostgREST. Without RLS,
-- anyone who knows the project URL can read, modify, or delete data using the
-- anon or authenticated key. Enabling RLS with no permissive policies blocks
-- all PostgREST / Supabase-client access while leaving Prisma unaffected
-- (Prisma connects as the table owner, which bypasses RLS).
--
-- Uses a DO block so that tables that don't exist yet are silently skipped.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users','patient_profiles','provider_profiles','provider_licenses',
      'service_categories','provider_services','availability_slots','addresses',
      'bookings','booking_status_history','consultation_summaries','prescriptions',
      'diagnostic_requests','lab_results','referrals','payments','payouts',
      'doctor_kits','doctor_kit_items','audit_logs','admin_actions',
      'otp_verifications','provider_locations','notifications',
      'questionnaire_responses','doctor_verification_logs'
    ])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tbl) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    END IF;
  END LOOP;
END
$$;
