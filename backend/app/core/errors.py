"""Small domain exceptions mapped to HTTP status codes by handler in main.py."""

from __future__ import annotations


class ApiError(Exception):
    """Base class for expected, user-facing errors."""

    status_code = 400

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class BadRequestError(ApiError):
    status_code = 400


class NotFoundError(ApiError):
    status_code = 404


class UnsupportedFileTypeError(BadRequestError):
    pass


class TranscriptParseError(BadRequestError):
    pass
