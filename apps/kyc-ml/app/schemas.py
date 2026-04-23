"""Pydantic response models."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AadhaarExtraction(BaseModel):
    full_name: str | None = Field(default=None)
    dob: str | None = Field(default=None, description="ISO date YYYY-MM-DD when parseable")
    gender: str | None = Field(default=None, description="MALE | FEMALE | OTHER")
    address: str | None = Field(default=None)
    aadhaar_last4: str | None = Field(default=None, description="Last 4 digits only — full number is never returned")
    face_stored: bool = Field(default=False)
    storage_path: str | None = Field(default=None)


class FaceMatchResponse(BaseModel):
    matched: bool
    distance: float
    similarity: float
    threshold: float
    cleaned_up: bool
