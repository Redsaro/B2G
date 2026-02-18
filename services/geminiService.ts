import { GoogleGenAI } from "@google/genai";
import { SANSURE_SYSTEM_INSTRUCTION } from "../constants";
import { Checklist, VerificationResult, CollusionResult, InvestorSignalResult, Submission } from "../types";

// Plan v3.0 Requirement: Gemini 3 Pro Preview
const MODEL_NAME = 'gemini-3-pro-preview';

let aiClient: GoogleGenAI | null = null;
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

const getAIClient = (): GoogleGenAI | null => {
  if (aiClient) {
    return aiClient;
  }

  if (!apiKey) {
    return null;
  }

  try {
    aiClient = new GoogleGenAI({ apiKey });
    return aiClient;
  } catch (error) {
    console.warn("Gemini client initialization failed. Switching to fallback mode.", error);
    return null;
  }
};

const safeJsonParse = <T>(text?: string): T | null => {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
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

// Mode 1: Vision Hygiene Scorer
export const runVisionAnalysis = async (
  base64Image: string,
  checklist: Checklist
): Promise<VerificationResult> => {
  const checklistStr = JSON.stringify(checklist);
  const prompt = `
    Analyze this toilet facility image.
    Checklist claimed by user: ${checklistStr}.
    Perform visual verification.
  `;

  const client = getAIClient();
  if (!client) {
    return fallbackVisionScorer(checklist);
  }

  try {
    const response = await client.models.generateContent({
      model: MODEL_NAME,
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
    });

    const parsed = safeJsonParse<VerificationResult>(response.text);
    return parsed || fallbackVisionScorer(checklist);
  } catch (error) {
    console.warn("Gemini Vision Error (switching to fallback):", error);
    return fallbackVisionScorer(checklist);
  }
};

// Mode 2: Collusion Adjudicator
export const runCollusionCheck = async (submissions: Submission[]): Promise<CollusionResult> => {
  const prompt = `
    Analyze these three independent submissions for the same facility to detect collusion.
    Submissions: ${JSON.stringify(submissions)}
  `;

  const client = getAIClient();
  if (!client) {
    return fallbackCollusionCheck(submissions);
  }

  try {
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SANSURE_SYSTEM_INSTRUCTION,
        temperature: 0.1,
        responseMimeType: "application/json",
      }
    });

    const parsed = safeJsonParse<CollusionResult>(response.text);
    return parsed || fallbackCollusionCheck(submissions);
  } catch (error) {
    console.error("Collusion Check Error (switching to fallback):", error);
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
  const prompt = `
    Generate a Health Mirror narrative.
    Village: ${villageName}
    Population: ${population}
    90-Day Avg Hygiene Score: ${avgScore}
    Estimated Cases Prevented: ${casesPrevented}
  `;

  const client = getAIClient();
  if (!client) {
    return fallbackHealthNarrative(villageName, population, avgScore, casesPrevented);
  }

  try {
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SANSURE_SYSTEM_INSTRUCTION,
        temperature: 0.7, // Higher temp for warmth
      }
    });

    return response.text || fallbackHealthNarrative(villageName, population, avgScore, casesPrevented);
  } catch (error) {
    console.error("Health Narrative Error:", error);
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
  const prompt = `
    Generate an Investor Risk Signal.
    Village: ${villageName}
    90-Day Score History: ${JSON.stringify(history)}
    Average Score: ${avg}
    Standard Deviation: ${stdDev}
  `;

  const client = getAIClient();
  if (!client) {
    return fallbackInvestorSignal(history, avg, stdDev);
  }

  try {
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SANSURE_SYSTEM_INSTRUCTION,
        temperature: 0.1,
        responseMimeType: "application/json",
      }
    });

    const parsed = safeJsonParse<InvestorSignalResult>(response.text);
    return parsed || fallbackInvestorSignal(history, avg, stdDev);
  } catch (error) {
    console.error("Investor Signal Error (switching to fallback):", error);
    return fallbackInvestorSignal(history, avg, stdDev);
  }
};
