"""Aadhaar number masking.

Aadhaar is a 12-digit number, often printed in three space-separated 4-digit
groups (``1234 5678 9012``). Per UIDAI guidance and the project compliance
requirement we **never** persist or return more than the last 4 digits.
"""

from __future__ import annotations

import re

# 12 digits with optional whitespace between 4-digit groups.
AADHAAR_RE = re.compile(r"\b(\d{4})\s?(\d{4})\s?(\d{4})\b")


def extract_last4(text: str) -> str | None:
    """Return the last 4 digits of the first Aadhaar-like number in ``text``.

    Returns ``None`` when no candidate is found. The full number is **never**
    returned — callers must not reconstruct it from ``text``.
    """
    if not text:
        return None
    m = AADHAAR_RE.search(text)
    if not m:
        return None
    return m.group(3)


def scrub_full_aadhaar(text: str) -> str:
    """Replace any Aadhaar-like number in ``text`` with ``XXXX XXXX <last4>``.

    Used before persisting any OCR free-text (``ocrRawResult``) so that a
    leaked DB row never contains the full 12-digit number.
    """
    if not text:
        return text

    def _mask(match: re.Match[str]) -> str:
        return f"XXXX XXXX {match.group(3)}"

    return AADHAAR_RE.sub(_mask, text)
