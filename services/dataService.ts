import { Village, Submission } from '../types';

// Utility to generate random history
const generateHistory = (baseScore: number, volatility: number): number[] => {
  return Array.from({ length: 90 }, (_, i) => {
    const trend = (i / 90) * (Math.random() > 0.5 ? 5 : -5); // slight drift
    const change = (Math.random() - 0.5) * volatility * 2;
    let score = baseScore + trend + change;
    return Math.max(0, Math.min(100, Math.round(score)));
  });
};

const calculateStandardDeviation = (arr: number[]): number => {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
};

// WHO Coefficient: 23% reduction per 10pt improvement
const calculateCasesPrevented = (population: number, avgScore: number): number => {
  const baselineCases = population * 0.15; // 15% incidence rate baseline
  const reductionFactor = (avgScore / 100) * 0.6; // Max 60% reduction at perfect score
  return Math.round(baselineCases * reductionFactor);
};

// Trust rating derived from score + volatility
export const getTrustRating = (score: number, volatility: number): string => {
  const vol_penalty = Math.min(volatility * 2, 30);
  const adj = score - vol_penalty;
  if (adj >= 85) return 'AAA';
  if (adj >= 75) return 'AA';
  if (adj >= 65) return 'A';
  if (adj >= 55) return 'BBB';
  if (adj >= 45) return 'BB';
  if (adj >= 35) return 'B';
  if (adj >= 20) return 'CCC';
  return 'D';
};

// Credit price in INR derived from trust rating
export const getCreditPrice = (trustRating: string): number => {
  const prices: Record<string, number> = {
    'AAA': 1850, 'AA': 1650, 'A': 1400,
    'BBB': 1150, 'BB': 900, 'B': 650,
    'CCC': 400, 'D': 200
  };
  return prices[trustRating] ?? 500;
};

// Impact credits minted per verification cycle
export const calculateImpactCredits = (population: number, avgScore: number, volatility: number): number => {
  const base = population * 0.001; // 1 credit per 1000 person-days baseline
  const quality = avgScore / 100;
  const stability = Math.max(0, 1 - volatility / 30);
  return parseFloat((base * quality * stability).toFixed(2));
};

export interface VillageWithMeta extends Village {
  lastSubmissionDate: string; // ISO date
}

export const MOCK_VILLAGES: VillageWithMeta[] = [
  {
    id: 'v1',
    name: 'Sankarpur',
    district: 'Varanasi',
    population: 1250,
    lat: 25.3176,
    lng: 82.9739,
    hygieneScoreHistory: generateHistory(85, 5),
    lastScore: 88,
    volatilityIndex: 0,
    casesPrevented: 0,
    girlsAttendance: 92,
    odfStatus: true,
    lastSubmissionDate: new Date().toISOString(), // today
  },
  {
    id: 'v2',
    name: 'Belwa',
    district: 'Gorakhpur',
    population: 890,
    lat: 26.7606,
    lng: 83.3732,
    hygieneScoreHistory: generateHistory(45, 25),
    lastScore: 42,
    volatilityIndex: 0,
    casesPrevented: 0,
    girlsAttendance: 65,
    odfStatus: true, // ODF discrepancy!
    lastSubmissionDate: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
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
    lastSubmissionDate: new Date().toISOString(),
  },
  {
    id: 'v4',
    name: 'Chandpur',
    district: 'Allahabad',
    population: 1680,
    lat: 25.4358,
    lng: 81.8463,
    hygieneScoreHistory: generateHistory(62, 12),
    lastScore: 64,
    volatilityIndex: 0,
    casesPrevented: 0,
    girlsAttendance: 78,
    odfStatus: false,
    lastSubmissionDate: new Date(Date.now() - 6 * 3600000).toISOString(), // 6 hours ago
  },
  {
    id: 'v5',
    name: 'Pipra Kalan',
    district: 'Saran',
    population: 3200,
    lat: 25.9177,
    lng: 84.7440,
    hygieneScoreHistory: generateHistory(55, 18),
    lastScore: 51,
    volatilityIndex: 0,
    casesPrevented: 0,
    girlsAttendance: 70,
    odfStatus: true,
    lastSubmissionDate: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'v6',
    name: 'Ghazipur Khas',
    district: 'Ghazipur',
    population: 950,
    lat: 25.5772,
    lng: 83.5810,
    hygieneScoreHistory: generateHistory(90, 4),
    lastScore: 93,
    volatilityIndex: 0,
    casesPrevented: 0,
    girlsAttendance: 97,
    odfStatus: true,
    lastSubmissionDate: new Date().toISOString(),
  },
  {
    id: 'v7',
    name: 'Azmatpur',
    district: 'Azamgarh',
    population: 1450,
    lat: 26.0643,
    lng: 83.1838,
    hygieneScoreHistory: generateHistory(38, 22),
    lastScore: 35,
    volatilityIndex: 0,
    casesPrevented: 0,
    girlsAttendance: 58,
    odfStatus: false,
    lastSubmissionDate: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'v8',
    name: 'Nawabganj',
    district: 'Barabanki',
    population: 2750,
    lat: 26.9433,
    lng: 81.2423,
    hygieneScoreHistory: generateHistory(76, 8),
    lastScore: 78,
    volatilityIndex: 0,
    casesPrevented: 0,
    girlsAttendance: 88,
    odfStatus: true,
    lastSubmissionDate: new Date(Date.now() - 18 * 3600000).toISOString(), // 18 hours ago
  },
  {
    id: 'v9',
    name: 'Dohrighat',
    district: 'Mau',
    population: 1100,
    lat: 26.2657,
    lng: 83.7396,
    hygieneScoreHistory: generateHistory(68, 15),
    lastScore: 71,
    volatilityIndex: 0,
    casesPrevented: 0,
    girlsAttendance: 82,
    odfStatus: true,
    lastSubmissionDate: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'v10',
    name: 'Buxar Colony',
    district: 'Buxar',
    population: 1900,
    lat: 25.5641,
    lng: 83.9763,
    hygieneScoreHistory: generateHistory(29, 20),
    lastScore: 28,
    volatilityIndex: 0,
    casesPrevented: 0,
    girlsAttendance: 48,
    odfStatus: false,
    lastSubmissionDate: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 'v11',
    name: 'Hathua',
    district: 'Gopalganj',
    population: 2400,
    lat: 26.3529,
    lng: 84.4189,
    hygieneScoreHistory: generateHistory(81, 7),
    lastScore: 84,
    volatilityIndex: 0,
    casesPrevented: 0,
    girlsAttendance: 91,
    odfStatus: true,
    lastSubmissionDate: new Date().toISOString(),
  },
  {
    id: 'v12',
    name: 'Siwan Nagar',
    district: 'Siwan',
    population: 3100,
    lat: 26.2205,
    lng: 84.3549,
    hygieneScoreHistory: generateHistory(59, 14),
    lastScore: 57,
    volatilityIndex: 0,
    casesPrevented: 0,
    girlsAttendance: 74,
    odfStatus: false,
    lastSubmissionDate: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

// Initialise calculated fields
MOCK_VILLAGES.forEach(v => {
  v.volatilityIndex = parseFloat(calculateStandardDeviation(v.hygieneScoreHistory).toFixed(2));
  v.casesPrevented = calculateCasesPrevented(v.population, v.hygieneScoreHistory.reduce((a, b) => a + b, 0) / 90);
});

export const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: 's1',
    facilityId: 'f1',
    submitterType: 'HOUSEHOLD',
    score: 95,
    checklist: { door: true, water: true, clean: true, toilet: true },
    features: ['secure door', 'water bucket present', 'clean floor'],
    discrepancies: []
  },
  {
    id: 's2',
    facilityId: 'f1',
    submitterType: 'PEER',
    score: 92,
    checklist: { door: true, water: true, clean: true, toilet: true },
    features: ['door locked', 'water available'],
    discrepancies: []
  },
  {
    id: 's3',
    facilityId: 'f1',
    submitterType: 'AUDITOR',
    score: 88,
    checklist: { door: true, water: false, clean: true, toilet: true },
    features: ['door good', 'no water stored', 'clean'],
    discrepancies: ['water availability unclear']
  }
];
