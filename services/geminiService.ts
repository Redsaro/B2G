import { GoogleGenAI, Schema } from "@google/genai";
import { SANSURE_SYSTEM_INSTRUCTION } from "../constants";
import { Checklist, VerificationResult, CollusionResult, InvestorSignalResult, Submission } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Plan v3.0 Requirement: Gemini 3 Pro Preview
const MODEL_NAME = 'gemini-3-pro-preview';

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
    detected_features: ['Manual checklist verification (Network/API Fallback)'],
    discrepancies: ['AI verification unavailable - score based on self-report only'],
    recommendation: 'Submit visual evidence when connectivity improves.',
    spoofing_risk: 'low',
    spoofing_reasoning: 'Fallback mode active: Image analysis skipped.'
  };
};

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

  try {
    const response = await ai.models.generateContent({
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

    const text = response.text || "{}";
    return JSON.parse(text) as VerificationResult;
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

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SANSURE_SYSTEM_INSTRUCTION,
        temperature: 0.1,
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "{}") as CollusionResult;
  } catch (error) {
    console.error("Collusion Check Error:", error);
    throw error;
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

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SANSURE_SYSTEM_INSTRUCTION,
        temperature: 0.7, // Higher temp for warmth
      }
    });

    return response.text || "Community data currently updating. Please check back.";
  } catch (error) {
    console.error("Health Narrative Error:", error);
    return "Sanitation protects our community. Continued maintenance keeps our families safe.";
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

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SANSURE_SYSTEM_INSTRUCTION,
        temperature: 0.1,
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "{}") as InvestorSignalResult;
  } catch (error) {
    console.error("Investor Signal Error:", error);
    throw error;
  }
};