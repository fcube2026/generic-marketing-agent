"""End-to-end FastAPI tests with mocked ML + storage."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient


def test_healthz(client: TestClient) -> None:
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_process_aadhaar_requires_auth(client: TestClient, aadhaar_image_bytes: bytes) -> None:
    r = client.post(
        "/process-aadhaar",
        files={"image": ("a.jpg", aadhaar_image_bytes, "image/jpeg")},
    )
    # FastAPI rejects missing required header before our 401 — either is fine.
    assert r.status_code in (401, 422)


def test_process_aadhaar_rejects_stale_timestamp(
    client: TestClient,
    aadhaar_image_bytes: bytes,
) -> None:
    import hmac
    from hashlib import sha256

    stale_ts = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    sig = hmac.new(b"test-secret", f"u:{stale_ts}".encode(), sha256).hexdigest()
    r = client.post(
        "/process-aadhaar",
        files={"image": ("a.jpg", aadhaar_image_bytes, "image/jpeg")},
        headers={
            "X-Internal-Token": sig,
            "X-Internal-Timestamp": stale_ts,
            "X-User-Id": "u",
        },
    )
    assert r.status_code == 401


def test_process_aadhaar_no_face_returns_409(
    client: TestClient,
    aadhaar_image_bytes: bytes,
    patch_face_detection,
    patch_storage,  # noqa: ARG001
    patch_ocr,  # noqa: ARG001
) -> None:
    from tests.conftest import auth_headers

    patch_face_detection["detect"] = False
    r = client.post(
        "/process-aadhaar",
        files={"image": ("a.jpg", aadhaar_image_bytes, "image/jpeg")},
        headers=auth_headers("user-1"),
    )
    assert r.status_code == 409
    assert r.json()["code"] == "NO_FACE_AADHAAR"


def test_process_aadhaar_happy_path(
    client: TestClient,
    aadhaar_image_bytes: bytes,
    patch_face_detection,  # noqa: ARG001
    patch_storage,
    patch_ocr,  # noqa: ARG001
) -> None:
    from tests.conftest import auth_headers

    r = client.post(
        "/process-aadhaar",
        files={"image": ("a.jpg", aadhaar_image_bytes, "image/jpeg")},
        headers=auth_headers("user-2"),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["full_name"] == "Ramesh Kumar Sharma"
    assert body["dob"] == "1990-05-12"
    assert body["gender"] == "MALE"
    assert body["aadhaar_last4"] == "9012"
    assert body["face_stored"] is True
    assert "user-2" in patch_storage["uploads"]
    # The full Aadhaar number must never appear in the response payload.
    assert "1234 5678 9012" not in r.text


def test_process_aadhaar_invalid_image(
    client: TestClient,
    patch_face_detection,  # noqa: ARG001
    patch_storage,  # noqa: ARG001
    patch_ocr,  # noqa: ARG001
) -> None:
    from tests.conftest import auth_headers

    r = client.post(
        "/process-aadhaar",
        files={"image": ("a.jpg", b"not-an-image", "image/jpeg")},
        headers=auth_headers("user-3"),
    )
    assert r.status_code == 400
    assert r.json()["code"] == "INVALID_IMAGE"


# ──────────────────────────────────────────────────────────────────────
# /verify-patient-identity
# ──────────────────────────────────────────────────────────────────────


def test_verify_no_aadhaar_face_returns_404(
    client: TestClient,
    selfie_image_bytes: bytes,
    patch_face_detection,  # noqa: ARG001
    patch_storage,  # noqa: ARG001
    patch_deepface,  # noqa: ARG001
) -> None:
    from tests.conftest import auth_headers

    r = client.post(
        "/verify-patient-identity",
        files={"selfie": ("s.jpg", selfie_image_bytes, "image/jpeg")},
        headers=auth_headers("user-no-aadhaar"),
    )
    assert r.status_code == 404
    assert r.json()["code"] == "AADHAAR_FACE_NOT_FOUND"


def test_verify_no_face_in_selfie(
    client: TestClient,
    selfie_image_bytes: bytes,
    patch_face_detection,
    patch_storage,
    patch_deepface,  # noqa: ARG001
) -> None:
    from tests.conftest import auth_headers

    # Pre-seed a stored Aadhaar face so the 404 branch is skipped.
    patch_storage["store"]["user-blank"] = b"ignored"
    patch_face_detection["selfie_has_face"] = False

    r = client.post(
        "/verify-patient-identity",
        files={"selfie": ("s.jpg", selfie_image_bytes, "image/jpeg")},
        headers=auth_headers("user-blank"),
    )
    assert r.status_code == 409
    assert r.json()["code"] == "NO_FACE_SELFIE"
    # Cleanup must still fire even on early failure.
    assert "user-blank" in patch_storage["deletes"]


def test_verify_low_confidence_cleans_up(
    client: TestClient,
    selfie_image_bytes: bytes,
    aadhaar_image_bytes: bytes,
    patch_face_detection,  # noqa: ARG001
    patch_storage,
    patch_deepface,
) -> None:
    from tests.conftest import auth_headers

    patch_storage["store"]["user-low"] = aadhaar_image_bytes
    patch_deepface["matched"] = False
    patch_deepface["distance"] = 0.55

    r = client.post(
        "/verify-patient-identity",
        files={"selfie": ("s.jpg", selfie_image_bytes, "image/jpeg")},
        headers=auth_headers("user-low"),
    )
    assert r.status_code == 422
    assert r.json()["code"] == "LOW_CONFIDENCE"
    # Cleanup runs in finally regardless of outcome.
    assert "user-low" in patch_storage["deletes"]


def test_verify_match_success_cleans_up(
    client: TestClient,
    selfie_image_bytes: bytes,
    aadhaar_image_bytes: bytes,
    patch_face_detection,  # noqa: ARG001
    patch_storage,
    patch_deepface,  # noqa: ARG001 — defaults to matched=True
) -> None:
    from tests.conftest import auth_headers

    patch_storage["store"]["user-ok"] = aadhaar_image_bytes
    r = client.post(
        "/verify-patient-identity",
        files={"selfie": ("s.jpg", selfie_image_bytes, "image/jpeg")},
        headers=auth_headers("user-ok"),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["matched"] is True
    assert 0 < body["similarity"] <= 1
    assert body["cleaned_up"] is True
    # Critical privacy invariant.
    assert "user-ok" in patch_storage["deletes"]
    assert "user-ok" not in patch_storage["store"]
