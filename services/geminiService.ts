import { GoogleGenAI } from "@google/genai";
import { SANSURE_SYSTEM_INSTRUCTION } from "../constants";
import { Checklist, VerificationResult, CollusionResult, InvestorSignalResult, Submission } from "../types";

// ═══════════════════════════════════════════════════════════════
// HYBRID MODEL STRATEGY
// Vision (Mode 1): gemini-2.0-flash — only model with photo analysis
// Text  (Modes 2,3,4): gemma-3-27b-it — 30 RPM, 14.4K RPD (10x more quota)
// ═══════════════════════════════════════════════════════════════
const VISION_MODEL = 'gemini-2.0-flash';    // 15 RPM | Unlimited TPM | 1.5K RPD | Vision ✓
const TEXT_MODEL = 'gemma-3-27b-it';      // 30 RPM | 15K TPM | 14.4K RPD | Text only

let aiClient: GoogleGenAI | null = null;
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

export const getAIClient = (): GoogleGenAI | null => {
  if (!apiKey) {
    console.warn("⚠ API Key missing — check .env.local");
    return null;
  }
  if (!aiClient) {
    console.log("🔌 Initializing AI Client...");
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

// ═══════════════════════════════════════════════════════════════
// RATE LIMIT PROTECTION ENGINE
// Prevents 429s by tracking request timestamps per model
// ═══════════════════════════════════════════════════════════════
const requestLog: Record<string, number[]> = {};
const RATE_LIMITS: Record<string, number> = {
  [VISION_MODEL]: 14,   // Stay under 15 RPM limit
  [TEXT_MODEL]: 28,      // Stay under 30 RPM limit
};

const canMakeRequest = (model: string): boolean => {
  const now = Date.now();
  const limit = RATE_LIMITS[model] || 10;
  if (!requestLog[model]) requestLog[model] = [];
  // Clean old entries (older than 60s)
  requestLog[model] = requestLog[model].filter(t => now - t < 60000);
  return requestLog[model].length < limit;
};

const logRequest = (model: string) => {
  if (!requestLog[model]) requestLog[model] = [];
  requestLog[model].push(Date.now());
};

const waitForSlot = (model: string): Promise<void> => {
  return new Promise(resolve => {
    const check = () => {
      if (canMakeRequest(model)) {
        resolve();
      } else {
        const oldest = requestLog[model]?.[0] || Date.now();
        const waitMs = Math.max(1000, 60000 - (Date.now() - oldest) + 500);
        console.log(`⏳ Rate limit: waiting ${Math.round(waitMs / 1000)}s for ${model}`);
        setTimeout(check, Math.min(waitMs, 5000));
      }
    };
    check();
  });
};

// Smart API call with retry + backoff + throttle
const callWithProtection = async <T>(
  model: string,
  apiCall: () => Promise<T>,
  retries = 2
): Promise<T> => {
  await waitForSlot(model);
  logRequest(model);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await apiCall();
    } catch (error: any) {
      const is429 = error?.message?.includes('429') || error?.status === 429;
      const isLast = attempt === retries;

      if (is429 && !isLast) {
        const backoffMs = Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000;
        console.warn(`🔄 429 on ${model} — retry ${attempt + 1}/${retries} in ${Math.round(backoffMs / 1000)}s`);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Exhausted retries');
};

// Check connection status — zero API cost (no actual calls made)
export const checkConnectionStatus = async (): Promise<{ connected: boolean; model: string; error?: string }> => {
  if (!apiKey) {
    return { connected: false, model: 'None', error: 'No API Key' };
  }
  try {
    const client = getAIClient();
    if (!client) {
      return { connected: false, model: 'None', error: 'Client init failed' };
    }
    return { connected: true, model: `${TEXT_MODEL} + ${VISION_MODEL}` };
  } catch (e: any) {
    return { connected: false, model: TEXT_MODEL, error: e.message?.slice(0, 50) || 'Init error' };
  }
};

const safeJsonParse = <T>(text?: string | null): T | null => {
  if (!text) {
    return null;
  }

  try {
    // Remove markdown code fences if present
    const cleanedText = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanedText) as T;
  } catch {
    console.error("Failed to parse JSON:", text);
    return null;
  }
};

// Rule-based fallback for MVP resilience (Feature 1 requirement)
const fallbackVisionScorer = (checklist: Checklist): VerificationResult => {
  let score = 0;
  if (checklist.door) score += 25;
  if (checklist.water) score += 25;
  if (checklist.clean) score += 25;
  if (checklist.pit) score += 25;

  return {
    hygiene_score: score,
    confidence: 'low',
    visual_verification: {
      door: checklist.door ? 'confirmed' : 'unclear',
      water: checklist.water ? 'confirmed' : 'unclear',
      clean: checklist.clean ? 'confirmed' : 'unclear',
      pit: checklist.pit ? 'confirmed' : 'unclear'
    },
    detected_features: ['Manual checklist verification (Network/API fallback)'],
    discrepancies: ['AI verification unavailable - score based on checklist only'],
    recommendation: 'Submit visual evidence when connectivity improves.',
    spoofing_risk: 'low',
    spoofing_reasoning: 'Fallback mode active: Image analysis skipped.'
  };
};

const fallbackCollusionCheck = (submissions: Submission[]): CollusionResult => {
  const scores = submissions.map((s) => s.score);
  const count = scores.length || 1;
  const consensus = Math.round(scores.reduce((acc, score) => acc + score, 0) / count);
  const scoreVariance = Number((scores.reduce((acc, score) => acc + Math.pow(score - consensus, 2), 0) / count).toFixed(2));
  const scoreSpread = scores.length ? Math.max(...scores) - Math.min(...scores) : 0;
  const identicalChecklist = submissions.every((s, idx, arr) => idx === 0 || JSON.stringify(s.checklist) === JSON.stringify(arr[0].checklist));

  const indicators: string[] = [];
  if (scoreSpread <= 2) indicators.push('Very low spread across independent submissions');
  if (identicalChecklist) indicators.push('Checklist responses are identical across submitters');
  if (submissions.some((s) => s.discrepancies.length > 0)) indicators.push('At least one submitter reported discrepancies');

  let collusionRisk: CollusionResult['collusion_risk'] = 'low';
  if (scoreSpread <= 2 && identicalChecklist) {
    collusionRisk = 'high';
  } else if (scoreSpread <= 6 || scoreVariance > 120) {
    collusionRisk = 'medium';
  }

  const recommendation: CollusionResult['recommendation'] =
    collusionRisk === 'high'
      ? 'hold_pending_review'
      : consensus >= 70
        ? 'mint_token'
        : 'reject_flag_escalate';

  return {
    consensus_score: consensus,
    score_variance: scoreVariance,
    collusion_risk: collusionRisk,
    collusion_indicators: indicators.length > 0 ? indicators : ['No strong collusion indicators in fallback mode'],
    independence_confirmed: collusionRisk === 'low',
    reasoning: 'Deterministic fallback used because AI adjudication is unavailable. Result based on score spread and checklist overlap.',
    recommendation,
    confidence: 'low'
  };
};

const getHistoryTrend = (history: number[]): InvestorSignalResult['trend'] => {
  if (history.length < 10) {
    return 'stable';
  }

  const splitIndex = Math.floor(history.length / 2);
  const firstHalf = history.slice(0, splitIndex);
  const secondHalf = history.slice(splitIndex);

  const firstAvg = firstHalf.reduce((acc, v) => acc + v, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((acc, v) => acc + v, 0) / secondHalf.length;
  const delta = secondAvg - firstAvg;

  if (delta >= 8) return 'strongly_improving';
  if (delta >= 3) return 'improving';
  if (delta <= -8) return 'strongly_declining';
  if (delta <= -3) return 'declining';
  return 'stable';
};

const fallbackInvestorSignal = (history: number[], avg: number, stdDev: number): InvestorSignalResult => {
  const trend = getHistoryTrend(history);
  const volatility = Number(stdDev.toFixed(2));
  const basePrice = Math.round(Math.max(6, Math.min(75, (avg * 0.7) - (stdDev * 1.1))));

  let riskRating: InvestorSignalResult['risk_rating'] = 'CCC';
  if (avg >= 85 && stdDev <= 6) riskRating = 'AAA';
  else if (avg >= 80 && stdDev <= 8) riskRating = 'AA';
  else if (avg >= 72 && stdDev <= 10) riskRating = 'A';
  else if (avg >= 65 && stdDev <= 12) riskRating = 'BBB';
  else if (avg >= 58 && stdDev <= 16) riskRating = 'BB';
  else if (avg >= 50 && stdDev <= 20) riskRating = 'B';
  else if (avg < 35) riskRating = 'D';

  const disbursementReady = ['AAA', 'AA', 'A', 'BBB'].includes(riskRating) && trend !== 'declining' && trend !== 'strongly_declining';

  let forecast: InvestorSignalResult['30_day_forecast'] = 'stable';
  if (trend === 'strongly_improving' || trend === 'improving') {
    forecast = 'improving';
  } else if (trend === 'strongly_declining' || riskRating === 'CCC' || riskRating === 'D') {
    forecast = 'at_risk';
  }

  return {
    credit_price_inr: basePrice,
    volatility_index: volatility,
    risk_rating: riskRating,
    trend,
    investment_signal: disbursementReady
      ? 'Fallback model indicates acceptable risk for phased disbursement.'
      : 'Fallback model suggests caution; require manual review before disbursement.',
    disbursement_ready: disbursementReady,
    '30_day_forecast': forecast
  };
};

const fallbackHealthNarrative = (
  villageName: string,
  population: number,
  avgScore: number,
  casesPrevented: number
): string =>
  `${villageName} has maintained an average hygiene score of ${avgScore} across recent checks. ` +
  `For a population of ${population}, this may have helped prevent around ${casesPrevented} sanitation-related illnesses. ` +
  `Continued weekly maintenance and water availability checks are recommended.`;

// Fallback: Groq Llama 4 Maverick (Simulated/Stub)
const runGroqAnalysis = async (base64Image: string, checklist: Checklist): Promise<VerificationResult | null> => {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  try {
    console.log("Attempting Groq fallback...");
    // Placeholder for actual Groq API call
    // const response = await fetch('https://api.groq.com/openai/v1/chat/completions', ...);
    throw new Error("Groq not implemented yet");
  } catch (error) {
    console.warn("Groq Fallback failed:", error);
    return null;
  }
};

// Mode 1: Vision Hygiene Scorer
export const runVisionAnalysis = async (
  base64Image: string,
  checklist: Checklist
): Promise<VerificationResult> => {
  const checklistStr = JSON.stringify(checklist);
  // Prompt Architecture Prompt 1: Vision Hygiene Scorer
  const prompt = `
You are SanSure's hygiene scoring engine. Analyze this toilet facility photo across four dimensions:

1. STRUCTURAL INTEGRITY (door present, walls intact, roof functional)
2. WATER AVAILABILITY (water source visible, container present)
3. CLEANLINESS (floor clean, no waste visible, no odor indicators)
4. ACTIVE USAGE (signs of recent use, maintained appearance)

User provided checklist:
- Door present: ${checklist.door}
- Water available: ${checklist.water}
- Clean floor: ${checklist.clean}
- Pit cover present: ${checklist.pit}

Return ONLY this JSON (no markdown fences):
{
  "hygiene_score": 0-100,
  "confidence": "high|medium|low",
  "visual_verification": {
    "door": "confirmed|contradicted|unclear",
    "water": "confirmed|contradicted|unclear",
    "clean": "confirmed|contradicted|unclear",
    "pit": "confirmed|contradicted|unclear"
  },
  "detected_features": ["feature1", "feature2"],
  "discrepancies": ["discrepancy if checklist contradicts photo"],
  "recommendation": "brief assessment",
  "spoofing_risk": "low|medium|high",
  "spoofing_reasoning": "why spoofing suspected or not"
}
  `;

  const client = getAIClient();
  if (client) {
    try {
      const response = await callWithProtection(VISION_MODEL, () =>
        client.models.generateContent({
          model: VISION_MODEL,
          contents: {
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
              { text: prompt }
            ]
          },
          config: {
            systemInstruction: SANSURE_SYSTEM_INSTRUCTION,
            temperature: 0.1,
            responseMimeType: "application/json",
          }
        })
      );

      const parsed = safeJsonParse<VerificationResult>(response.text);
      if (parsed) return parsed;
    } catch (error) {
      console.warn("⚠ Vision Analysis failed (using fallback):", error);
    }
  }

  // Fallback 1: Groq
  const groqResult = await runGroqAnalysis(base64Image, checklist);
  if (groqResult) return { ...groqResult, scoring_method: 'groq' } as any; // Cast as any because VerificationResult interface might not have scoring_method yet (it's in StoredSubmission)

  // Fallback 2: Rule-based
  return fallbackVisionScorer(checklist);
};

// Mode 2: Collusion Adjudicator
export const runCollusionCheck = async (submissions: Submission[]): Promise<CollusionResult> => {
  const facilityId = submissions[0]?.facilityId || "UNKNOWN";
  // Prompt Architecture Prompt 2: Collusion Adjudicator
  const prompt = `
You are SanSure's collusion detection engine. Three independent parties submitted assessments for facility ${facilityId}:

HOUSEHOLD SUBMISSION:
Score: ${submissions[0]?.score}
Checklist: ${JSON.stringify(submissions[0]?.checklist)}
Features: ${JSON.stringify(submissions[0]?.features)}

PEER SUBMISSION (non-adjacent):
Score: ${submissions[1]?.score}
Checklist: ${JSON.stringify(submissions[1]?.checklist)}
Features: ${JSON.stringify(submissions[1]?.features)}

AUDITOR SUBMISSION (separate ward):
Score: ${submissions[2]?.score}
Checklist: ${JSON.stringify(submissions[2]?.checklist)}
Features: ${JSON.stringify(submissions[2]?.features)}

Analyze for:
1. Score variance (suspicious if all identical or wildly different)
2. Checklist consistency (suspicious if all match perfectly)
3. Feature implausibility (fabricated details)
4. Statistical independence (coordinated language patterns)

Return ONLY this JSON (no markdown fences):
{
  "consensus_score": 0-100,
  "score_variance": 0-100,
  "collusion_risk": "low|medium|high",
  "collusion_indicators": ["indicator1", "indicator2"],
  "independence_confirmed": true|false,
  "reasoning": "brief explanation",
  "recommendation": "mint_token|hold_pending_review|reject_flag_escalate",
  "confidence": "high|medium|low"
}
  `;

  const client = getAIClient();
  if (!client) {
    return fallbackCollusionCheck(submissions);
  }

  try {
    const response = await callWithProtection(TEXT_MODEL, () =>
      client.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SANSURE_SYSTEM_INSTRUCTION,
          temperature: 0.1,
          responseMimeType: "application/json",
        }
      })
    );

    const parsed = safeJsonParse<CollusionResult>(response.text);
    return parsed || fallbackCollusionCheck(submissions);
  } catch (error) {
    console.warn("⚠ Collusion check failed (using fallback):", error);
    return fallbackCollusionCheck(submissions);
  }
};

// Mode 3: Health Mirror Narrator
export const generateHealthNarrative = async (
  villageName: string,
  population: number,
  avgScore: number,
  casesPrevented: number
): Promise<string> => {
  // Prompt Architecture Prompt 3: Health Mirror Narrator
  const prompt = `
You are speaking to the community of ${villageName}. Population: ${population} people.

Over the past 90 days, your village maintained clean toilets. The improvement prevented an estimated ${casesPrevented} cases of diarrheal illness.

Write ONE warm paragraph (4-6 sentences) explaining this impact. Speak as a respected elder at a village meeting. Use plain language. Never use these words: data, score, metric, percentage, coefficient, algorithm, system.

Focus on: protection of children, health of families, pride in community achievement, connection between clean toilets and healthy children.
  `;

  const client = getAIClient();
  if (!client) {
    return fallbackHealthNarrative(villageName, population, avgScore, casesPrevented);
  }

  try {
    const response = await callWithProtection(TEXT_MODEL, () =>
      client.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SANSURE_SYSTEM_INSTRUCTION,
          temperature: 0.7,
        }
      })
    );

    return response.text || fallbackHealthNarrative(villageName, population, avgScore, casesPrevented);
  } catch (error) {
    console.warn("⚠ Health narrative failed (using fallback):", error);
    return fallbackHealthNarrative(villageName, population, avgScore, casesPrevented);
  }
};

// Mode 4: Investor Signal
export const generateInvestorSignal = async (
  villageName: string,
  history: number[],
  avg: number,
  stdDev: number
): Promise<InvestorSignalResult> => {
  // Prompt Architecture Prompt 4: Investor Signal Generator
  const prompt = `
You are SanSure's investment signal generator. Analyze this 90-day hygiene score history for ${villageName}:

Scores: ${JSON.stringify(history)}
Average: ${avg}
Standard Deviation: ${stdDev}

Generate investment signals:
1. Credit Price (INR): ₹80-500 based on score quality and stability
2. Volatility Index: 0-100 (higher = more risk)
3. Risk Rating: AAA to D
4. Trend: strongly_improving|improving|stable|declining|strongly_declining
5. Investment Signal: One sentence (≤15 words) for fund managers
6. Disbursement Ready: true if safe to release funds
7. 30-day Forecast: improving|stable|at_risk

Return ONLY this JSON (no markdown fences):
{
  "credit_price_inr": 80-500,
  "volatility_index": 0-100,
  "risk_rating": "AAA|AA|A|BBB|BB|B|CCC|D",
  "trend": "strongly_improving|improving|stable|declining|strongly_declining",
  "investment_signal": "max 15 words",
  "disbursement_ready": true|false,
  "30_day_forecast": "improving|stable|at_risk"
}
  `;

  const client = getAIClient();
  if (!client) {
    return fallbackInvestorSignal(history, avg, stdDev);
  }

  try {
    const response = await callWithProtection(TEXT_MODEL, () =>
      client.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SANSURE_SYSTEM_INSTRUCTION,
          temperature: 0.1,
          responseMimeType: "application/json",
        }
      })
    );

    const parsed = safeJsonParse<InvestorSignalResult>(response.text);
    return parsed || fallbackInvestorSignal(history, avg, stdDev);
  } catch (error) {
    console.warn("⚠ Investor signal failed (using fallback):", error);
    return fallbackInvestorSignal(history, avg, stdDev);
  }
};
