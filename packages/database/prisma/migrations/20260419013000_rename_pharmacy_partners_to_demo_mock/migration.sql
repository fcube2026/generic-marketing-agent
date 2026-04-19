-- Rename legacy branded pharmacy partners to generic demo partners for mock-first MVP usage.
DELETE FROM "pharmacy_partners"
WHERE "code" = 'pharmeasy'
  AND EXISTS (
    SELECT 1
    FROM "pharmacy_partners" existing
    WHERE existing."code" = 'demo-pharmacy'
  );

UPDATE "pharmacy_partners"
SET
  "code" = 'demo-pharmacy',
  "name" = 'Demo Pharmacy',
  "displayName" = 'Curex Demo Pharmacy',
  "description" = 'Primary mock pharmacy partner for Curex24 QA and MVP flows.',
  "apiBaseUrl" = COALESCE(NULLIF("apiBaseUrl", ''), 'https://mock-pharmacy.invalid')
WHERE "code" = 'pharmeasy';

DELETE FROM "pharmacy_partners"
WHERE "code" = 'pharmeasy-express'
  AND EXISTS (
    SELECT 1
    FROM "pharmacy_partners" existing
    WHERE existing."code" = 'demo-pharmacy-express'
  );

UPDATE "pharmacy_partners"
SET
  "code" = 'demo-pharmacy-express',
  "name" = 'Demo Pharmacy Express',
  "displayName" = 'Curex Demo Pharmacy Express',
  "description" = 'Secondary mock pharmacy route for QA and staging verification.',
  "apiBaseUrl" = COALESCE(NULLIF("apiBaseUrl", ''), 'https://mock-pharmacy.invalid')
WHERE "code" = 'pharmeasy-express';