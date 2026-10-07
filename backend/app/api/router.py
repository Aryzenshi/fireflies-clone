"""Aggregate API router mounted at ``/api``."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import action_items, comments, health, meetings

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(meetings.router)
api_router.include_router(action_items.router)
api_router.include_router(comments.router)
