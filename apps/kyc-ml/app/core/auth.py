"""HMAC auth between the NestJS API and this sidecar.

NestJS computes ``hmac_sha256(KYC_ML_SHARED_SECRET, user_id + ":" + iso_timestamp)``
and sends it in two headers:

* ``X-Internal-Token`` — the hex-encoded HMAC.
* ``X-Internal-Timestamp`` — the ISO-8601 UTC timestamp used.
* ``X-User-Id`` — the user id being acted on.

The timestamp is required to be within ``CLOCK_SKEW_SECONDS`` of the server's
current time so that captured tokens cannot be replayed indefinitely.
"""

from __future__ import annotations

import hmac
import logging
from datetime import datetime, timezone
from hashlib import sha256

from fastapi import Header, HTTPException, status

from .config import get_settings

logger = logging.getLogger(__name__)

CLOCK_SKEW_SECONDS = 300  # 5 min


def _expected_signature(user_id: str, timestamp: str, secret: str) -> str:
    msg = f"{user_id}:{timestamp}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), msg, sha256).hexdigest()


def verify_internal_request(
    x_internal_token: str = Header(..., alias="X-Internal-Token"),
    x_internal_timestamp: str = Header(..., alias="X-Internal-Timestamp"),
    x_user_id: str = Header(..., alias="X-User-Id"),
) -> str:
    """FastAPI dependency that returns the verified ``user_id`` or raises 401."""
    settings = get_settings()
    if not settings.kyc_ml_shared_secret:
        # Fail closed: refuse to serve if the secret was not configured.
        logger.error("KYC_ML_SHARED_SECRET is not set; refusing request.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="kyc-ml shared secret not configured",
        )

    # Timestamp freshness
    try:
        ts = datetime.fromisoformat(x_internal_timestamp.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="invalid timestamp") from exc
    now = datetime.now(timezone.utc)
    if abs((now - ts).total_seconds()) > CLOCK_SKEW_SECONDS:
        raise HTTPException(status_code=401, detail="timestamp out of range")

    expected = _expected_signature(
        x_user_id, x_internal_timestamp, settings.kyc_ml_shared_secret
    )
    if not hmac.compare_digest(expected, x_internal_token):
        raise HTTPException(status_code=401, detail="bad signature")

    if not x_user_id.strip():
        raise HTTPException(status_code=400, detail="missing user id")
    return x_user_id
