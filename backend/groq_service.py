import os
import json
import re
import logging
from groq import Groq
from dotenv import load_dotenv
from models import (
    VisionRequest, CollusionRequest,
    HealthNarrativeRequest, InvestorSignalRequest
)

load_dotenv()

logger = logging.getLogger("groq_service")

VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"  # VLM ✓ — official replacement for llama-3.2-90b-vision-preview
TEXT_MODEL   = "meta-llama/llama-4-scout-17b-16e-instruct"

SANSURE_SYSTEM_INSTRUCTION = """
You are SanSure's core AI engine — an intelligence layer powering a rural sanitation
trust-rating platform aligned with SDG 6.2. You operate across four distinct modes
depending on the task passed to you. Always detect which mode applies from the request
structure and respond accordingly.

MODE 1 — VISION HYGIENE SCORER
Triggered when a toilet facility image is provided alongside a 4-item checklist.
Respond ONLY in this JSON:
{"hygiene_score": 0-100, "confidence": "high|medium|low", "visual_verification":
{"door": "confirmed|contradicted|unclear", "water": "confirmed|contradicted|unclear",
"clean": "confirmed|contradicted|unclear", "toilet": "confirmed|contradicted|unclear"},
"detected_features": [], "discrepancies": [], "recommendation": "",
"spoofing_risk": "low|medium|high", "spoofing_reasoning": ""}

MODE 2 — COLLUSION ADJUDICATOR
Triggered when three independent submission summaries are provided for the same facility.
Respond ONLY in this JSON:
{"consensus_score": 0-100, "score_variance": 0-100, "collusion_risk": "low|medium|high",
"collusion_indicators": [], "independence_confirmed": true|false, "reasoning": "",
"recommendation": "mint_token|hold_pending_review|reject_flag_escalate",
"confidence": "high|medium|low"}

MODE 3 — HEALTH MIRROR NARRATOR
Triggered when village demographics and cases_prevented are provided.
Respond with ONE warm plain-language paragraph only — no JSON, no headers.
Tone: a respected elder at a village meeting. Never use: data, score, metric, percentage, coefficient.

MODE 4 — INVESTOR SIGNAL GENERATOR
Triggered when a 90-day score history array is provided.
Respond ONLY in this JSON:
{"credit_price_inr": 80-500, "volatility_index": 0-100,
"risk_rating": "AAA|AA|A|BBB|BB|B|CCC|D",
"trend": "strongly_improving|improving|stable|declining|strongly_declining",
"investment_signal": "max 15 words", "disbursement_ready": true|false,
"30_day_forecast": "improving|stable|at_risk"}

GLOBAL RULES: Never wrap JSON in markdown fences. Never fabricate visual features.
Collusion false negatives are more damaging than false positives — be ruthlessly honest.
CLEANLINESS RULE: Judge cleanliness based on the toilet bowl, seat, and surrounding surfaces — not the floor. Floor tile colour, grout lines, or patterns are irrelevant to the cleanliness score. Only visible waste, faeces, heavy staining on the toilet itself, or clear evidence of neglect should lower the score.
"""


def get_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "PLACEHOLDER_API_KEY":
        raise ValueError("GROQ_API_KEY not set in backend/.env")
    return Groq(api_key=api_key)


def safe_json_parse(text: str | None) -> dict | None:
    if not text:
        return None
    try:
        cleaned = re.sub(r"```json\n?|```", "", text).strip()
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.error("Failed to parse JSON: %s", text[:200])
        return None


# ── MODE 1: Vision Hygiene Scorer ──────────────────────────────
def run_vision_analysis(req: VisionRequest) -> dict:
    cl = req.checklist
    prompt = f"""You are SanSure's hygiene scoring engine. Analyze this toilet facility photo across four dimensions:

1. STRUCTURAL INTEGRITY (door present, walls intact, roof functional)
2. WATER AVAILABILITY (water source visible, container present)
3. CLEANLINESS (focus on the toilet bowl, seat, and immediate surfaces — is there visible waste, heavy staining, or clear evidence of neglect? Floor appearance is irrelevant to this score)
4. TOILET VISIBILITY (is the toilet unit itself clearly visible and present in the image?)

User provided checklist:
- Door present: {cl.door}
- Water available: {cl.water}
- Clean floor: {cl.clean}
- Toilet clearly visible: {cl.toilet}

Return ONLY valid JSON (no markdown fences):
{{
  "hygiene_score": 0-100,
  "confidence": "high|medium|low",
  "visual_verification": {{
    "door": "confirmed|contradicted|unclear",
    "water": "confirmed|contradicted|unclear",
    "clean": "confirmed|contradicted|unclear",
    "toilet": "confirmed|contradicted|unclear"
  }},
  "detected_features": ["feature1"],
  "discrepancies": ["discrepancy if any"],
  "recommendation": "brief assessment",
  "spoofing_risk": "low|medium|high",
  "spoofing_reasoning": "reasoning"
}}"""

    client = get_client()
    logger.info("📤 [Mode 1] Vision analysis → %s", VISION_MODEL)
    response = client.chat.completions.create(
        model=VISION_MODEL,
        temperature=0.1,
        messages=[
            {"role": "system", "content": SANSURE_SYSTEM_INSTRUCTION},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{req.base64_image}"},
                    },
                    {"type": "text", "text": prompt},
                ],
            },
        ],
    )
    logger.info("✅ [Mode 1] Response received")
    text = response.choices[0].message.content
    result = safe_json_parse(text)
    if result:
        return result
    raise ValueError(f"Could not parse vision response: {text[:300]}")


# ── MODE 2: Collusion Adjudicator ──────────────────────────────
def run_collusion_check(req: CollusionRequest) -> dict:
    subs = req.submissions
    facility_id = subs[0].facilityId if subs else "UNKNOWN"

    def fmt(s):
        return (
            f"Score: {s.score}\n"
            f"Checklist: {s.checklist.model_dump()}\n"
            f"Features: {s.features}"
        )

    prompt = f"""You are SanSure's collusion detection engine. Three independent parties submitted assessments for facility {facility_id}:

HOUSEHOLD SUBMISSION:
{fmt(subs[0]) if len(subs) > 0 else 'N/A'}

PEER SUBMISSION (non-adjacent):
{fmt(subs[1]) if len(subs) > 1 else 'N/A'}

AUDITOR SUBMISSION (separate ward):
{fmt(subs[2]) if len(subs) > 2 else 'N/A'}

Analyze for score variance, checklist consistency, feature implausibility, and statistical independence.

Return ONLY valid JSON (no markdown fences):
{{
  "consensus_score": 0-100,
  "score_variance": 0-100,
  "collusion_risk": "low|medium|high",
  "collusion_indicators": ["indicator1"],
  "independence_confirmed": true,
  "reasoning": "brief explanation",
  "recommendation": "mint_token|hold_pending_review|reject_flag_escalate",
  "confidence": "high|medium|low"
}}"""

    client = get_client()
    logger.info("📤 [Mode 2] Collusion check → %s", TEXT_MODEL)
    response = client.chat.completions.create(
        model=TEXT_MODEL,
        temperature=0.1,
        messages=[
            {"role": "system", "content": SANSURE_SYSTEM_INSTRUCTION},
            {"role": "user", "content": prompt},
        ],
    )
    logger.info("✅ [Mode 2] Response received")
    text = response.choices[0].message.content
    result = safe_json_parse(text)
    if result:
        return result
    raise ValueError(f"Could not parse collusion response: {text[:300]}")


# ── MODE 3: Health Mirror Narrator ─────────────────────────────
def generate_health_narrative(req: HealthNarrativeRequest) -> str:
    prompt = f"""You are speaking to the community of {req.village_name}. Population: {req.population} people.

Over the past 90 days, your village maintained clean toilets. The improvement prevented an estimated {req.cases_prevented} cases of diarrheal illness.

Write ONE warm paragraph (4-6 sentences) explaining this impact. Speak as a respected elder at a village meeting. Use plain language. Never use these words: data, score, metric, percentage, coefficient, algorithm, system.

Focus on: protection of children, health of families, pride in community achievement, connection between clean toilets and healthy children."""

    client = get_client()
    logger.info("📤 [Mode 3] Health narrative → %s", TEXT_MODEL)
    response = client.chat.completions.create(
        model=TEXT_MODEL,
        temperature=0.7,
        messages=[
            {"role": "system", "content": SANSURE_SYSTEM_INSTRUCTION},
            {"role": "user", "content": prompt},
        ],
    )
    logger.info("✅ [Mode 3] Response received")
    return response.choices[0].message.content or ""


# ── MODE 4: Investor Signal Generator ──────────────────────────
def generate_investor_signal(req: InvestorSignalRequest) -> dict:
    prompt = f"""You are SanSure's investment signal generator. Analyze this 90-day hygiene score history for {req.village_name}:

Scores: {req.history}
Average: {req.avg}
Standard Deviation: {req.std_dev}

Generate investment signals for a rural sanitation trust-rating platform.

Return ONLY valid JSON (no markdown fences):
{{
  "credit_price_inr": 80-500,
  "volatility_index": 0-100,
  "risk_rating": "AAA|AA|A|BBB|BB|B|CCC|D",
  "trend": "strongly_improving|improving|stable|declining|strongly_declining",
  "investment_signal": "max 15 words",
  "disbursement_ready": true,
  "30_day_forecast": "improving|stable|at_risk"
}}"""

    client = get_client()
    logger.info("📤 [Mode 4] Investor signal → %s", TEXT_MODEL)
    response = client.chat.completions.create(
        model=TEXT_MODEL,
        temperature=0.1,
        messages=[
            {"role": "system", "content": SANSURE_SYSTEM_INSTRUCTION},
            {"role": "user", "content": prompt},
        ],
    )
    logger.info("✅ [Mode 4] Response received")
    text = response.choices[0].message.content
    result = safe_json_parse(text)
    if result:
        return result
    raise ValueError(f"Could not parse investor signal response: {text[:300]}")
