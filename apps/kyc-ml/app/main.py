"""FastAPI application entrypoint for the curex24 KYC sidecar."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.exceptions import HTTPException
from fastapi.responses import JSONResponse
from starlette.requests import Request

from .core.config import get_settings
from .routers import aadhaar, verify


def _configure_logging(level: str) -> None:
    logging.basicConfig(
        level=level.upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


def create_app() -> FastAPI:
    settings = get_settings()
    _configure_logging(settings.log_level)

    app = FastAPI(
        title="curex24 KYC ML sidecar",
        version="0.1.0",
        description=(
            "Aadhaar OCR (PaddleOCR) + face match (DeepFace Facenet512) for the "
            "curex24 patient identity verification flow. Internal service — "
            "must only be reached from the NestJS API over an HMAC-signed channel."
        ),
    )

    @app.get("/healthz", include_in_schema=False)
    async def healthz() -> dict[str, str]:
        return {"status": "ok"}

    # Normalise our KycError detail dict so callers always see {code, message}
    @app.exception_handler(HTTPException)
    async def _http_exc_handler(_req: Request, exc: HTTPException) -> JSONResponse:
        body: dict[str, object]
        if isinstance(exc.detail, dict):
            body = exc.detail
        else:
            body = {"code": "HTTP_ERROR", "message": str(exc.detail)}
        return JSONResponse(status_code=exc.status_code, content=body)

    app.include_router(aadhaar.router)
    app.include_router(verify.router)

    return app


app = create_app()
