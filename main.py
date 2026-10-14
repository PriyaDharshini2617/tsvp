"""
TSVP — The Smart Vascular Predictor
Root ASGI Application Entry Point
Exposes `app` directly for:
    python -m uvicorn main:app --reload
"""

import sys
import os

# Ensure project root is in python module search path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.main import app
from backend.config import HOST, PORT

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
