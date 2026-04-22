BEGIN;
INSERT INTO users (id, phone, role, "createdAt", "updatedAt") VALUES
  ('demo-user-1', '+919000000001', 'PROVIDER', NOW(), NOW()),
  ('demo-user-2', '+919000000002', 'PROVIDER', NOW(), NOW()),
  ('demo-user-3', '+919000000003', 'PROVIDER', NOW(), NOW()),
  ('demo-user-4', '+919000000004', 'PROVIDER', NOW(), NOW())
ON CONFLICT (phone) DO UPDATE SET role = 'PROVIDER', "updatedAt" = NOW();
INSERT INTO provider_profiles (
  id, "userId", name, specialization, "contactInfo", "clinicAddress",
  "isVerified", "isActive", "isAvailable",
  "homeVisitEnabled", "doctorPlaceVisitEnabled",
  "consultationFeeHomeVisit", "consultationFeeDoctorPlace",
  "currentLat", "currentLng", "serviceRadius",
  "createdAt", "updatedAt"
) VALUES
  ('demo-prov-1', 'demo-user-1', 'Dr. Asha Verma',  'General Medicine', '+919000000001', 'Connaught Place, New Delhi', true, true, true, true, true, 700, 400, 28.6139, 77.2090, 25, NOW(), NOW()),
  ('demo-prov-2', 'demo-user-2', 'Dr. Rohan Mehta', 'Pediatrics',       '+919000000002', 'Karol Bagh, New Delhi',      true, true, true, true, true, 800, 450, 28.6519, 77.1909, 20, NOW(), NOW()),
  ('demo-prov-3', 'demo-user-3', 'Dr. Priya Singh', 'Dermatology',      '+919000000003', 'Saket, New Delhi',           true, true, true, true, true, 900, 500, 28.5245, 77.2066, 30, NOW(), NOW()),
  ('demo-prov-4', 'demo-user-4', 'Dr. Arjun Kapoor','Physiotherapy',    '+919000000004', 'Dwarka, New Delhi',          true, true, true, true, true, 600, 350, 28.5921, 77.0460, 25, NOW(), NOW())
ON CONFLICT ("userId") DO UPDATE SET
  "isVerified" = true, "isActive" = true, "isAvailable" = true,
  "homeVisitEnabled" = true, "doctorPlaceVisitEnabled" = true,
  "currentLat" = EXCLUDED."currentLat", "currentLng" = EXCLUDED."currentLng",
  "serviceRadius" = EXCLUDED."serviceRadius",
  "updatedAt" = NOW();
INSERT INTO provider_services (id, "providerId", "serviceCategoryId")
SELECT 'demo-ps-' || pp.id || '-' || sc.id, pp.id, sc.id
FROM provider_profiles pp CROSS JOIN service_categories sc
WHERE pp.id LIKE 'demo-prov-%'
ON CONFLICT ("providerId", "serviceCategoryId") DO NOTHING;
COMMIT;
SELECT COUNT(*) AS providers FROM provider_profiles WHERE id LIKE 'demo-prov-%';
SELECT COUNT(*) AS provider_services FROM provider_services WHERE "providerId" LIKE 'demo-prov-%';
