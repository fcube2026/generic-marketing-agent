"""POST /process-aadhaar — OCR + face crop + Supabase upload."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, UploadFile

from ..core.auth import verify_internal_request
from ..core.config import get_settings
from ..core.errors import INVALID_IMAGE, NO_FACE_AADHAAR, raise_kyc
from ..schemas import AadhaarExtraction
from ..services.face import decode_image_bytes, detect_and_crop_face
from ..services.ocr import parse_aadhaar, run_ocr
from ..services.storage import upload_face

router = APIRouter(tags=["aadhaar"])
logger = logging.getLogger(__name__)


@router.post(
    "/process-aadhaar",
    response_model=AadhaarExtraction,
    summary="Extract fields from an Aadhaar image and store the cropped face",
)
async def process_aadhaar(
    image: UploadFile = File(..., description="Aadhaar card image (JPEG/PNG)"),
    user_id: str = Depends(verify_internal_request),
) -> AadhaarExtraction:
    settings = get_settings()
    raw = await image.read()
    img = decode_image_bytes(raw)
    if img is None:
        raise_kyc(400, INVALID_IMAGE)
        return AadhaarExtraction()  # unreachable, satisfies type-checker

    # Face crop FIRST so we can return a specific error before doing OCR.
    crop = detect_and_crop_face(img)
    if crop is None:
        raise_kyc(409, NO_FACE_AADHAAR)
        return AadhaarExtraction()  # unreachable

    storage_path: str | None = None
    try:
        storage_path = upload_face(user_id, crop)
    except Exception:  # noqa: BLE001 — log + continue with OCR data
        logger.exception("Failed to upload Aadhaar face for %s", user_id)

    # OCR — best-effort. Even if OCR fails entirely, we return null fields
    # and let the patient type them manually on the next screen.
    lines = run_ocr(img, lang=settings.ocr_lang)
    fields = parse_aadhaar(lines)

    return AadhaarExtraction(
        full_name=fields.full_name,
        dob=fields.dob,
        gender=fields.gender,
        address=fields.address,
        aadhaar_last4=fields.aadhaar_last4,
        face_stored=storage_path is not None,
        storage_path=storage_path,
    )
