"""Pytest fixtures that replace heavy dependencies with in-memory fakes."""

from __future__ import annotations

import hmac
from datetime import datetime, timezone
from hashlib import sha256
from typing import Any

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient


SHARED_SECRET = "test-secret"


@pytest.fixture(autouse=True)
def _env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Configure required env vars + clear cached settings before each test."""
    monkeypatch.setenv("KYC_ML_SHARED_SECRET", SHARED_SECRET)
    monkeypatch.setenv("KYC_ML_TEST_MODE", "true")
    monkeypatch.setenv("SUPABASE_URL", "https://fake.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-role-key")
    from app.core import config

    config.get_settings.cache_clear()


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    # Force a fresh app so the patched env is picked up.
    from app.main import create_app

    app = create_app()
    return TestClient(app, raise_server_exceptions=False)


def auth_headers(user_id: str = "user-123") -> dict[str, str]:
    ts = datetime.now(timezone.utc).isoformat()
    msg = f"{user_id}:{ts}".encode("utf-8")
    sig = hmac.new(SHARED_SECRET.encode("utf-8"), msg, sha256).hexdigest()
    return {
        "X-Internal-Token": sig,
        "X-Internal-Timestamp": ts,
        "X-User-Id": user_id,
    }


# ──────────────────────────────────────────────────────────────────────
# Image fixtures
# ──────────────────────────────────────────────────────────────────────


def _jpeg(img: np.ndarray) -> bytes:
    ok, buf = cv2.imencode(".jpg", img)
    assert ok
    return buf.tobytes()


@pytest.fixture
def aadhaar_image_bytes() -> bytes:
    """A synthetic image with a face-shaped white blob on a dark background.

    The Haar cascade is unreliable on this sort of synthetic data, so tests
    that actually need a face-positive use ``patch_face_detection``.
    """
    img = np.zeros((400, 600, 3), dtype=np.uint8)
    cv2.rectangle(img, (40, 40), (200, 200), (255, 255, 255), -1)
    return _jpeg(img)


@pytest.fixture
def selfie_image_bytes() -> bytes:
    img = np.full((400, 400, 3), 200, dtype=np.uint8)
    return _jpeg(img)


# ──────────────────────────────────────────────────────────────────────
# Stubs for heavy ML / external IO
# ──────────────────────────────────────────────────────────────────────


@pytest.fixture
def patch_face_detection(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """Stub OpenCV face detection so we don't depend on Haar accuracy."""
    state: dict[str, Any] = {"detect": True, "selfie_has_face": True}

    def _detect(img: np.ndarray, *, padding: float = 0.2) -> bytes | None:
        if not state["detect"]:
            return None
        return _jpeg(np.full((100, 100, 3), 128, dtype=np.uint8))

    def _has_face(img: np.ndarray) -> bool:
        return bool(state["selfie_has_face"])

    from app.routers import aadhaar as aadhaar_router
    from app.routers import verify as verify_router
    from app.services import face as face_service

    monkeypatch.setattr(face_service, "detect_and_crop_face", _detect)
    monkeypatch.setattr(face_service, "has_face", _has_face)
    monkeypatch.setattr(aadhaar_router, "detect_and_crop_face", _detect)
    monkeypatch.setattr(verify_router, "has_face", _has_face)
    return state


@pytest.fixture
def patch_storage(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """In-memory storage replacement keyed by user_id."""
    store: dict[str, bytes] = {}
    state: dict[str, Any] = {"store": store, "deletes": [], "uploads": []}

    def _upload(user_id: str, jpeg_bytes: bytes) -> str:
        store[user_id] = jpeg_bytes
        state["uploads"].append(user_id)
        return f"{user_id}.jpg"

    def _download(user_id: str) -> bytes | None:
        return store.get(user_id)

    def _delete(user_id: str) -> None:
        store.pop(user_id, None)
        state["deletes"].append(user_id)

    from app.routers import aadhaar as aadhaar_router
    from app.routers import verify as verify_router
    from app.services import storage

    monkeypatch.setattr(storage, "upload_face", _upload)
    monkeypatch.setattr(storage, "download_face", _download)
    monkeypatch.setattr(storage, "delete_face", _delete)
    monkeypatch.setattr(aadhaar_router, "upload_face", _upload)
    monkeypatch.setattr(verify_router, "download_face", _download)
    monkeypatch.setattr(verify_router, "delete_face", _delete)
    return state


@pytest.fixture
def patch_ocr(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """Stub PaddleOCR to return canned lines."""
    state: dict[str, Any] = {
        "lines": [
            "Government of India",
            "Ramesh Kumar Sharma",
            "DOB: 12/05/1990",
            "MALE",
            "1234 5678 9012",
            "Address: 42 MG Road, Bengaluru, Karnataka, 560001",
        ],
    }

    def _run_ocr(_img: np.ndarray, lang: str = "en") -> list[str]:
        return list(state["lines"])

    from app.routers import aadhaar as aadhaar_router
    from app.services import ocr

    monkeypatch.setattr(ocr, "run_ocr", _run_ocr)
    monkeypatch.setattr(aadhaar_router, "run_ocr", _run_ocr)
    return state


@pytest.fixture
def patch_deepface(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """Stub the face-comparison call."""
    from app.services import face as face_service

    state: dict[str, Any] = {
        "matched": True,
        "distance": 0.18,
        "similarity": 0.82,
        "raise_no_face": False,
    }

    def _compare(_a: np.ndarray, _b: np.ndarray) -> face_service.MatchResult:
        if state["raise_no_face"]:
            raise face_service.NoFaceInSelfieError()
        return face_service.MatchResult(
            matched=state["matched"],
            distance=state["distance"],
            similarity=state["similarity"],
            threshold=0.30,
            raw={"stub": True},
        )

    from app.routers import verify as verify_router

    monkeypatch.setattr(face_service, "compare_faces", _compare)
    monkeypatch.setattr(verify_router, "compare_faces", _compare)
    return state
