from __future__ import annotations

from typing import Optional

from fastapi import Request

from app.config import settings


def get_current_owner_id(request: Request) -> Optional[str]:
    """Retrieve owner identifier for multi-tenant anonymous scoping.

    Returns None when settings.SINGLE_USER_MODE == 1, effectively disabling
    scoping across all entities.
    """
    if getattr(settings, "SINGLE_USER_MODE", 0) == 1:
        return None

    # Check cookie
    cookie_val = request.cookies.get("matsya_oid")
    if cookie_val:
        return cookie_val

    # Check request state populated by middleware
    if hasattr(request.state, "owner_id") and request.state.owner_id:
        return request.state.owner_id

    return "legacy"
