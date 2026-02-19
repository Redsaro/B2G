// ─────────────────────────────────────────────────────────────────
// apiService.ts — All AI calls go through the FastAPI backend
// Backend: http://localhost:8000
// ─────────────────────────────────────────────────────────────────
import { Checklist, VerificationResult, CollusionResult, InvestorSignalResult, Submission } from "../types";

const BASE_URL = "http://localhost:8000";

// ── Connection check ───────────────────────────────────────────
export const checkBackendStatus = async (): Promise<{ connected: boolean; model: string; error?: string }> => {
    try {
        const res = await fetch(`${BASE_URL}/health`);
        const data = await res.json();
        if (data.status === "ok") return { connected: true, model: data.model };
        return { connected: false, model: "None", error: data.detail || "API key missing" };
    } catch (e: any) {
        return { connected: false, model: "None", error: "Backend not running — start uvicorn on port 8000" };
    }
};

// ── Mode 1: Vision Hygiene Scorer ─────────────────────────────
export const callVisionAnalysis = async (
    base64Image: string,
    checklist: Checklist
): Promise<VerificationResult | null> => {
    try {
        console.log("📤 [Mode 1] Vision analysis → backend");
        const res = await fetch(`${BASE_URL}/api/vision`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64_image: base64Image, checklist }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        console.log("✅ [Mode 1] Response received");
        return await res.json() as VerificationResult;
    } catch (e) {
        console.warn("⚠ [Mode 1] Backend call failed:", e);
        return null;
    }
};

// ── Mode 2: Collusion Adjudicator ─────────────────────────────
export const callCollusionCheck = async (
    submissions: Submission[]
): Promise<CollusionResult | null> => {
    try {
        console.log("📤 [Mode 2] Collusion check → backend");
        const res = await fetch(`${BASE_URL}/api/collusion`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submissions }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        console.log("✅ [Mode 2] Response received");
        return await res.json() as CollusionResult;
    } catch (e) {
        console.warn("⚠ [Mode 2] Backend call failed:", e);
        return null;
    }
};

// ── Mode 3: Health Mirror Narrator ────────────────────────────
export const callHealthNarrative = async (
    villageName: string,
    population: number,
    avgScore: number,
    casesPrevented: number
): Promise<string | null> => {
    try {
        console.log("📤 [Mode 3] Health narrative → backend");
        const res = await fetch(`${BASE_URL}/api/health-narrative`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                village_name: villageName,
                population,
                avg_score: avgScore,
                cases_prevented: casesPrevented,
            }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        console.log("✅ [Mode 3] Response received");
        const data = await res.json();
        return data.narrative as string;
    } catch (e) {
        console.warn("⚠ [Mode 3] Backend call failed:", e);
        return null;
    }
};

// ── Mode 4: Investor Signal Generator ────────────────────────
export const callInvestorSignal = async (
    villageName: string,
    history: number[],
    avg: number,
    stdDev: number
): Promise<InvestorSignalResult | null> => {
    try {
        console.log("📤 [Mode 4] Investor signal → backend");
        const res = await fetch(`${BASE_URL}/api/investor-signal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ village_name: villageName, history, avg, std_dev: stdDev }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        console.log("✅ [Mode 4] Response received");
        return await res.json() as InvestorSignalResult;
    } catch (e) {
        console.warn("⚠ [Mode 4] Backend call failed:", e);
        return null;
    }
};
