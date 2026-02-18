export type Role = 'LANDING' | 'CHW' | 'NGO' | 'COMMUNITY' | 'INVESTOR';

export interface Checklist {
  door: boolean;
  water: boolean;
  clean: boolean;
  pit: boolean;
}

export interface Village {
  id: string;
  name: string;
  district: string;
  population: number;
  lat: number;
  lng: number;
  hygieneScoreHistory: number[]; // 90 days
  lastScore: number;
  volatilityIndex: number; // Standard deviation
  casesPrevented: number;
  girlsAttendance: number; // percentage
  odfStatus: boolean;
}

export interface VerificationResult {
  hygiene_score: number;
  confidence: 'high' | 'medium' | 'low';
  visual_verification: {
    door: 'confirmed' | 'contradicted' | 'unclear';
    water: 'confirmed' | 'contradicted' | 'unclear';
    clean: 'confirmed' | 'contradicted' | 'unclear';
    pit: 'confirmed' | 'contradicted' | 'unclear';
  };
  detected_features: string[];
  discrepancies: string[];
  recommendation: string;
  spoofing_risk: 'low' | 'medium' | 'high';
  spoofing_reasoning: string;
}

export interface CollusionResult {
  consensus_score: number;
  score_variance: number;
  collusion_risk: 'low' | 'medium' | 'high';
  collusion_indicators: string[];
  independence_confirmed: boolean;
  reasoning: string;
  recommendation: 'mint_token' | 'hold_pending_review' | 'reject_flag_escalate';
  confidence: 'high' | 'medium' | 'low';
}

export interface InvestorSignalResult {
  credit_price_inr: number;
  volatility_index: number;
  risk_rating: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'D';
  trend: 'strongly_improving' | 'improving' | 'stable' | 'declining' | 'strongly_declining';
  investment_signal: string;
  disbursement_ready: boolean;
  '30_day_forecast': 'improving' | 'stable' | 'at_risk';
}

export interface Submission {
  id: string;
  submitterType: 'HOUSEHOLD' | 'PEER' | 'AUDITOR';
  score: number;
  checklist: Checklist;
  features: string[];
  discrepancies: string[];
}
