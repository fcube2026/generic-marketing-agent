"""PaddleOCR-based Aadhaar field extraction.

The OCR engine is loaded lazily so importing this module does not download
model weights (important for unit tests). At runtime we keep a single
process-wide instance to avoid per-request model load.

Field extraction is intentionally tolerant — Aadhaar layouts vary across
versions (eAadhaar PDF, plastic card, mAadhaar) and OCR quality is noisy.
We always return a partially-populated dict rather than failing — the
mobile UI keeps every field editable, so a missing field just means the
patient types it manually.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, asdict
from typing import Any

import numpy as np

from .masking import extract_last4, scrub_full_aadhaar

logger = logging.getLogger(__name__)

_paddle_ocr = None  # populated by get_ocr() on first use
_paddle_lock_failed = False  # if paddle import fails we degrade gracefully


@dataclass
class AadhaarFields:
    full_name: str | None
    dob: str | None  # YYYY-MM-DD when possible
    gender: str | None  # MALE / FEMALE / OTHER
    address: str | None
    aadhaar_last4: str | None
    raw_text: str  # already scrubbed of full Aadhaar numbers

    def as_response(self) -> dict[str, Any]:
        return asdict(self)


# ──────────────────────────────────────────────────────────────────────
# OCR engine
# ──────────────────────────────────────────────────────────────────────


def get_ocr(lang: str = "en"):  # type: ignore[no-untyped-def]
    """Return a process-wide PaddleOCR instance, loading it on first use."""
    global _paddle_ocr, _paddle_lock_failed
    if _paddle_ocr is not None or _paddle_lock_failed:
        return _paddle_ocr
    try:  # pragma: no cover — heavy import
        from paddleocr import PaddleOCR  # type: ignore

        _paddle_ocr = PaddleOCR(use_angle_cls=True, lang=lang, show_log=False)
    except Exception:  # pragma: no cover — environment-dependent
        logger.exception("PaddleOCR failed to initialise; OCR disabled")
        _paddle_lock_failed = True
        _paddle_ocr = None
    return _paddle_ocr


def run_ocr(image_bgr: np.ndarray, lang: str = "en") -> list[str]:
    """Run OCR on a BGR image, returning the recognised lines (top-to-bottom)."""
    ocr = get_ocr(lang)
    if ocr is None:
        return []
    try:  # pragma: no cover — heavy
        result = ocr.ocr(image_bgr, cls=True)
    except Exception:
        logger.exception("PaddleOCR.ocr() raised")
        return []

    lines: list[tuple[float, str]] = []
    # PaddleOCR returns nested lists; layout: [[ [box, (text, score)], ... ]]
    for page in result or []:
        for entry in page or []:
            try:
                box, (text, _score) = entry
                # Use the average y-coord of the box for ordering
                y = sum(p[1] for p in box) / len(box)
                lines.append((y, text))
            except Exception:  # noqa: BLE001 — defensive parse
                continue
    lines.sort(key=lambda t: t[0])
    return [t[1] for t in lines]


# ──────────────────────────────────────────────────────────────────────
# Field extraction
# ──────────────────────────────────────────────────────────────────────

DOB_RE = re.compile(r"(?:DOB|D\.O\.B|Date of Birth|Birth)\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})", re.I)
DOB_FALLBACK_RE = re.compile(r"\b(\d{2})[/\-](\d{2})[/\-](\d{4})\b")
YOB_RE = re.compile(r"(?:Year of Birth|YoB)\s*[:\-]?\s*(\d{4})", re.I)
GENDER_RE = re.compile(r"\b(MALE|FEMALE|TRANSGENDER|M|F)\b", re.I)
ADDRESS_RE = re.compile(r"Address\s*[:\-]\s*(.+)", re.I | re.S)
NOISE_RE = re.compile(r"^(government of india|भारत सरकार|unique identification|aadhaar|आधार)\b", re.I)


def _normalise_dob(raw: str) -> str | None:
    """Convert common Aadhaar DOB formats to ``YYYY-MM-DD``."""
    m = DOB_FALLBACK_RE.search(raw)
    if not m:
        # Year-only fallback
        ym = re.search(r"\b(19|20)\d{2}\b", raw)
        return f"{ym.group(0)}-01-01" if ym else None
    dd, mm, yyyy = m.group(1), m.group(2), m.group(3)
    return f"{yyyy}-{mm}-{dd}"


def _guess_full_name(lines: list[str], dob_index: int | None) -> str | None:
    """Heuristic: name is the first non-noise alphabetic line above the DOB line.

    Requires at least two alphabetic tokens *and* the line to consist only of
    alphabetic characters and whitespace — otherwise random OCR noise like
    ``unreadable noise %%%`` would be accepted as a name.
    """
    end = dob_index if dob_index is not None else len(lines)
    for line in reversed(lines[:end]):
        s = line.strip()
        if not s or NOISE_RE.search(s):
            continue
        # Reject anything containing digits or punctuation other than spaces,
        # hyphens, dots or apostrophes (which can legitimately appear in names).
        if not re.fullmatch(r"[A-Za-z][A-Za-z\s\.\-']{1,}", s):
            continue
        tokens = [t for t in re.split(r"\s+", s) if t.isalpha()]
        if len(tokens) >= 2:
            return s
    return None


def parse_aadhaar(lines: list[str]) -> AadhaarFields:
    """Extract structured Aadhaar fields from a list of OCR text lines."""
    joined = "\n".join(lines)

    # DOB
    dob: str | None = None
    dob_index: int | None = None
    for i, line in enumerate(lines):
        m = DOB_RE.search(line)
        if m:
            dob = _normalise_dob(m.group(1))
            dob_index = i
            break
        m2 = YOB_RE.search(line)
        if m2:
            dob = f"{m2.group(1)}-01-01"
            dob_index = i
            break

    # Gender
    gender: str | None = None
    for line in lines:
        m = GENDER_RE.search(line)
        if not m:
            continue
        token = m.group(1).upper()
        if token in {"M", "MALE"}:
            gender = "MALE"
        elif token in {"F", "FEMALE"}:
            gender = "FEMALE"
        else:
            gender = "OTHER"
        break

    # Name
    full_name = _guess_full_name(lines, dob_index)

    # Address — Aadhaar back side; OCR rarely captures perfectly. Best-effort.
    address: str | None = None
    addr_match = ADDRESS_RE.search(joined)
    if addr_match:
        address = addr_match.group(1).strip().replace("\n", ", ")[:300]

    last4 = extract_last4(joined)
    raw_text = scrub_full_aadhaar(joined)

    return AadhaarFields(
        full_name=full_name,
        dob=dob,
        gender=gender,
        address=address,
        aadhaar_last4=last4,
        raw_text=raw_text,
    )
