-- Enable Row-Level Security on all tables in the public schema.
--
-- WHY: Supabase exposes every public-schema table via PostgREST. Without RLS,
-- anyone who knows the project URL can read, modify, or delete data using the
-- anon or authenticated key. Enabling RLS with no permissive policies blocks
-- all PostgREST / Supabase-client access while leaving Prisma unaffected
-- (Prisma connects as the table owner, which bypasses RLS).

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "provider_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "provider_licenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "provider_services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "availability_slots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "booking_status_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consultation_summaries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prescriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "diagnostic_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lab_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referrals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payouts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "doctor_kits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "doctor_kit_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "otp_verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "provider_locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questionnaire_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "doctor_verification_logs" ENABLE ROW LEVEL SECURITY;

-- Force RLS even for the table owner (the postgres / supabase_admin role).
-- This ensures that if Supabase ever changes which role owns the tables,
-- they remain locked down. The service_role key (used by Prisma via the
-- connection string) connects as the postgres superuser, which always
-- bypasses RLS regardless of FORCE.

ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "patient_profiles" FORCE ROW LEVEL SECURITY;
ALTER TABLE "provider_profiles" FORCE ROW LEVEL SECURITY;
ALTER TABLE "provider_licenses" FORCE ROW LEVEL SECURITY;
ALTER TABLE "service_categories" FORCE ROW LEVEL SECURITY;
ALTER TABLE "provider_services" FORCE ROW LEVEL SECURITY;
ALTER TABLE "availability_slots" FORCE ROW LEVEL SECURITY;
ALTER TABLE "addresses" FORCE ROW LEVEL SECURITY;
ALTER TABLE "bookings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "booking_status_history" FORCE ROW LEVEL SECURITY;
ALTER TABLE "consultation_summaries" FORCE ROW LEVEL SECURITY;
ALTER TABLE "prescriptions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "diagnostic_requests" FORCE ROW LEVEL SECURITY;
ALTER TABLE "lab_results" FORCE ROW LEVEL SECURITY;
ALTER TABLE "referrals" FORCE ROW LEVEL SECURITY;
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;
ALTER TABLE "payouts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "doctor_kits" FORCE ROW LEVEL SECURITY;
ALTER TABLE "doctor_kit_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "admin_actions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "otp_verifications" FORCE ROW LEVEL SECURITY;
ALTER TABLE "provider_locations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
ALTER TABLE "questionnaire_responses" FORCE ROW LEVEL SECURITY;
ALTER TABLE "doctor_verification_logs" FORCE ROW LEVEL SECURITY;
