"""Application configuration loaded from environment variables.

Uses pydantic-settings so the same names that are documented in the README
are the ones consumed at runtime. Defaults match the README table.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings for the KYC ML sidecar."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Supabase
    supabase_url: str = Field(default="", alias="SUPABASE_URL")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")
    verify_faces_bucket: str = Field(default="verify_faces", alias="VERIFY_FACES_BUCKET")

    # Auth between NestJS and Python
    kyc_ml_shared_secret: str = Field(default="", alias="KYC_ML_SHARED_SECRET")

    # Face matching
    face_match_threshold: float = Field(default=0.30, alias="FACE_MATCH_THRESHOLD")
    deepface_model: str = Field(default="Facenet512", alias="DEEPFACE_MODEL")
    deepface_detector: str = Field(default="retinaface", alias="DEEPFACE_DETECTOR")
    deepface_metric: str = Field(default="cosine", alias="DEEPFACE_METRIC")

    # OCR
    ocr_lang: str = Field(default="en", alias="OCR_LANG")

    # Misc
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    # When True, expensive ML models (PaddleOCR, DeepFace) are loaded lazily and
    # may be replaced by test stubs. Set automatically by pytest fixtures.
    test_mode: bool = Field(default=False, alias="KYC_ML_TEST_MODE")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
