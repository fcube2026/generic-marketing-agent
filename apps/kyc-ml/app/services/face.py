"""Face detection (OpenCV) and face matching (DeepFace).

* :func:`detect_and_crop_face` finds the largest face in an Aadhaar image
  using OpenCV's Haar cascade (always available with opencv-python-headless)
  and returns a JPEG-encoded crop with 20% padding.
* :func:`compare_faces` runs DeepFace's verify() with model ``Facenet512``
  and detector backend ``retinaface`` (overridable via env), returning the
  raw distance + a normalised similarity score in ``[0, 1]``.

Both functions accept BGR ``numpy`` arrays as decoded by OpenCV.
"""

from __future__ import annotations

import logging
import tempfile
from dataclasses import dataclass
from typing import Any

import cv2
import numpy as np

from ..core.config import get_settings

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────
# Detection
# ──────────────────────────────────────────────────────────────────────


def _haar_cascade() -> cv2.CascadeClassifier:
    """Return OpenCV's bundled frontal-face Haar cascade."""
    path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    return cv2.CascadeClassifier(path)


def detect_and_crop_face(image_bgr: np.ndarray, *, padding: float = 0.2) -> bytes | None:
    """Detect the largest face in ``image_bgr`` and return a padded JPEG crop.

    Returns ``None`` when no face is detected.
    """
    if image_bgr is None or image_bgr.size == 0:
        return None
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    cascade = _haar_cascade()
    faces = cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(60, 60),
    )
    if len(faces) == 0:
        return None
    # Largest by area
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])

    pad_x = int(w * padding)
    pad_y = int(h * padding)
    h_img, w_img = image_bgr.shape[:2]
    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(w_img, x + w + pad_x)
    y2 = min(h_img, y + h + pad_y)

    crop = image_bgr[y1:y2, x1:x2]
    ok, buf = cv2.imencode(".jpg", crop, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    if not ok:
        return None
    return buf.tobytes()


def has_face(image_bgr: np.ndarray) -> bool:
    """Quick boolean check used for selfies before invoking DeepFace."""
    if image_bgr is None or image_bgr.size == 0:
        return False
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    faces = _haar_cascade().detectMultiScale(gray, 1.1, 5, minSize=(60, 60))
    return len(faces) > 0


# ──────────────────────────────────────────────────────────────────────
# Matching
# ──────────────────────────────────────────────────────────────────────


@dataclass
class MatchResult:
    matched: bool
    distance: float
    similarity: float  # 0..1, higher = more similar
    threshold: float
    raw: dict[str, Any] | None = None


def _to_similarity(distance: float, metric: str) -> float:
    """Convert a DeepFace distance to a 0..1 similarity score."""
    if metric.lower() == "cosine":
        # cosine distance is in [0, 2]; clamp to [0, 1] then invert
        return max(0.0, 1.0 - min(1.0, distance))
    # euclidean / l2 — rough mapping; only useful for UI display.
    return max(0.0, 1.0 / (1.0 + distance))


def compare_faces(aadhaar_bgr: np.ndarray, selfie_bgr: np.ndarray) -> MatchResult:
    """Compare two BGR face images using DeepFace.verify().

    DeepFace expects file paths or numpy arrays — we pass arrays directly to
    avoid touching the disk. Set ``KYC_ML_TEST_MODE=true`` to short-circuit
    this call from tests via the :mod:`tests.conftest` fixtures.
    """
    settings = get_settings()
    threshold = float(settings.face_match_threshold)
    metric = settings.deepface_metric

    if settings.test_mode:
        # In test mode we never invoke DeepFace; tests monkeypatch this
        # function (or the calling router) to inject a known result.
        return MatchResult(
            matched=False, distance=1.0, similarity=0.0, threshold=threshold, raw={"test": True}
        )

    try:  # pragma: no cover — heavy
        from deepface import DeepFace  # type: ignore

        # DeepFace's numpy-array input path requires arrays in RGB ordering.
        aadhaar_rgb = cv2.cvtColor(aadhaar_bgr, cv2.COLOR_BGR2RGB)
        selfie_rgb = cv2.cvtColor(selfie_bgr, cv2.COLOR_BGR2RGB)
        result = DeepFace.verify(
            img1_path=aadhaar_rgb,
            img2_path=selfie_rgb,
            model_name=settings.deepface_model,
            detector_backend=settings.deepface_detector,
            distance_metric=metric,
            enforce_detection=True,
            align=True,
        )
    except ValueError as exc:
        # DeepFace raises ValueError when no face is detected in one image.
        logger.info("DeepFace.verify reported no face: %s", exc)
        raise NoFaceInSelfieError() from exc

    distance = float(result.get("distance", 1.0))
    matched = distance < threshold
    similarity = _to_similarity(distance, metric)
    return MatchResult(
        matched=matched,
        distance=distance,
        similarity=similarity,
        threshold=threshold,
        raw=result,
    )


class NoFaceInSelfieError(Exception):
    """Raised when DeepFace reports no detectable face in the selfie."""


def decode_image_bytes(data: bytes) -> np.ndarray | None:
    """Decode raw image bytes into a BGR numpy array, or return ``None``."""
    if not data:
        return None
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img


def write_temp_jpeg(data: bytes) -> str:
    """Persist ``data`` to a temp .jpg file and return its path.

    Used by ``DeepFace`` paths that prefer file inputs (some backends).
    """
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    tmp.write(data)
    tmp.flush()
    tmp.close()
    return tmp.name
