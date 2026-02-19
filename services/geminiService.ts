// ─────────────────────────────────────────────────────────────────
// geminiService.ts — Delegates all AI calls to FastAPI backend
// via apiService.ts. Model: meta-llama/llama-4-scout-17b-16e-instruct
// All fallbacks (rule-based) are preserved here for resilience.
// ─────────────────────────────────────────────────────────────────
import { Checklist, VerificationResult, CollusionResult, InvestorSignalResult, Submission } from "../types";
import {
  checkBackendStatus,
  callVisionAnalysis,
  callCollusionCheck,
  callHealthNarrative,
  callInvestorSignal,
} from "./apiService";

// Re-export checkConnectionStatus using the backend health check
export const checkConnectionStatus = checkBackendStatus;

// ── Fallbacks (rule-based, cost-free) ─────────────────────────

const fallbackVisionScorer = (checklist: Checklist): VerificationResult => {
  let score = 0;
  if (checklist.door) score += 25;
  if (checklist.water) score += 25;
  if (checklist.clean) score += 25;
  if (checklist.toilet) score += 25;
  return {
    hygiene_score: score,
    confidence: 'low',
    visual_verification: {
      door: checklist.door ? 'confirmed' : 'unclear',
      water: checklist.water ? 'confirmed' : 'unclear',
      clean: checklist.clean ? 'confirmed' : 'unclear',
      toilet: checklist.toilet ? 'confirmed' : 'unclear',
    },
    detected_features: ['Manual checklist verification (Backend/API fallback)'],
    discrepancies: ['AI verification unavailable - score based on checklist only'],
    recommendation: 'Start the FastAPI backend (uvicorn main:app) and retry.',
    spoofing_risk: 'low',
    spoofing_reasoning: 'Fallback mode active: Image analysis skipped.',
  };
};

const fallbackCollusionCheck = (submissions: Submission[]): CollusionResult => {
  const scores = submissions.map((s) => s.score);
  const count = scores.length || 1;
  const consensus = Math.round(scores.reduce((a, b) => a + b, 0) / count);
  const scoreVariance = Number((scores.reduce((a, s) => a + Math.pow(s - consensus, 2), 0) / count).toFixed(2));
  const scoreSpread = scores.length ? Math.max(...scores) - Math.min(...scores) : 0;
  const identicalChecklist = submissions.every((s, i, arr) => i === 0 || JSON.stringify(s.checklist) === JSON.stringify(arr[0].checklist));
  const indicators: string[] = [];
  if (scoreSpread <= 2) indicators.push('Very low spread across independent submissions');
  if (identicalChecklist) indicators.push('Checklist responses are identical across submitters');
  let collusionRisk: CollusionResult['collusion_risk'] = 'low';
  if (scoreSpread <= 2 && identicalChecklist) collusionRisk = 'high';
  else if (scoreSpread <= 6 || scoreVariance > 120) collusionRisk = 'medium';
  const recommendation: CollusionResult['recommendation'] =
    collusionRisk === 'high' ? 'hold_pending_review' : consensus >= 70 ? 'mint_token' : 'reject_flag_escalate';
  return {
    consensus_score: consensus, score_variance: scoreVariance,
    collusion_risk: collusionRisk,
    collusion_indicators: indicators.length ? indicators : ['No strong collusion indicators in fallback mode'],
    independence_confirmed: collusionRisk === 'low',
    reasoning: 'Deterministic fallback: backend unavailable.',
    recommendation, confidence: 'low',
  };
};

const getHistoryTrend = (history: number[]): InvestorSignalResult['trend'] => {
  if (history.length < 10) return 'stable';
  const mid = Math.floor(history.length / 2);
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const delta = avg(history.slice(mid)) - avg(history.slice(0, mid));
  if (delta >= 8) return 'strongly_improving';
  if (delta >= 3) return 'improving';
  if (delta <= -8) return 'strongly_declining';
  if (delta <= -3) return 'declining';
  return 'stable';
};

const fallbackInvestorSignal = (history: number[], avg: number, stdDev: number): InvestorSignalResult => {
  const trend = getHistoryTrend(history);
  const basePrice = Math.round(Math.max(6, Math.min(75, avg * 0.7 - stdDev * 1.1)));
  let riskRating: InvestorSignalResult['risk_rating'] = 'CCC';
  if (avg >= 85 && stdDev <= 6) riskRating = 'AAA';
  else if (avg >= 80 && stdDev <= 8) riskRating = 'AA';
  else if (avg >= 72 && stdDev <= 10) riskRating = 'A';
  else if (avg >= 65 && stdDev <= 12) riskRating = 'BBB';
  else if (avg >= 58 && stdDev <= 16) riskRating = 'BB';
  else if (avg >= 50 && stdDev <= 20) riskRating = 'B';
  else if (avg < 35) riskRating = 'D';
  const disbursementReady = ['AAA', 'AA', 'A', 'BBB'].includes(riskRating) && !['declining', 'strongly_declining'].includes(trend);
  return {
    credit_price_inr: basePrice, volatility_index: Number(stdDev.toFixed(2)),
    risk_rating: riskRating, trend,
    investment_signal: 'Fallback model — start backend for live signals.',
    disbursement_ready: disbursementReady,
    '30_day_forecast': trend.includes('improving') ? 'improving' : trend.includes('declining') ? 'at_risk' : 'stable',
  };
};

const fallbackHealthNarrative = (name: string, pop: number, avg: number, cases: number): string =>
  `${name} has maintained an average hygiene score of ${avg} across recent checks. ` +
  `For a population of ${pop}, this may have helped prevent around ${cases} sanitation-related illnesses. ` +
  `Continued weekly maintenance and water availability checks are recommended.`;


// ── Public API (same signatures as before) ─────────────────────

export const runVisionAnalysis = async (
  base64Image: string,
  checklist: Checklist
): Promise<VerificationResult> => {
  const result = await callVisionAnalysis(base64Image, checklist);
  return result ?? fallbackVisionScorer(checklist);
};

export const runCollusionCheck = async (submissions: Submission[]): Promise<CollusionResult> => {
  const result = await callCollusionCheck(submissions);
  return result ?? fallbackCollusionCheck(submissions);
};

export const generateHealthNarrative = async (
  villageName: string, population: number, avgScore: number, casesPrevented: number
): Promise<string> => {
  const result = await callHealthNarrative(villageName, population, avgScore, casesPrevented);
  return result ?? fallbackHealthNarrative(villageName, population, avgScore, casesPrevented);
};

export const generateInvestorSignal = async (
  villageName: string, history: number[], avg: number, stdDev: number
): Promise<InvestorSignalResult> => {
  const result = await callInvestorSignal(villageName, history, avg, stdDev);
  return result ?? fallbackInvestorSignal(history, avg, stdDev);
};
