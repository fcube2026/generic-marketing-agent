# Patient KYC end-to-end test guide

This document walks you through verifying every piece of the new patient
identity-verification flow:

1. The Python OCR + face-match microservice (`apps/kyc-ml`)
2. The NestJS API endpoints (`apps/api`)
3. The mobile wizard screens (`apps/mobile`)
4. The end-to-end flow on a real device via an EAS dev-client build

> **TL;DR** — Steps 1–3 (Aadhaar upload, Personal Details, Address) work in
> Expo Go. The face-capture step uses `expo-image-picker` so it also works in
> Expo Go today. The `react-native-vision-camera` dependency was added so a
> future blink-liveness UI can be plugged in inside an EAS dev-client build —
> at that point, that one screen will require an EAS build (the rest of the
> app continues to run in Expo Go).

---

## 0. One-time setup

```bash
corepack enable && corepack prepare pnpm@9.4.0 --activate
pnpm install
DATABASE_URL='postgresql://...' pnpm --filter @curex24/database db:generate
```

Apply the new Prisma fields to your local DB (additive — no destructive
changes):

```bash
DATABASE_URL='postgresql://...' \
DIRECT_URL='postgresql://...' \
pnpm --filter @curex24/database exec prisma migrate dev \
  --name add_patient_aadhaar_fields
```

Create the private Supabase Storage bucket the sidecar writes to:

* In the Supabase dashboard → **Storage → New bucket**
  * Name: `verify_faces`
  * **Public:** off
  * No RLS policies needed (the sidecar uses the service-role key).

---

## 1. Run the Python sidecar tests

```bash
cd apps/kyc-ml
python -m pip install \
  'fastapi>=0.110' 'uvicorn[standard]>=0.27' 'python-multipart>=0.0.9' \
  'pydantic>=2.6' 'pydantic-settings>=2.2' \
  'numpy>=1.26,<2.0' 'opencv-python-headless>=4.9' 'Pillow>=10.2' \
  'httpx>=0.27' 'pytest>=8.0' 'pytest-asyncio>=0.23'
python -m pytest -q
```

Expected: **18 passed**. The PaddleOCR/DeepFace heavyweight deps are mocked
out — they only need to be installed when running the sidecar for real.

To run the sidecar locally for real (full models, heavy install):

```bash
cd apps/kyc-ml
docker build -t curex24/kyc-ml .
docker run --rm -p 8001:8001 \
  -e KYC_ML_SHARED_SECRET='dev-secret' \
  -e SUPABASE_URL='https://<project>.supabase.co' \
  -e SUPABASE_SERVICE_ROLE_KEY='<service-role>' \
  -e SUPABASE_BUCKET='verify_faces' \
  curex24/kyc-ml
# health check
curl http://localhost:8001/healthz
```

---

## 2. Run the NestJS tests

```bash
pnpm --filter @curex24/api test -- \
  --testPathPatterns=kyc-ml.client.spec --passWithNoTests --forceExit
```

Expected: **17 passed**.

Build the API:

```bash
DATABASE_URL='postgresql://x:x@x:5432/x' \
pnpm --filter @curex24/database db:generate
pnpm --filter @curex24/api build
```

Run the API with the sidecar wired in:

```bash
KYC_ML_ENABLED=true \
KYC_ML_BASE_URL=http://localhost:8001 \
KYC_ML_SHARED_SECRET=dev-secret \
KYC_ML_TIMEOUT_MS=30000 \
pnpm --filter @curex24/api start:dev
```

Quick smoke test (replace `$JWT` with a patient token):

```bash
curl -X POST http://localhost:3000/verification/self/aadhaar \
  -H "Authorization: Bearer $JWT" \
  -F image=@./aadhaar-sample.jpg
# expected response: { fullName, dob, gender, address, aadhaarLast4, faceStored, isMinor }

curl -X POST http://localhost:3000/verification/self/face-match \
  -H "Authorization: Bearer $JWT" \
  -F selfie=@./selfie-sample.jpg
# expected response: { matched, similarity, distance, threshold }
```

---

## 3. Run the mobile tests

```bash
pnpm --filter @curex24/mobile test -- --passWithNoTests --forceExit
```

Expected: **45 passed** (43 pre-existing + 2 new: `PatientKycAadhaarScreen`).

---

## 4. End-to-end flow on a real device (EAS dev-client)

> An EAS dev-client build is the closest thing to your final production
> binary. It includes every native module declared in `package.json` (so
> `react-native-vision-camera` will be linked in) but still hot-reloads JS
> like Expo Go.

### 4.1 Install the EAS CLI and log in

```bash
npm install -g eas-cli
eas login
```

### 4.2 Configure the project (one-time)

```bash
cd apps/mobile
eas build:configure          # accept the suggested eas.json profiles
```

### 4.3 Build a dev-client

```bash
# Android (recommended for the fastest iteration loop):
eas build --profile development --platform android

# iOS (requires an Apple developer account + provisioning profile):
eas build --profile development --platform ios
```

When the build finishes, EAS prints a QR code and an install URL.

### 4.4 Install + run

* **Android:** scan the QR with your phone, tap Install, then open the app.
* **iOS:** open the install URL in Safari on your iPhone, tap Install.

Now start the JS dev server pointing at your machine:

```bash
cd apps/mobile
pnpm start --dev-client    # NOT `pnpm start --tunnel` for Expo Go
```

Open the dev-client app on your phone and tap **Enter URL manually** → enter
the URL the dev-server printed (e.g. `exp://192.168.1.10:8081`).

### 4.5 Walk through the patient KYC flow

1. **Sign in** as a patient (or sign up + complete the basic profile).
2. From the dashboard, tap **Identity Verification**. You should land on the
   wizard hub with five numbered steps. The first step is now **Upload
   Aadhaar**.
3. **Step 1 — Upload Aadhaar:**
   * Tap **Use camera** (or **Pick from gallery**).
   * Take a clear photo of the front of an Aadhaar card.
   * Tap **Process Aadhaar**. Expect a 10–20 s spinner while the sidecar
     runs OCR + face detection + Supabase upload.
   * On success you should see the extracted name, DOB, and the masked
     Aadhaar number `XXXX XXXX 9012`. The full number is **never** shown.
   * Tap **Continue**.
4. **Step 2 — Personal Details:** the name, DOB and gender are already
   pre-filled from the OCR. Edit any field if needed, then submit.
5. **Step 3 — Residential Address:** the address line is pre-filled from the
   OCR. Fill in city/state/pincode and submit.
6. **Step 4 — Face Verification:**
   * Allow camera permission.
   * Take a live selfie. Look straight at the camera.
   * Tap **OK, use this**. The mobile app POSTs the selfie to
     `/verification/self/face-match`. The sidecar runs DeepFace, deletes the
     stored Aadhaar face, and returns `{ matched: true, similarity: 0.88 }`.
   * Expect ✅ **Face matched with Aadhaar**.
7. **Step 5 — Review & Submit:** confirm everything, submit. The wizard
   marks the verification CONFIRMED and you can now book consultations.

### 4.6 Verify the database state

```sql
select id, status, aadhaar_last4, identity_verified_at, aadhaar_face_storage_path
from "PatientVerification"
where patient_id = '<your patient id>';
```

* `aadhaar_last4` should be the 4 digits visible on the card (e.g. `9012`).
* `identity_verified_at` should be set after step 4 succeeds.
* `aadhaar_face_storage_path` should be **`null`** (the sidecar deleted the
  cropped Aadhaar face after the match).

```sql
select action, created_at
from "VerificationAuditLog"
where verification_id = '<your verification id>'
order by created_at;
```

You should see (in order):

```
SELF_VERIFICATION_STARTED
KYC_ML_OCR_PROCESSED
... (other step audit entries)
KYC_ML_FACE_MATCHED
KYC_ML_AADHAAR_FACE_CLEANED
```

### 4.7 Verify Supabase storage

In the Supabase dashboard → **Storage → verify_faces**: the bucket should
contain *no* objects for this patient after step 4 (the sidecar cleans up).
During step 1, you can transiently see one `<userId>.jpg` object — that is
expected and is removed by step 4.

---

## 5. Failure-path checks

| Scenario | Expected result |
|---|---|
| Upload a blurry Aadhaar with no visible photo | Mobile shows: *"We could not find your photo on the card. Please retake the picture in good lighting."* |
| Upload a non-image file | Mobile shows: *"That file is not a valid image. Please try again."* |
| Step 4 selfie does not match the Aadhaar face | Mobile shows: *"Your selfie did not match the photo on your Aadhaar."*; `KYC_ML_FACE_REJECTED` and `KYC_ML_AADHAAR_FACE_CLEANED` written to audit log; `aadhaar_face_storage_path` cleared. |
| Sidecar offline | Mobile shows: *"identity verification service unavailable"*. The verification record stays at the previous step — no data loss. |
| `KYC_ML_ENABLED=false` on the API | Step 1 returns 400 with the message *"Aadhaar OCR is not enabled in this environment"*. Step 4 falls back to the legacy mock flow automatically. |

---

## 6. Updating an existing dev-client build

If you only changed JavaScript/TypeScript, **no rebuild is needed** — just
restart `pnpm start --dev-client` and reload the app.

You only need a new `eas build --profile development` when:

* You added or removed a native module (e.g. updating
  `react-native-vision-camera`).
* You changed `app.json`/`app.config.ts` permissions, scheme, or icons.
* You bumped the Expo SDK.
