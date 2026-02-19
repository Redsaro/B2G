import { Submission, VerificationResult, CollusionResult, Checklist, Village } from '../types';

// Mock Glass Vault (LocalStorage Adapter)
const STORAGE_KEYS = {
    SUBMISSIONS: 'SanMap_glass_vault_submissions',
    CYCLES: 'SanMap_glass_vault_cycles',
    VILLAGES: 'SanMap_villages' // For demo data
};

export interface StoredSubmission extends VerificationResult {
    id: string;
    villageId: string;
    facilityId: string; // "FAC_001"
    submitterRole: 'household' | 'peer' | 'auditor';
    checklist: Checklist;
    photoData: string; // Base64 (in real app, this would be a URL/Hash)
    timestamp: string;
    scoringMethod: 'gemini' | 'groq' | 'rule-based';
}

export const dbService = {
    // Initialize with some demo data if empty
    init: () => {
        if (!localStorage.getItem(STORAGE_KEYS.VILLAGES)) {
            const demoVillage: Village = {
                id: '1',
                name: 'Rampur',
                district: 'Sitapur',
                population: 450,
                lat: 27.5,
                lng: 80.5,
                hygieneScoreHistory: [65, 68, 72, 75, 78, 80, 82, 85, 83, 84],
                lastScore: 84,
                volatilityIndex: 6.8,
                casesPrevented: 29,
                girlsAttendance: 12,
                odfStatus: true,
                lastSubmissionDate: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEYS.VILLAGES, JSON.stringify([demoVillage]));
        }
    },

    saveSubmission: (
        villageId: string,
        facilityId: string,
        role: 'household' | 'peer' | 'auditor',
        checklist: Checklist,
        photoData: string,
        result: VerificationResult,
        method: 'gemini' | 'groq' | 'rule-based'
    ): StoredSubmission => {
        const submissions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBMISSIONS) || '[]');

        const newSubmission: StoredSubmission = {
            id: crypto.randomUUID(),
            villageId,
            facilityId,
            submitterRole: role,
            checklist,
            photoData,
            timestamp: new Date().toISOString(),
            scoringMethod: method,
            ...result
        };

        // Append-only (push to array)
        submissions.push(newSubmission);
        localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));

        console.log(`[GlassVault] Submission recorded: ${newSubmission.id}`);
        return newSubmission;
    },

    saveVerificationCycle: (
        villageId: string,
        facilityId: string,
        submissions: Submission[],
        result: CollusionResult
    ) => {
        const cycles = JSON.parse(localStorage.getItem(STORAGE_KEYS.CYCLES) || '[]');
        const newCycle = {
            id: crypto.randomUUID(),
            villageId,
            facilityId,
            timestamp: new Date().toISOString(),
            submissions,
            result
        };
        cycles.push(newCycle);
        localStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(cycles));
        return newCycle;
    },

    getVerificationCycles: (villageId?: string) => {
        const cycles = JSON.parse(localStorage.getItem(STORAGE_KEYS.CYCLES) || '[]');
        if (villageId) {
            return cycles.filter((c: any) => c.villageId === villageId);
        }
        return cycles;
    },

    getSubmissions: (villageId?: string): StoredSubmission[] => {
        const submissions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBMISSIONS) || '[]');
        if (villageId) {
            return submissions.filter((s: StoredSubmission) => s.villageId === villageId);
        }
        return submissions;
    },

    // Helper to get latest score for a village
    getLatestScore: (villageId: string): number | null => {
        const submissions = dbService.getSubmissions(villageId);
        if (submissions.length === 0) return null;
        // Sort by timestamp desc and take first
        return submissions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].hygiene_score;
    }
};

// Initialize on load
dbService.init();
