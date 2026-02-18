import React, { useState, useEffect } from 'react';
import { MOCK_VILLAGES, MOCK_SUBMISSIONS } from '../services/dataService';
import { dbService } from '../services/dbService';
import MapComponent from './MapComponent';
import { Village, CollusionResult, Submission } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, ShieldCheck, RefreshCw, Radio, CheckCircle2, XCircle } from 'lucide-react';
import { runCollusionCheck } from '../services/geminiService';
import clsx from 'clsx';

const StatusIndicator = () => {
  const [status, setStatus] = useState<{ connected: boolean; model: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("StatusIndicator: Mounting...");
    import('../services/geminiService')
      .then((module) => {
        console.log("StatusIndicator: geminiService imported", module);
        module.checkConnectionStatus()
          .then((result) => {
            console.log("StatusIndicator: Connection Result:", result);
            setStatus(result);
          })
          .catch(e => {
            console.error("StatusIndicator: Check Failed:", e);
            setError("Check Failed");
          });
      })
      .catch(e => {
        console.error("StatusIndicator: Failed to import geminiService:", e);
        setError("Module Error");
      });
  }, []);

  if (error) return (
    <div className="px-4 py-2 text-[#E8603C] font-bold text-[10px] flex items-center gap-2 flex-shrink-0 bg-black/10">
      <div className="w-2 h-2 rounded-full bg-[#E8603C]" />
      {error}
    </div>
  );

  if (!status) return (
    <div className="px-4 py-2 flex items-center gap-2 text-[10px] flex-shrink-0">
      <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />
      Check...
    </div>
  );

  return (
    <div className={clsx(
      "px-4 py-2 flex items-center gap-2 font-bold border-l border-[#B8F000]/20 min-w-[140px] flex-shrink-0 transition-colors duration-500",
      status.connected ? "text-[#B8F000] bg-[#B8F000]/5" : "text-[#E8603C] bg-[#E8603C]/5"
    )}>
      <div className={clsx("w-2 h-2 rounded-full", status.connected ? "bg-[#B8F000]" : "bg-[#E8603C]")} />
      {status.connected ? <span className="text-[10px] tracking-widest uppercase">{status.model.replace('gemini-', '').replace('-exp', '')}</span> : "OFFLINE"}
    </div>
  );
};

const DashboardView: React.FC = () => {
  const [selectedVillage, setSelectedVillage] = useState<Village>(MOCK_VILLAGES[0]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [loadingCollusion, setLoadingCollusion] = useState(false);

  useEffect(() => {
    // Load existing cycles for the village
    const loadedCycles = dbService.getVerificationCycles(selectedVillage.id);
    setCycles(loadedCycles.reverse()); // Newest first
  }, [selectedVillage]);

  const chartData = selectedVillage.hygieneScoreHistory.map((score, i) => ({
    day: `D${i + 1}`,
    score
  }));

  const handleRunCollusion = async () => {
    setLoadingCollusion(true);
    try {
      // Try to get real submissions first
      let submissions: Submission[] = dbService.getSubmissions(selectedVillage.id).map(s => ({
        id: s.id,
        facilityId: s.facilityId,
        submitterType: s.submitterRole === 'household' ? 'HOUSEHOLD' : s.submitterRole === 'peer' ? 'PEER' : 'AUDITOR',
        score: s.hygiene_score,
        checklist: s.checklist,
        features: s.detected_features,
        discrepancies: s.discrepancies
      }));

      // Fallback to mock if not enough data for demo
      if (submissions.length < 3) {
        console.log("Not enough real submissions, using mock data for demo");
        submissions = MOCK_SUBMISSIONS;
      }

      const result = await runCollusionCheck(submissions);

      // Save the cycle
      const newCycle = dbService.saveVerificationCycle(
        selectedVillage.id,
        submissions[0]?.facilityId || "FAC_DEMO",
        submissions,
        result
      );

      setCycles(prev => [newCycle, ...prev]);

    } catch (e) {
      alert("Error checking collusion");
      console.error(e);
    } finally {
      setLoadingCollusion(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Live Activity Ticker & System Status */}
      <div className="flex bg-[#1A2E1A] text-[#EEE9DF] text-[10px] uppercase tracking-wider overflow-hidden">
        <div className="flex items-center gap-2 text-[#B8F000] shrink-0 font-bold px-4 py-2 border-r border-[#B8F000]/20">
          <Radio size={14} className={loadingCollusion ? "animate-spin" : "animate-pulse"} />
          Live Feed
        </div>
        <div className="flex-1 flex items-center px-4 overflow-hidden">
          <div className="animate-[slide_20s_linear_infinite] whitespace-nowrap opacity-80">
            New report received from Sankarpur (Score: 88)  •••  Collusion check passed for Village ID #V209  •••  Alert: ODF discrepancy flagged in Belwa District  •••  Disbursement approved for Rampur Cluster (₹35,000)
          </div>
        </div>

        {/* Connection Status Indicator */}
        <StatusIndicator />
      </div>

      {/* Top Row: Map and Stats */}
      <div className="grid md:grid-cols-3 gap-6 h-[400px]">
        {/* Map */}
        <div className="md:col-span-2 bg-white border border-[#d1cdc3] p-1 shadow-sm relative group">
          <MapComponent
            villages={MOCK_VILLAGES}
            onSelect={setSelectedVillage}
            selectedId={selectedVillage.id}
          />
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-2 text-[10px] uppercase tracking-wider pointer-events-none border border-[#d1cdc3]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#B8F000] mr-1"></span> High Trust
            <span className="inline-block w-2 h-2 rounded-full bg-[#F5A623] ml-2 mr-1"></span> Monitoring
            <span className="inline-block w-2 h-2 rounded-full bg-[#E8603C] ml-2 mr-1"></span> Critical
          </div>
        </div>

        {/* Village Details */}
        <div className="bg-white p-6 border border-[#d1cdc3] flex flex-col justify-between shadow-sm">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#8B7355] mb-1">Village Profile</div>
            <h2 className="text-3xl font-['Syne'] font-bold text-[#1A2E1A] mb-1">{selectedVillage.name}</h2>
            <div className="text-sm text-[#8B7355] mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-[#1A2E1A]"></span>
              {selectedVillage.district} District
            </div>

            <div className="space-y-6">
              <div className="bg-[#f5f2eb] p-4 border-l-2 border-[#1A2E1A]">
                <div className="text-[10px] uppercase tracking-wider text-[#8B7355] mb-1">Trust Score</div>
                <div className="text-3xl font-bold font-['Syne'] text-[#3D9970]">{selectedVillage.lastScore}/100</div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="text-[10px] uppercase tracking-wider text-[#8B7355]">Volatility</div>
                  <div className="text-xs font-bold text-[#1A2E1A]">{selectedVillage.volatilityIndex.toFixed(1)} σ</div>
                </div>
                <div className="w-full bg-[#e2e8f0] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F5A623]"
                    style={{ width: `${Math.min(selectedVillage.volatilityIndex * 10, 100)}%` }}
                  ></div>
                </div>
              </div>
              {selectedVillage.odfStatus && selectedVillage.lastScore < 60 && (
                <div className="bg-[#E8603C]/10 border border-[#E8603C] p-3 flex items-start gap-2 animate-pulse">
                  <AlertTriangle className="text-[#E8603C] shrink-0" size={16} />
                  <div className="text-[10px] text-[#E8603C] leading-tight font-bold">
                    ODF DISCREPANCY DETECTED<br />
                    <span className="font-normal text-[#1A2E1A]">Official status contradicts field score.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="text-[10px] text-right text-[#8B7355] mt-4">Last updated: Today, 10:42 AM</div>
        </div>
      </div>

      {/* Middle: Chart */}
      <div className="bg-white p-6 border border-[#d1cdc3] shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A2E1A]">90-Day Hygiene Trend</h3>
          <div className="flex gap-2">
            <span className="text-[10px] px-2 py-1 bg-[#1A2E1A] text-[#B8F000] font-bold rounded">90D</span>
            <span className="text-[10px] px-2 py-1 hover:bg-[#f5f2eb] text-[#8B7355] cursor-pointer">30D</span>
          </div>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="day" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{ backgroundColor: '#1A2E1A', color: '#B8F000', border: 'none', fontSize: '12px', borderRadius: '4px' }}
                itemStyle={{ color: '#B8F000' }}
              />
              <Line type="monotone" dataKey="score" stroke="#3D9970" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom: Collusion Panel */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#f5f2eb] p-6 border border-[#d1cdc3] relative overflow-hidden flex flex-col">
          {/* Decorative bg icon */}
          <ShieldCheck className="absolute -bottom-4 -right-4 text-[#1A2E1A]/5 w-32 h-32" />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="font-['Syne'] font-bold text-lg text-[#1A2E1A]">Collusion Adjudicator</h3>
            <span className="text-[10px] bg-[#1A2E1A] text-[#EEE9DF] px-2 py-1 uppercase tracking-wider font-bold">Mode 2</span>
          </div>

          <div className="flex-1 space-y-2 mb-6 relative z-10">
            <div className="flex items-center justify-between text-xs text-[#8B7355] border-b border-[#d1cdc3] pb-2">
              <span>Current Cycle Candidates</span>
              <span>{dbService.getSubmissions(selectedVillage.id).length} Available</span>
            </div>
            {/* Show mock preview if strict requirements not met */}
            <div className="text-xs text-[#8B7355] italic">
              Ready to adjudicate {dbService.getSubmissions(selectedVillage.id).length || 3} independent submissions...
            </div>
          </div>

          <button
            onClick={handleRunCollusion}
            disabled={loadingCollusion}
            className="relative z-10 flex items-center gap-2 bg-[#1A2E1A] text-[#B8F000] px-5 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#2A402A] transition-colors w-full justify-center shadow-md active:shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={loadingCollusion ? "animate-spin" : ""} />
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

                  <div className="text-[10px] text-[#1A2E1A] opacity-80 border-t border-[#e2e8f0] pt-2">
                    {cycle.result.reasoning}
                  </div>
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