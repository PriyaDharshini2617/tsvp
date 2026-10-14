"""
TSVP Backend Configuration
"""

import os
from typing import List

# Server Network Settings
PORT: int = int(os.environ.get("PORT", 8000))
HOST: str = os.environ.get("HOST", "0.0.0.0")
ENVIRONMENT: str = os.environ.get("TSVP_ENV", "development").lower()

# CORS Settings - Strict origins for production, flexible defaults for dev
_default_origins = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
    "http://localhost:3000",
    "http://localhost:5173",
]

ALLOWED_ORIGINS_RAW = os.environ.get("ALLOWED_ORIGINS", "")
if ALLOWED_ORIGINS_RAW.strip():
    ALLOWED_ORIGINS: List[str] = [origin.strip() for origin in ALLOWED_ORIGINS_RAW.split(",") if origin.strip()]
else:
    ALLOWED_ORIGINS: List[str] = _default_origins

# Optional OpenAI Integration (Only used for clinical chat assistant if provided)
OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "").strip()
