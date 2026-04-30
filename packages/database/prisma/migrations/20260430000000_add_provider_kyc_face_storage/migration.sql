-- AddColumn: kycFaceStoragePath to provider_profiles
-- Stores the KYC face image path/data-URL for home-visit provider identity verification
ALTER TABLE "provider_profiles" ADD COLUMN "kycFaceStoragePath" TEXT;
