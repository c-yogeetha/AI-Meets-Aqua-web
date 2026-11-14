#!/usr/bin/env python3
"""Remove expired analysis output and trash data using application retention rules."""
from __future__ import annotations
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.config import settings
from app.db import get_session_factory
from app.services.trash import purge_expired_trash, purge_retention

def main() -> int:
    settings.ensure_dirs()
    db = get_session_factory()()
    try:
        old_results = purge_retention(db)
        expired_trash = purge_expired_trash(db)
        print(f"retention_purged={old_results} expired_trash_purged={expired_trash}")
        return 0
    finally:
        db.close()

if __name__ == "__main__":
    raise SystemExit(main())
