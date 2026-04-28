# `@curex24/kyc-ml` — Aadhaar OCR + Face-Match Sidecar

A small Python/FastAPI microservice that performs the **two heavy ML steps** of patient KYC:

| Endpoint                       | What it does                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `POST /process-aadhaar`        | OCRs an Aadhaar card image, returns extracted fields, crops the face, uploads it to Supabase `verify_faces/`. |
| `POST /verify-patient-identity`| Compares a live selfie to the previously cropped Aadhaar face using DeepFace `Facenet512` + `retinaface`.     |

This service is **not** part of the Turborepo build (`apps/kyc-ml` is excluded from `turbo run build`); it runs as an independent container behind the NestJS API. It is intentionally stateless — the only persistent storage it touches is the Supabase Storage bucket `verify_faces`.

---

## Tech stack

- Python 3.11
- FastAPI + uvicorn
- PaddleOCR (`paddleocr`, `paddlepaddle` CPU build)
- OpenCV (`opencv-python-headless`) — DNN face detector + Haar fallback
- DeepFace + TensorFlow CPU
- `supabase` Python client
- `pydantic-settings` for env

---

## Environment variables

| Variable                      | Required | Default        | Description                                                                  |
| ----------------------------- | -------- | -------------- | ---------------------------------------------------------------------------- |
| `SUPABASE_URL`                | yes      | —              | e.g. `https://xyzcompany.supabase.co`                                        |
| `SUPABASE_SERVICE_ROLE_KEY`   | yes      | —              | Service-role key (server-side only, never ship to mobile).                   |
| `VERIFY_FACES_BUCKET`         | no       | `verify_faces` | Private Supabase Storage bucket name.                                        |
| `KYC_ML_SHARED_SECRET`        | yes      | —              | HMAC shared secret with the NestJS `apps/api`.                               |
| `FACE_MATCH_THRESHOLD`        | no       | `0.30`         | Maximum cosine distance accepted as a match (DeepFace cosine, lower=closer). |
| `OCR_LANG`                    | no       | `en`           | PaddleOCR language code.                                                     |
| `LOG_LEVEL`                   | no       | `INFO`         |                                                                              |

The Supabase bucket **must be created as private** (no anon read). Service-role key is used both for upload (`/process-aadhaar`) and delete-after-match (`/verify-patient-identity`'s `finally` block).

---

## Run locally

```bash
cd apps/kyc-ml
python -m venv .venv && source .venv/bin/activate
pip install -e '.[dev]'
export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... KYC_ML_SHARED_SECRET=devsecret
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Then point the NestJS API at it:

```bash
# apps/api/.env
KYC_ML_ENABLED=true
KYC_ML_BASE_URL=http://localhost:8001
KYC_ML_SHARED_SECRET=devsecret
KYC_ML_TIMEOUT_MS=30000
```

When `KYC_ML_ENABLED=false` (default), NestJS uses the existing in-memory mocks — so dev/CI without this service keeps working unchanged.

---

## Tests

```bash
cd apps/kyc-ml
pip install -e '.[dev]'
pytest -q
```

Tests mock PaddleOCR + DeepFace + Supabase so they run in <5 seconds with no model downloads.

---

## Docker

```bash
cd apps/kyc-ml
docker build -t curex24-kyc-ml .
docker run --rm -p 8001:8001 \
  -e SUPABASE_URL=... -e SUPABASE_SERVICE_ROLE_KEY=... \
  -e KYC_ML_SHARED_SECRET=devsecret \
  curex24-kyc-ml
```

First boot downloads PaddleOCR + DeepFace model weights (~400 MB) into the container layer; subsequent starts are warm.

---

## Privacy & compliance

- The full Aadhaar number is **never persisted or returned**. OCR returns only `aadhaar_last4`.
- The cropped Aadhaar face uploaded to `verify_faces/{user_id}.jpg` is **deleted in the `finally` block** of `/verify-patient-identity`, regardless of match outcome.
- The selfie is held only in memory for the DeepFace call; nothing is written to disk.
- Errors are returned as structured codes (`NO_FACE_AADHAAR`, `NO_FACE_SELFIE`, `LOW_CONFIDENCE`, `OCR_FAILED`, `AADHAAR_FACE_NOT_FOUND`) so the mobile app can surface specific messages without parsing English strings.
- All ML endpoints require an `X-Internal-Token` HMAC header; mobile clients never call this service directly.
