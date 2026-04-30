-- AddColumn: kycFaceStoragePath to provider_profiles
-- Stores the KYC face image path/data-URL for home-visit provider identity verification
-- IF NOT EXISTS makes this idempotent so a re-run (e.g. after a stuck-failed state) does not error.
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "kycFaceStoragePath" TEXT;
