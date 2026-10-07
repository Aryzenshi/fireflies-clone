"""FastAPI application entrypoint.

Run locally with:

    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.router import api_router
from app.core.config import settings
from app.core.errors import ApiError
from app.db.init_db import init_db
from app.db.session import SessionLocal

logger = logging.getLogger("fireflies")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


def _seed_if_empty() -> None:
    """Make the app immediately usable: seed demo data the first time it starts."""

    if not settings.auto_seed:
        return
    from app.seed import seed_database

    with SessionLocal() as db:
        result = seed_database(db)
        if result.created:
            logger.info("Seeded %s demo meetings (AUTO_SEED).", result.created)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    _seed_if_empty()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Backend for the Fireflies.ai-inspired meeting notes & transcript workspace. "
        "Provides meetings, transcripts, deterministic summaries, action items and stats."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https?://.*\.e2b\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# --------------------------------------------------------------------------- #
# Error handling: every handled error returns {"detail": "..."} as JSON.
# --------------------------------------------------------------------------- #
@app.exception_handler(ApiError)
async def handle_api_error(_request: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def handle_validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
    details = []
    for error in exc.errors():
        location = ".".join(str(part) for part in error.get("loc", []) if part not in {"body", "query"})
        message = error.get("msg", "Invalid value")
        details.append(f"{location}: {message}" if location else message)
    return JSONResponse(status_code=422, content={"detail": "Validation error - " + "; ".join(details)})


@app.exception_handler(StarletteHTTPException)
async def handle_http_exception(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed."
    return JSONResponse(status_code=exc.status_code, content={"detail": detail}, headers=exc.headers)


@app.exception_handler(Exception)
async def handle_unexpected_error(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})


app.include_router(api_router)


@app.get("/", include_in_schema=False)
def root() -> dict[str, object]:
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "api_base": "/api",
        "endpoints": ["/api/health", "/api/meetings", "/api/participants", "/api/stats", "/api/users/me"],
    }
