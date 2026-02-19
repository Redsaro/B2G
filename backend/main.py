import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import (
    VisionRequest, CollusionRequest,
    HealthNarrativeRequest, InvestorSignalRequest
)
import groq_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("main")

app = FastAPI(title="SanSure AI Backend", version="1.0.0")

# Allow Vite dev server to reach the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Quick connection check — no Groq call made."""
    try:
        groq_service.get_client()
        return {"status": "ok", "model": groq_service.VISION_MODEL}
    except ValueError as e:
        return {"status": "error", "detail": str(e)}


@app.post("/api/vision")
def vision_endpoint(req: VisionRequest):
    """Mode 1 — Vision Hygiene Scorer."""
    try:
        result = groq_service.run_vision_analysis(req)
        return result
    except Exception as e:
        logger.error("Vision analysis failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/collusion")
def collusion_endpoint(req: CollusionRequest):
    """Mode 2 — Collusion Adjudicator."""
    try:
        result = groq_service.run_collusion_check(req)
        return result
    except Exception as e:
        logger.error("Collusion check failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/health-narrative")
def health_narrative_endpoint(req: HealthNarrativeRequest):
    """Mode 3 — Health Mirror Narrator."""
    try:
        narrative = groq_service.generate_health_narrative(req)
        return {"narrative": narrative}
    except Exception as e:
        logger.error("Health narrative failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/investor-signal")
def investor_signal_endpoint(req: InvestorSignalRequest):
    """Mode 4 — Investor Signal Generator."""
    try:
        result = groq_service.generate_investor_signal(req)
        return result
    except Exception as e:
        logger.error("Investor signal failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
