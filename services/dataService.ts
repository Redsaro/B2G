import { Village, Submission } from '../types';

// Utility to generate random history
const generateHistory = (baseScore: number, volatility: number): number[] => {
  return Array.from({ length: 90 }, () => {
    const change = (Math.random() - 0.5) * volatility * 2;
    let score = baseScore + change;
    return Math.max(0, Math.min(100, Math.round(score)));
  });
};

const calculateStandardDeviation = (arr: number[]): number => {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
};

// WHO Coefficient: 23% reduction per 10pt improvement (simplified for MVP: 0.23 cases per person per year baseline, scaled by score)
// This is a rough simulation of the coefficient application described.
const calculateCasesPrevented = (population: number, avgScore: number): number => {
  const baselineCases = population * 0.15; // Assumption: 15% incidence rate baseline
  const reductionFactor = (avgScore / 100) * 0.6; // Max 60% reduction at perfect score
  return Math.round(baselineCases * reductionFactor);
};


export const MOCK_VILLAGES: Village[] = [
  {
    id: 'v1',
    name: 'Sankarpur',
    district: 'Varanasi',
    population: 1250,
    lat: 25.3176,
    lng: 82.9739,
    hygieneScoreHistory: generateHistory(85, 5), // High score, low volatility
    lastScore: 88,
    volatilityIndex: 0, // calc below
    casesPrevented: 0, // calc below
    girlsAttendance: 92,
    odfStatus: true,
  },
  {
    id: 'v2',
    name: 'Belwa',
    district: 'Gorakhpur',
    population: 890,
    lat: 26.7606,
    lng: 83.3732,
    hygieneScoreHistory: generateHistory(45, 25), // Low score, high volatility
    lastScore: 42,
    volatilityIndex: 0,
    casesPrevented: 0,
    girlsAttendance: 65,
    odfStatus: true, // Potential discrepancy!
  },
  {
    id: 'v3',
    name: 'Rampur',
    district: 'Jaunpur',
    population: 2100,
    lat: 25.7464,
    lng: 82.6837,
    hygieneScoreHistory: generateHistory(72, 10),
    lastScore: 75,
    volatilityIndex: 0,
    casesPrevented: 0,
    girlsAttendance: 85,
    odfStatus: true,
  }
];

// Initialize calculated fields
MOCK_VILLAGES.forEach(v => {
  v.volatilityIndex = parseFloat(calculateStandardDeviation(v.hygieneScoreHistory).toFixed(2));
  v.casesPrevented = calculateCasesPrevented(v.population, v.hygieneScoreHistory.reduce((a,b)=>a+b,0)/90);
});

export const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: 's1',
    submitterType: 'HOUSEHOLD',
    score: 95,
    checklist: { door: true, water: true, clean: true, pit: true },
    features: ['secure door', 'water bucket present', 'clean floor'],
    discrepancies: []
  },
  {
    id: 's2',
    submitterType: 'PEER',
    score: 92,
    checklist: { door: true, water: true, clean: true, pit: true },
    features: ['door locked', 'water available'],
    discrepancies: []
  },
  {
    id: 's3',
    submitterType: 'AUDITOR',
    score: 88,
    checklist: { door: true, water: false, clean: true, pit: true },
    features: ['door good', 'no water stored', 'clean'],
    discrepancies: ['water availability unclear']
  }
];
