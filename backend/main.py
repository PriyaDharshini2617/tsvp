"""
TSVP  The Smart Vascular Predictor
FastAPI Application Entry Point
"""

import os
from datetime import datetime, timezone
from typing import Dict, Any, List

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError

from .config import ALLOWED_ORIGINS, OPENAI_API_KEY, PORT, HOST
from .schemas import (
    PatientInput,
    AnalysisResponse,
    RecommendationsResponse,
    HealthResponse,
    RecommendationItem
)
from .risk_analyzer import analyze_patient_data, DISCLAIMER_TEXT
from .recommender import generate_educational_recommendations

app = FastAPI(
    title="TSVP Medical AI Backend",
    description="Educational Cardiovascular Risk Factor Analysis & Recommendations Engine",
    version="1.0.0"
)

# -----------------------------------------------------------------------------
# 1. CORS Configuration
# -----------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------------
# 2. Helpful Error Formatting for Validation Failures
# -----------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors: List[Dict[str, Any]] = []
    for err in exc.errors():
        field_path = " -> ".join(str(loc) for loc in err.get("loc", []))
        errors.append({
            "field": field_path,
            "message": err.get("msg", "Invalid input value"),
            "type": err.get("type", "value_error")
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "error",
            "error_type": "validation_error",
            "message": "Patient input validation failed. Please review the provided values.",
            "details": errors
        }
    )


# -----------------------------------------------------------------------------
# 3. Health & Status Endpoints
# -----------------------------------------------------------------------------
@app.get("/health", response_model=HealthResponse)
@app.get("/api/health", response_model=HealthResponse)
async def get_health():
    """
    Health check endpoint confirming that the backend is operational.
    """
    return HealthResponse(
        status="healthy",
        system="TSVP Medical Backend (FastAPI)",
        version="1.0.0",
        model_configured=False,
        educational_mode=True,
        timestamp=datetime.now(timezone.utc).isoformat()
    )


@app.get("/api/status")
async def get_api_status():
    """
    Backward-compatible status endpoint for existing frontend widgets.
    """
    return {
        "status": "online",
        "system": "TSVP Medical Backend (FastAPI)",
        "ai_configured": bool(OPENAI_API_KEY)
    }


# -----------------------------------------------------------------------------
# 4. Cardiovascular Risk-Factor Analysis Endpoint
# -----------------------------------------------------------------------------
@app.post("/analyze", response_model=AnalysisResponse)
@app.post("/api/analyze", response_model=AnalysisResponse)
async def post_analyze(patient: PatientInput):
    """
    Analyzes validated patient data according to evidence-based ACC/AHA guidelines.
    Returns structured risk factors, educational explanations, and supported recommendations.
    Does NOT fabricate clinical diagnostic predictions or claim proof of organ damage.
    """
    try:
        response = analyze_patient_data(patient)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while analyzing patient telemetry: {str(e)}"
        )


# -----------------------------------------------------------------------------
# 5. Educational Recommendations Endpoint
# -----------------------------------------------------------------------------
@app.post("/recommendations", response_model=RecommendationsResponse)
@app.post("/api/recommendations", response_model=RecommendationsResponse)
async def post_recommendations(patient: PatientInput):
    """
    Generates tailored educational lifestyle & follow-up recommendations based on submitted data.
    Does NOT prescribe medications or alter prescribed treatments.
    """
    try:
        recs = generate_educational_recommendations(patient)
        return RecommendationsResponse(
            status="success",
            disclaimer=DISCLAIMER_TEXT,
            recommendations=recs
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while generating recommendations: {str(e)}"
        )


# -----------------------------------------------------------------------------
# 6. Optional Clinical AI Assistant Chat Endpoint
# -----------------------------------------------------------------------------
@app.post("/api/chat")
async def post_chat(request: Request):
    """
    Optional clinical guidance chat assistant.
    If OPENAI_API_KEY is not configured, provides verified triage mode safely.
    """
    try:
        body = await request.json()
        user_message = (body.get("message") or "").strip()
    except Exception:
        user_message = ""

    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # High-Priority Clinical Red-Flag Check
    emergency_keywords = [
        "crushing chest pain", "severe chest pain", "pain radiating to jaw",
        "left arm numbness", "cannot breathe", "sudden collapse"
    ]
    lower = user_message.lower()
    if any(kw in lower for kw in emergency_keywords):
        return {
            "reply": (
                " CRITICAL EMERGENCY WARNING: The symptoms you described can indicate an acute coronary "
                "event or life-threatening cardiovascular emergency. Stop all activity and seek emergency medical "
                "assistance (call 911 or local emergency services) immediately. Do not drive yourself."
            )
        }

    # If OpenAI API Key is configured, make call
    if OPENAI_API_KEY:
        import urllib.request
        import json

        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are the TSVP Clinical AI Assistant, an advanced cardiovascular medical information engine. "
                        "Your purpose is to provide clear, empathetic, and evidence-based cardiovascular health education. "
                        "Never claim to diagnose disease or calculate risk percentages. Always advise discussing symptoms "
                        "with a licensed physician."
                    )
                },
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.4,
            "max_tokens": 400
        }
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))
                reply = resp_data["choices"][0]["message"]["content"].strip()
                return {"reply": reply}
        except Exception as e:
            return {
                "reply": "Clinical Guidance Mode: Thank you for your question. For detailed cardiovascular evaluation, please consult your physician."
            }

    # Fallback when OPENAI_API_KEY is not set
    return {
        "setup_required": True,
        "message": "Running in verified built-in clinical triage guidance mode. (Set OPENAI_API_KEY on server for live OpenAI).",
        "reply": (
            "Clinical Guidance Mode: Cardiovascular symptoms often stem from the interplay of blood pressure, "
            "lifestyle habits, and metabolic regulation. Please track when this occurs and share this pattern "
            "directly with your primary healthcare professional."
        )
    }


# -----------------------------------------------------------------------------
# 7. Static Files Serving (Serve Frontend Directly on FastAPI Port)
# -----------------------------------------------------------------------------
# Root of workspace directory
STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Custom route for index.html at root
@app.get("/")
async def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path, media_type="text/html")
    return {"message": "TSVP Backend Running"}

# Mount the static directory so all HTML, JS, CSS, and 3D assets are served directly
if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)
