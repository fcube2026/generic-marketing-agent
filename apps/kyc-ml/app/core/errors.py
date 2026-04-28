"""Structured error codes returned to the NestJS API.

The mobile app surfaces user-friendly messages keyed off these codes; do not
rename them without updating ``apps/api`` and ``apps/mobile`` accordingly.
"""

from __future__ import annotations

from fastapi import HTTPException


class KycError(HTTPException):
    """An HTTPException with a stable machine-readable ``code`` field."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(status_code=status_code, detail={"code": code, "message": message})
        self.code = code


# Aadhaar processing
NO_FACE_AADHAAR = ("NO_FACE_AADHAAR", "Could not detect a face on the uploaded Aadhaar image.")
OCR_FAILED = ("OCR_FAILED", "Could not extract any readable text from the Aadhaar image.")
INVALID_IMAGE = ("INVALID_IMAGE", "Uploaded file is not a readable image.")

# Face matching
NO_FACE_SELFIE = ("NO_FACE_SELFIE", "Could not detect a face in the live selfie.")
LOW_CONFIDENCE = (
    "LOW_CONFIDENCE",
    "Live selfie does not match the photo on the Aadhaar card with sufficient confidence.",
)
AADHAAR_FACE_NOT_FOUND = (
    "AADHAAR_FACE_NOT_FOUND",
    "No previously uploaded Aadhaar face was found for this user. Please re-upload your Aadhaar.",
)


def raise_kyc(status_code: int, code_msg: tuple[str, str]) -> None:
    code, message = code_msg
    raise KycError(status_code=status_code, code=code, message=message)
