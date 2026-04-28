"""POST /verify-patient-identity — DeepFace match + always-cleanup."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, UploadFile

from ..core.auth import verify_internal_request
from ..core.errors import (
    AADHAAR_FACE_NOT_FOUND,
    INVALID_IMAGE,
    LOW_CONFIDENCE,
    NO_FACE_SELFIE,
    raise_kyc,
)
from ..schemas import FaceMatchResponse
from ..services.face import (
    NoFaceInSelfieError,
    compare_faces,
    decode_image_bytes,
    has_face,
)
from ..services.storage import delete_face, download_face

router = APIRouter(tags=["verify"])
logger = logging.getLogger(__name__)


@router.post(
    "/verify-patient-identity",
    response_model=FaceMatchResponse,
    summary="Compare a live selfie to the previously uploaded Aadhaar face",
)
async def verify_patient_identity(
    selfie: UploadFile = File(..., description="Live-captured selfie (JPEG/PNG)"),
    user_id: str = Depends(verify_internal_request),
) -> FaceMatchResponse:
    raw = await selfie.read()
    selfie_img = decode_image_bytes(raw)
    if selfie_img is None:
        raise_kyc(400, INVALID_IMAGE)
        return FaceMatchResponse(matched=False, distance=1, similarity=0, threshold=0, cleaned_up=False)

    # Pre-check: cheap Haar-cascade pass before the much heavier DeepFace.
    if not has_face(selfie_img):
        # Even on early failure we still attempt cleanup so a stale face
        # never lingers when the user gives up after multiple failed selfies.
        delete_face(user_id)
        raise_kyc(409, NO_FACE_SELFIE)
        return FaceMatchResponse(matched=False, distance=1, similarity=0, threshold=0, cleaned_up=True)

    aadhaar_bytes = download_face(user_id)
    if not aadhaar_bytes:
        raise_kyc(404, AADHAAR_FACE_NOT_FOUND)
        return FaceMatchResponse(matched=False, distance=1, similarity=0, threshold=0, cleaned_up=False)

    aadhaar_img = decode_image_bytes(aadhaar_bytes)
    if aadhaar_img is None:
        delete_face(user_id)
        raise_kyc(500, INVALID_IMAGE)
        return FaceMatchResponse(matched=False, distance=1, similarity=0, threshold=0, cleaned_up=True)

    try:
        try:
            result = compare_faces(aadhaar_img, selfie_img)
        except NoFaceInSelfieError:
            raise_kyc(409, NO_FACE_SELFIE)
            return FaceMatchResponse(matched=False, distance=1, similarity=0, threshold=0, cleaned_up=True)

        if not result.matched:
            # Return the structured reason but still 200 so the mobile app
            # can read distance/similarity for UX (e.g. "very close, retry").
            # The front-end treats matched=false as a soft failure.
            logger.info(
                "Face mismatch for %s: distance=%.3f threshold=%.3f",
                user_id,
                result.distance,
                result.threshold,
            )
            # Comply with spec: emit the LOW_CONFIDENCE code as a 422 so the
            # NestJS proxy can map it to a structured failure.
            raise_kyc(422, LOW_CONFIDENCE)

        return FaceMatchResponse(
            matched=True,
            distance=result.distance,
            similarity=result.similarity,
            threshold=result.threshold,
            cleaned_up=True,
        )
    finally:
        # Privacy: drop the cropped Aadhaar face regardless of success/failure.
        delete_face(user_id)
