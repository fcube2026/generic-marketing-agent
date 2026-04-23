"""Supabase Storage wrapper for the private ``verify_faces`` bucket.

The Supabase Python client is loaded lazily so unit tests can monkeypatch
this module without requiring a live Supabase project. Exactly three
operations are needed by the KYC pipeline:

* ``upload_face`` — write the cropped Aadhaar face JPEG to ``{user_id}.jpg``.
* ``download_face`` — fetch it back when verifying the live selfie.
* ``delete_face`` — privacy cleanup, called in a ``finally`` block.
"""

from __future__ import annotations

import logging
from typing import Any

from ..core.config import get_settings

logger = logging.getLogger(__name__)

_client: Any | None = None


def _supabase():
    """Return a cached Supabase client. Returns ``None`` when unconfigured."""
    global _client
    if _client is not None:
        return _client
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    try:  # pragma: no cover — env-dependent
        from supabase import create_client

        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    except Exception:  # pragma: no cover
        logger.exception("Failed to initialise Supabase client")
        _client = None
    return _client


def _bucket_name() -> str:
    return get_settings().verify_faces_bucket


def _path_for(user_id: str) -> str:
    # We strictly key by user_id so cleanup is unambiguous. user_id is a
    # cuid in our system — never user-controlled freeform text.
    safe = user_id.replace("/", "_").replace("..", "_")
    return f"{safe}.jpg"


def upload_face(user_id: str, jpeg_bytes: bytes) -> str:
    """Upload (or overwrite) the cropped Aadhaar face for ``user_id``.

    Returns the storage path inside the bucket.
    """
    client = _supabase()
    path = _path_for(user_id)
    if client is None:
        logger.warning("Supabase not configured — skipping upload for %s", user_id)
        return path
    bucket = client.storage.from_(_bucket_name())
    try:
        bucket.upload(
            path=path,
            file=jpeg_bytes,
            file_options={"content-type": "image/jpeg", "upsert": "true"},
        )
    except Exception as exc:  # pragma: no cover — network
        logger.exception("Supabase upload failed: %s", exc)
        raise
    return path


def download_face(user_id: str) -> bytes | None:
    """Download the cropped Aadhaar face for ``user_id`` or return ``None``."""
    client = _supabase()
    if client is None:
        return None
    bucket = client.storage.from_(_bucket_name())
    try:
        return bucket.download(_path_for(user_id))
    except Exception:  # pragma: no cover — network / missing object
        logger.info("Supabase download miss for %s", user_id)
        return None


def delete_face(user_id: str) -> None:
    """Delete the cropped Aadhaar face for ``user_id``. Idempotent — never raises."""
    client = _supabase()
    if client is None:
        return
    bucket = client.storage.from_(_bucket_name())
    try:
        bucket.remove([_path_for(user_id)])
    except Exception:  # pragma: no cover — best effort
        logger.warning("Supabase delete failed for %s (best-effort)", user_id, exc_info=True)
