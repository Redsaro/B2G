import React, { useState, useEffect, useMemo } from 'react';
import { MOCK_VILLAGES, getTrustRating, getCreditPrice, calculateImpactCredits } from '../services/dataService';
import { MOCK_SUBMISSIONS } from '../services/dataService';
import { dbService } from '../services/dbService';
import MapComponent from './MapComponent';
import { Village, CollusionResult, Submission } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import {
  AlertTriangle, ShieldCheck, RefreshCw, Radio, CheckCircle2,
  XCircle, TrendingUp, TrendingDown, Minus, Users, Activity,
  Calculator, Leaf, DollarSign, Heart
} from 'lucide-react';
import { runCollusionCheck } from '../services/geminiService';
import clsx from 'clsx';

// ── Helpers ────────────────────────────────────────────────────────────────────

const isRecent = (isoDate: string, hoursThreshold = 24) => {
  const diff = Date.now() - new Date(isoDate).getTime();
  return diff < hoursThreshold * 3600 * 1000;
};

const timeSince = (isoDate: string) => {
  const diff = Date.now() - new Date(isoDate).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
};

const ratingColor = (r: string) => {
  if (['AAA', 'AA'].includes(r)) return '#3D9970';
  if (r === 'A') return '#B8F000';
  if (r === 'BBB') return '#F5A623';
  if (r === 'BB') return '#E8A023';
  return '#E8603C';
};

const trendIcon = (history: number[]) => {
  const first30 = history.slice(0, 30).reduce((a, b) => a + b, 0) / 30;
  const last30 = history.slice(60).reduce((a, b) => a + b, 0) / 30;
  const delta = last30 - first30;
  if (delta > 3) return { icon: TrendingUp, color: '#3D9970', label: 'Improving' };
  if (delta < -3) return { icon: TrendingDown, color: '#E8603C', label: 'Declining' };
  return { icon: Minus, color: '#F5A623', label: 'Stable' };
};

// ── StatusIndicator ─────────────────────────────────────────────────────────────

const StatusIndicator = () => {
  const [status, setStatus] = useState<{ connected: boolean; model: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import('../services/geminiService')
      .then(m => m.checkConnectionStatus().then(setStatus).catch(() => setError('Check Failed')))
      .catch(() => setError('Module Error'));
  }, []);

  if (error) return (
    <div className="px-4 py-2 text-[#E8603C] font-bold text-[10px] flex items-center gap-2 flex-shrink-0 bg-black/10">
      <div className="w-2 h-2 rounded-full bg-[#E8603C]" /> {error}
    </div>
  );
  if (!status) return (
    <div className="px-4 py-2 flex items-center gap-2 text-[10px] flex-shrink-0">
      <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" /> Check...
    </div>
  );
  return (
    <div className={clsx(
      "px-4 py-2 flex items-center gap-2 font-bold border-l border-[#B8F000]/20 min-w-[140px] flex-shrink-0 transition-colors duration-500",
      status.connected ? "text-[#B8F000] bg-[#B8F000]/5" : "text-[#E8603C] bg-[#E8603C]/5"
    )}>
      <div className={clsx("w-2 h-2 rounded-full", status.connected ? "bg-[#B8F000]" : "bg-[#E8603C]")} />
      {status.connected
        ? <span className="text-[10px] tracking-widest uppercase">{status.model.replace('llama-', '').slice(0, 12)}</span>
        : "OFFLINE"}
    </div>
  );
};

// ── Calculation Card ────────────────────────────────────────────────────────────

interface CalcCardProps {
  label: string;
  value: string;
  sub: string;
  formula: string;
  icon: React.ElementType;
  color: string;
}
const CalcCard: React.FC<CalcCardProps> = ({ label, value, sub, formula, icon: Icon, color }) => (
  <div className="bg-white border border-[#d1cdc3] p-5 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div className="text-[10px] uppercase tracking-widest text-[#8B7355]">{label}</div>
      <Icon size={16} style={{ color }} />
    </div>
    <div className="text-3xl font-['Syne'] font-bold" style={{ color }}>{value}</div>
    <div className="text-xs text-[#8B7355]">{sub}</div>
    <div className="mt-1 bg-[#f5f2eb] px-2 py-1.5 text-[9px] font-mono text-[#1A2E1A]/60 border-l-2 border-[#1A2E1A]/20 leading-relaxed">
      {formula}
    </div>
  </div>
);

// ── Village Row in List ─────────────────────────────────────────────────────────

const VillageListRow: React.FC<{ v: ReturnType<typeof MOCK_VILLAGES[0]['valueOf']>, selected: boolean, onClick: () => void }> = ({ v, selected, onClick }) => {
  const trustRating = getTrustRating(v.lastScore, v.volatilityIndex);
  const trend = trendIcon(v.hygieneScoreHistory);
  const TrendIcon = trend.icon;
  const recent = isRecent(v.lastSubmissionDate);
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full text-left px-4 py-3 border-b border-[#f0ece4] hover:bg-[#f9f8f5] transition-all flex items-center gap-3",
        selected && "bg-[#f5f2eb] border-l-2 border-l-[#1A2E1A]"
      )}
    >
      {/* Score circle */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
        style={{ backgroundColor: v.lastScore > 75 ? '#3D9970' : v.lastScore < 50 ? '#E8603C' : '#F5A623' }}
      >
        {v.lastScore}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm text-[#1A2E1A] truncate">{v.name}</span>
          {recent && <span className="w-1.5 h-1.5 rounded-full bg-[#B8F000] animate-pulse flex-shrink-0" title="Active today" />}
          {v.odfStatus && v.lastScore < 60 && <AlertTriangle size={10} className="text-[#E8603C] flex-shrink-0" />}
        </div>
        <div className="text-[10px] text-[#8B7355] flex items-center gap-2">
          <span>{v.district}</span>
          <span>·</span>
          <span>{timeSince(v.lastSubmissionDate)}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: ratingColor(trustRating) + '22', color: ratingColor(trustRating) }}>
          {trustRating}
        </span>
        <TrendIcon size={10} style={{ color: trend.color }} />
      </div>
    </button>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────────

const DashboardView: React.FC = () => {
  const [selectedVillage, setSelectedVillage] = useState<Village>(MOCK_VILLAGES[0]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [loadingCollusion, setLoadingCollusion] = useState(false);
  const [chartRange, setChartRange] = useState<30 | 90>(90);
  const [showCalcs, setShowCalcs] = useState(true);

  useEffect(() => {
    const loadedCycles = dbService.getVerificationCycles(selectedVillage.id);
    setCycles(loadedCycles.reverse());
  }, [selectedVillage]);

  const chartDataFull = selectedVillage.hygieneScoreHistory.map((score, i) => ({ day: `D${i + 1}`, score }));
  const chartData = chartRange === 30 ? chartDataFull.slice(-30) : chartDataFull;
  const avg90 = Math.round(selectedVillage.hygieneScoreHistory.reduce((a, b) => a + b, 0) / 90);

  // ── Derived calculations ──────────────────────────────────────────────────
  const trustRating = getTrustRating(selectedVillage.lastScore, selectedVillage.volatilityIndex);
  const creditPrice = getCreditPrice(trustRating);
  const impactCredits = calculateImpactCredits(selectedVillage.population, avg90, selectedVillage.volatilityIndex);

  // WHO diarrheal reduction
  const baselineCases = Math.round(selectedVillage.population * 0.15);
  const pctReduction = Math.round((avg90 / 100) * 0.6 * 100);
  const whoReduction = Math.round((avg90 - 50) / 10 * 23); // % vs 50-score baseline

  // Volatility-adjusted score
  const volPenalty = Math.round(Math.min(selectedVillage.volatilityIndex * 2, 30));
  const adjScore = selectedVillage.lastScore - volPenalty;

  const trend = trendIcon(selectedVillage.hygieneScoreHistory);
  const TrendIcon = trend.icon;

  const handleRunCollusion = async () => {
    setLoadingCollusion(true);
    try {
      let submissions: Submission[] = dbService.getSubmissions(selectedVillage.id).map(s => ({
        id: s.id,
        facilityId: s.facilityId,
        submitterType: s.submitterRole === 'household' ? 'HOUSEHOLD' : s.submitterRole === 'peer' ? 'PEER' : 'AUDITOR',
        score: s.hygiene_score,
        checklist: s.checklist,
        features: s.detected_features,
        discrepancies: s.discrepancies
      }));

      if (submissions.length < 3) {
        submissions = MOCK_SUBMISSIONS;
      }

      const result = await runCollusionCheck(submissions);
      const newCycle = dbService.saveVerificationCycle(selectedVillage.id, submissions[0]?.facilityId || 'FAC_DEMO', submissions, result);
      setCycles(prev => [newCycle, ...prev]);
    } catch (e) {
      alert('Error checking collusion');
      console.error(e);
    } finally {
      setLoadingCollusion(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Live Ticker */}
      <div className="flex bg-[#1A2E1A] text-[#EEE9DF] text-[10px] uppercase tracking-wider overflow-hidden">
        <div className="flex items-center gap-2 text-[#B8F000] shrink-0 font-bold px-4 py-2 border-r border-[#B8F000]/20">
          <Radio size={14} className={loadingCollusion ? 'animate-spin' : 'animate-pulse'} />
          Live Feed
        </div>
        <div className="flex-1 flex items-center px-4 overflow-hidden">
          <div className="animate-[slide_20s_linear_infinite] whitespace-nowrap opacity-80">
            New report from Sankarpur (Score: 88) ••• Collusion passed for Nawabganj ••• ODF discrepancy: Belwa District ••• Disbursement approved Rampur Cluster ₹35,000 ••• Hathua AAA-rated this week ••• Buxar Colony flagged for review
          </div>
        </div>
        <StatusIndicator />
      </div>

      {/* Main Grid: Village List + Map + Detail Panel */}
      <div className="grid md:grid-cols-[220px_1fr_260px] gap-6 h-[480px]">

        {/* Village Selector List */}
        <div className="bg-white border border-[#d1cdc3] overflow-y-auto shadow-sm flex flex-col">
          <div className="px-4 py-3 border-b border-[#d1cdc3] bg-[#f5f2eb] flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#1A2E1A]">Villages</span>
            <span className="text-[10px] text-[#8B7355]">{MOCK_VILLAGES.length} sites</span>
          </div>
          {MOCK_VILLAGES.map(v => (
            <VillageListRow
              key={v.id}
              v={v}
              selected={v.id === selectedVillage.id}
              onClick={() => setSelectedVillage(v)}
            />
          ))}
        </div>

        {/* Map */}
        <div className="bg-white border border-[#d1cdc3] p-1 shadow-sm relative">
          <MapComponent
            villages={MOCK_VILLAGES}
            onSelect={setSelectedVillage}
            selectedId={selectedVillage.id}
          />
          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-2 text-[10px] uppercase tracking-wider pointer-events-none border border-[#d1cdc3] flex flex-col gap-1">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3D9970]" />High Trust (&gt;75)</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F5A623]" />Monitoring (50–75)</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#E8603C]" />Critical (&lt;50)</div>
            <div className="flex items-center gap-1.5 mt-1 border-t border-[#e0dbd0] pt-1"><span className="w-2 h-2 rounded-full bg-[#B8F000] animate-pulse" />Active &lt;24h</div>
          </div>
        </div>

        {/* Village Detail */}
        <div className="bg-white border border-[#d1cdc3] shadow-sm flex flex-col overflow-y-auto">
          <div className="p-5 border-b border-[#d1cdc3] bg-[#f5f2eb]">
            <div className="text-[10px] uppercase tracking-widest text-[#8B7355] mb-0.5">Selected Site</div>
            <h2 className="text-2xl font-['Syne'] font-bold text-[#1A2E1A]">{selectedVillage.name}</h2>
            <div className="text-xs text-[#8B7355] flex items-center gap-2 mt-1">
              <span className="w-1 h-3 bg-[#1A2E1A]" />
              {selectedVillage.district} District
              <span className="ml-auto flex items-center gap-1">
                {isRecent(selectedVillage.lastSubmissionDate) && <span className="w-1.5 h-1.5 rounded-full bg-[#B8F000] animate-pulse" />}
                {timeSince(selectedVillage.lastSubmissionDate)}
              </span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Score */}
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#8B7355]">Hygiene Score</div>
                <div
                  className="text-4xl font-['Syne'] font-bold"
                  style={{ color: selectedVillage.lastScore > 75 ? '#3D9970' : selectedVillage.lastScore < 50 ? '#E8603C' : '#F5A623' }}
                >
                  {selectedVillage.lastScore}/100
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-[#8B7355]">Rating</div>
                <div className="text-2xl font-['Syne'] font-bold" style={{ color: ratingColor(trustRating) }}>{trustRating}</div>
              </div>
            </div>

            {/* Trend */}
            <div className="flex items-center gap-2 text-xs">
              <TrendIcon size={14} style={{ color: trend.color }} />
              <span style={{ color: trend.color }} className="font-bold">{trend.label}</span>
              <span className="text-[#8B7355]">over 90 days</span>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-[#f5f2eb] p-3">
                <div className="text-[#8B7355] uppercase text-[9px] tracking-wider">Volatility σ</div>
                <div className="font-bold text-[#1A2E1A] text-base">{selectedVillage.volatilityIndex.toFixed(1)}</div>
              </div>
              <div className="bg-[#f5f2eb] p-3">
                <div className="text-[#8B7355] uppercase text-[9px] tracking-wider">Population</div>
                <div className="font-bold text-[#1A2E1A] text-base">{selectedVillage.population.toLocaleString()}</div>
              </div>
              <div className="bg-[#f5f2eb] p-3">
                <div className="text-[#8B7355] uppercase text-[9px] tracking-wider">Cases Prevented</div>
                <div className="font-bold text-[#3D9970] text-base">{selectedVillage.casesPrevented}</div>
              </div>
              <div className="bg-[#f5f2eb] p-3">
                <div className="text-[#8B7355] uppercase text-[9px] tracking-wider">Girls Attendance</div>
                <div className="font-bold text-[#1A2E1A] text-base">{selectedVillage.girlsAttendance}%</div>
              </div>
            </div>

            {/* ODF Discrepancy */}
            {selectedVillage.odfStatus && selectedVillage.lastScore < 60 && (
              <div className="bg-[#E8603C]/10 border border-[#E8603C] p-3 flex items-start gap-2 animate-pulse">
                <AlertTriangle className="text-[#E8603C] shrink-0 mt-0.5" size={14} />
                <div className="text-[10px] text-[#E8603C] leading-tight font-bold">
                  ODF DISCREPANCY<br />
                  <span className="font-normal text-[#1A2E1A]">Official ODF cert conflicts with field score.</span>
                </div>
              </div>
            )}

            {/* Credit Price */}
            <div className="border-t border-[#f0ece4] pt-3">
              <div className="text-[10px] uppercase tracking-widest text-[#8B7355] mb-1">Impact Credit Price</div>
              <div className="text-2xl font-['Syne'] font-bold text-[#1A2E1A]">
                ₹{creditPrice.toLocaleString()}
                <span className="text-xs font-normal text-[#8B7355] ml-1">/ credit</span>
              </div>
              <div className="text-[10px] text-[#8B7355]">{impactCredits} credits mintable this cycle</div>
            </div>
          </div>
        </div>
      </div>

      {/* 90-Day Chart */}
      <div className="bg-white p-6 border border-[#d1cdc3] shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A2E1A]">Hygiene Score Trend — {selectedVillage.name}</h3>
            <div className="text-[10px] text-[#8B7355] mt-0.5">90-day rolling avg: <span className="font-bold text-[#1A2E1A]">{avg90}/100</span></div>
          </div>
          <div className="flex gap-2">
            {([90, 30] as const).map(r => (
              <button key={r} onClick={() => setChartRange(r)}
                className={clsx("text-[10px] px-2 py-1 font-bold transition-colors",
                  chartRange === r ? "bg-[#1A2E1A] text-[#B8F000]" : "hover:bg-[#f5f2eb] text-[#8B7355]"
                )}>
                {r}D
              </button>
            ))}
          </div>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="day" hide />
              <YAxis domain={[0, 100]} hide />
              <ReferenceLine y={avg90} stroke="#1A2E1A" strokeDasharray="4 4" strokeOpacity={0.3} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1A2E1A', color: '#B8F000', border: 'none', fontSize: '12px', borderRadius: '4px' }}
                itemStyle={{ color: '#B8F000' }}
              />
              <Line type="monotone" dataKey="score" stroke="#3D9970" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#B8F000' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Calculation Panel ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#d1cdc3] shadow-sm">
        <button
          onClick={() => setShowCalcs(c => !c)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#f5f2eb] transition-colors"
        >
          <div className="flex items-center gap-2 font-bold text-sm text-[#1A2E1A] uppercase tracking-wider">
            <Calculator size={16} />
            Score Calculation Breakdown — {selectedVillage.name}
          </div>
          <span className="text-[10px] text-[#8B7355] font-bold">{showCalcs ? '▲ HIDE' : '▼ SHOW'}</span>
        </button>

        {showCalcs && (
          <div className="p-6 border-t border-[#f0ece4] space-y-6">
            {/* Step 1: Raw Score */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#8B7355] mb-3 flex items-center gap-2">
                <span className="bg-[#1A2E1A] text-[#B8F000] w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px]">1</span>
                Raw Hygiene Score (AI Vision Output)
              </div>
              <div className="flex items-center gap-4">
                <div className="text-5xl font-['Syne'] font-bold" style={{ color: selectedVillage.lastScore > 75 ? '#3D9970' : selectedVillage.lastScore < 50 ? '#E8603C' : '#F5A623' }}>
                  {selectedVillage.lastScore}
                </div>
                <div className="text-xs text-[#8B7355] leading-relaxed max-w-sm">
                  Groq Llama 4 Scout scores the facility image across 4 dimensions: structural integrity, water availability, cleanliness, and toilet visibility. Output: 0–100.
                </div>
              </div>
            </div>

            {/* Step 2: Volatility Penalty */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#8B7355] mb-3 flex items-center gap-2">
                <span className="bg-[#1A2E1A] text-[#B8F000] w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px]">2</span>
                Volatility Adjustment
              </div>
              <div className="bg-[#f5f2eb] p-4 font-mono text-sm space-y-1 border-l-4 border-[#F5A623]">
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">Raw score</span>
                  <span className="font-bold text-[#1A2E1A]">{selectedVillage.lastScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">Volatility σ = {selectedVillage.volatilityIndex.toFixed(1)} × 2</span>
                  <span className="font-bold text-[#E8603C]">− {volPenalty}</span>
                </div>
                <div className="border-t border-[#d1cdc3] pt-1 flex justify-between font-bold">
                  <span className="text-[#1A2E1A]">Adjusted score</span>
                  <span style={{ color: adjScore > 75 ? '#3D9970' : adjScore < 50 ? '#E8603C' : '#F5A623' }}>{adjScore}</span>
                </div>
              </div>
            </div>

            {/* Step 3: Trust Rating */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#8B7355] mb-3 flex items-center gap-2">
                <span className="bg-[#1A2E1A] text-[#B8F000] w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px]">3</span>
                Trust Rating Matrix
              </div>
              <div className="grid grid-cols-8 gap-1 text-center text-[9px]">
                {['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'D'].map(r => (
                  <div key={r} className={clsx(
                    "py-2 font-bold rounded transition-all",
                    r === trustRating ? "scale-110 shadow-md text-white" : "opacity-40 bg-[#f5f2eb] text-[#8B7355]"
                  )} style={r === trustRating ? { backgroundColor: ratingColor(r), color: 'white' } : {}}>
                    {r}
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-[#8B7355] mt-2 text-center">
                Adjusted score <strong>{adjScore}</strong> → <strong style={{ color: ratingColor(trustRating) }}>{trustRating}</strong>
              </div>
            </div>

            {/* Steps 4+5 Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* WHO calculation */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#8B7355] mb-3 flex items-center gap-2">
                  <span className="bg-[#1A2E1A] text-[#B8F000] w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px]">4</span>
                  WHO Health Impact (SDG 6.2)
                </div>
                <div className="bg-[#f5f2eb] p-4 font-mono text-xs space-y-1 border-l-4 border-[#3D9970]">
                  <div className="flex justify-between">
                    <span className="text-[#8B7355]">Population</span>
                    <span className="font-bold">{selectedVillage.population.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8B7355]">Baseline incidence (15%)</span>
                    <span className="font-bold">{baselineCases} cases/yr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8B7355]">WHO coeff ({avg90}/100 × 60%)</span>
                    <span className="font-bold">{pctReduction}% reduction</span>
                  </div>
                  <div className="border-t border-[#d1cdc3] pt-1 flex justify-between font-bold">
                    <span className="text-[#1A2E1A]">Cases prevented</span>
                    <span className="text-[#3D9970]">{selectedVillage.casesPrevented} / yr</span>
                  </div>
                </div>
              </div>

              {/* Credit price */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#8B7355] mb-3 flex items-center gap-2">
                  <span className="bg-[#1A2E1A] text-[#B8F000] w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px]">5</span>
                  Impact Credit Valuation
                </div>
                <div className="bg-[#f5f2eb] p-4 font-mono text-xs space-y-1 border-l-4 border-[#1A2E1A]">
                  <div className="flex justify-between">
                    <span className="text-[#8B7355]">Trust Rating</span>
                    <span className="font-bold" style={{ color: ratingColor(trustRating) }}>{trustRating}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8B7355]">Credit price</span>
                    <span className="font-bold">₹{creditPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8B7355]">Credits (pop × quality × stability)</span>
                    <span className="font-bold">{impactCredits}</span>
                  </div>
                  <div className="border-t border-[#d1cdc3] pt-1 flex justify-between font-bold">
                    <span className="text-[#1A2E1A]">Cycle value</span>
                    <span className="text-[#1A2E1A]">₹{(impactCredits * creditPrice).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cluster stats */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#8B7355] mb-3 flex items-center gap-2">
                <span className="bg-[#1A2E1A] text-[#B8F000] w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px]">6</span>
                Platform Cluster Aggregate (All {MOCK_VILLAGES.length} Villages)
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(() => {
                  const totalPop = MOCK_VILLAGES.reduce((a, v) => a + v.population, 0);
                  const avgScore = Math.round(MOCK_VILLAGES.reduce((a, v) => a + v.lastScore, 0) / MOCK_VILLAGES.length);
                  const totalCases = MOCK_VILLAGES.reduce((a, v) => a + v.casesPrevented, 0);
                  const avgVol = (MOCK_VILLAGES.reduce((a, v) => a + v.volatilityIndex, 0) / MOCK_VILLAGES.length).toFixed(1);
                  return [
                    { label: 'Total Population', value: totalPop.toLocaleString(), icon: Users, color: '#1A2E1A' },
                    { label: 'Avg Hygiene Score', value: `${avgScore}/100`, icon: Activity, color: avgScore > 70 ? '#3D9970' : '#F5A623' },
                    { label: 'Total Cases Prevented', value: totalCases.toLocaleString(), icon: Heart, color: '#3D9970' },
                    { label: 'Avg Volatility σ', value: avgVol, icon: TrendingUp, color: '#F5A623' },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-[#f5f2eb] p-3 border border-[#e2ddd5]">
                      <div className="flex items-center gap-1 text-[#8B7355] text-[9px] uppercase tracking-wider mb-1">
                        <Icon size={10} style={{ color }} />
                        {label}
                      </div>
                      <div className="font-['Syne'] font-bold text-lg" style={{ color }}>{value}</div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collusion Panel */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#f5f2eb] p-6 border border-[#d1cdc3] relative overflow-hidden flex flex-col">
          <ShieldCheck className="absolute -bottom-4 -right-4 text-[#1A2E1A]/5 w-32 h-32" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="font-['Syne'] font-bold text-lg text-[#1A2E1A]">Collusion Adjudicator</h3>
            <span className="text-[10px] bg-[#1A2E1A] text-[#EEE9DF] px-2 py-1 uppercase tracking-wider font-bold">Mode 2</span>
          </div>
          <div className="flex-1 space-y-2 mb-6 relative z-10">
            <div className="flex items-center justify-between text-xs text-[#8B7355] border-b border-[#d1cdc3] pb-2">
              <span>Cycle Candidates</span>
              <span>{dbService.getSubmissions(selectedVillage.id).length} Available</span>
            </div>
            <div className="text-xs text-[#8B7355] italic">
              Ready to adjudicate {dbService.getSubmissions(selectedVillage.id).length || 3} independent submissions…
            </div>
          </div>
          <div className="flex items-center gap-1 text-[9px] font-mono text-[#3D9970]/70 mb-2 relative z-10">
            <span>⚡</span>
            <span>Collusion analysis via Llama 4 Scout</span>
          </div>
          <button
            onClick={handleRunCollusion}
            disabled={loadingCollusion}
            className="relative z-10 flex items-center gap-2 bg-[#1A2E1A] text-[#B8F000] px-5 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#2A402A] transition-colors w-full justify-center shadow-md active:shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={loadingCollusion ? 'animate-spin' : ''} />
            Run Adjudication Protocol
          </button>
        </div>

        <div className="bg-white p-6 border border-[#d1cdc3] min-h-[300px] shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-[#d1cdc3] pb-2">
            <h3 className="font-bold text-sm text-[#1A2E1A] uppercase tracking-wider">Adjudication Log</h3>
            <span className="text-[10px] text-[#8B7355]">{cycles.length} Verified Cycles</span>
          </div>
          {cycles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#d1cdc3] text-sm italic">
              <ShieldCheck size={32} className="mb-2 opacity-20" />
              No adjudication records found.
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {cycles.map((cycle) => (
                <div key={cycle.id} className="bg-[#f9f9f9] p-4 border-l-2 border-[#d1cdc3] hover:border-[#1A2E1A] transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-[#1A2E1A] text-sm">{cycle.facilityId}</div>
                      <div className="text-[10px] text-[#8B7355]">{new Date(cycle.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <div className={clsx(
                      "text-[10px] uppercase font-bold px-2 py-1 rounded-sm flex items-center gap-1",
                      cycle.result.collusion_risk === 'low' ? "bg-[#B8F000]/20 text-[#1A2E1A]" : "bg-[#E8603C]/20 text-[#E8603C]"
                    )}>
                      {cycle.result.collusion_risk === 'low' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                      Risk: {cycle.result.collusion_risk}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-[#8B7355]">Consensus Score:</span>
                    <span className="font-['Syne'] font-bold text-lg text-[#3D9970]">{cycle.result.consensus_score}</span>
                  </div>
                  <div className="text-[10px] text-[#1A2E1A] opacity-80 border-t border-[#e2e8f0] pt-2">{cycle.result.reasoning}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;