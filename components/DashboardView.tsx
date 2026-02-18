import React, { useState } from 'react';
import { MOCK_VILLAGES, MOCK_SUBMISSIONS } from '../services/dataService';
import MapComponent from './MapComponent';
import { Village, CollusionResult } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, ShieldCheck, RefreshCw, Radio } from 'lucide-react';
import { runCollusionCheck } from '../services/geminiService';
import clsx from 'clsx';

const DashboardView: React.FC = () => {
  const [selectedVillage, setSelectedVillage] = useState<Village>(MOCK_VILLAGES[0]);
  const [collusionResult, setCollusionResult] = useState<CollusionResult | null>(null);
  const [loadingCollusion, setLoadingCollusion] = useState(false);

  const chartData = selectedVillage.hygieneScoreHistory.map((score, i) => ({
    day: `D${i+1}`,
    score
  }));

  const handleRunCollusion = async () => {
    setLoadingCollusion(true);
    try {
      const result = await runCollusionCheck(MOCK_SUBMISSIONS);
      setCollusionResult(result);
    } catch(e) {
      alert("Error checking collusion");
    } finally {
      setLoadingCollusion(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Live Activity Ticker */}
      <div className="bg-[#1A2E1A] text-[#EEE9DF] p-2 flex items-center gap-4 text-[10px] uppercase tracking-wider overflow-hidden">
        <div className="flex items-center gap-2 text-[#B8F000] shrink-0 font-bold px-2">
          <Radio size={14} className="animate-pulse" />
          Live Feed
        </div>
        <div className="animate-[slide_20s_linear_infinite] whitespace-nowrap opacity-80">
          New report received from Sankarpur (Score: 88)  •••  Collusion check passed for Village ID #V209  •••  Alert: ODF discrepancy flagged in Belwa District  •••  Disbursement approved for Rampur Cluster (₹35,000)
        </div>
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
                     style={{width: `${Math.min(selectedVillage.volatilityIndex * 10, 100)}%`}}
                   ></div>
                 </div>
               </div>
               {selectedVillage.odfStatus && selectedVillage.lastScore < 60 && (
                 <div className="bg-[#E8603C]/10 border border-[#E8603C] p-3 flex items-start gap-2 animate-pulse">
                   <AlertTriangle className="text-[#E8603C] shrink-0" size={16} />
                   <div className="text-[10px] text-[#E8603C] leading-tight font-bold">
                     ODF DISCREPANCY DETECTED<br/>
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
                   contentStyle={{backgroundColor: '#1A2E1A', color: '#B8F000', border: 'none', fontSize: '12px', borderRadius: '4px'}}
                   itemStyle={{color: '#B8F000'}}
                 />
                 <Line type="monotone" dataKey="score" stroke="#3D9970" strokeWidth={2} dot={false} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Bottom: Collusion Panel */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#f5f2eb] p-6 border border-[#d1cdc3] relative overflow-hidden">
           {/* Decorative bg icon */}
           <ShieldCheck className="absolute -bottom-4 -right-4 text-[#1A2E1A]/5 w-32 h-32" />
           
           <div className="flex items-center justify-between mb-4 relative z-10">
             <h3 className="font-['Syne'] font-bold text-lg text-[#1A2E1A]">Collusion Adjudicator</h3>
             <span className="text-[10px] bg-[#1A2E1A] text-[#EEE9DF] px-2 py-1 uppercase tracking-wider font-bold">Mode 2</span>
           </div>
           <p className="text-xs text-[#8B7355] mb-4 relative z-10 max-w-xs">
             Adjudicating 3 independent submissions (Household, Peer, Auditor) for consensus.
           </p>
           
           <div className="space-y-2 mb-6 relative z-10">
             {MOCK_SUBMISSIONS.map(s => (
               <div key={s.id} className="flex justify-between text-xs bg-white p-3 border border-[#d1cdc3] shadow-sm">
                 <span className="font-bold text-[#1A2E1A]">{s.submitterType}</span>
                 <span className="font-mono">{s.score}/100</span>
               </div>
             ))}
           </div>

           <button 
             onClick={handleRunCollusion} 
             disabled={loadingCollusion}
             className="relative z-10 flex items-center gap-2 bg-[#1A2E1A] text-[#B8F000] px-5 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#2A402A] transition-colors w-full justify-center shadow-md active:shadow-sm"
           >
             <RefreshCw size={14} className={loadingCollusion ? "animate-spin" : ""} />
             Run Adjudication Protocol
           </button>
        </div>

        <div className="bg-white p-6 border border-[#d1cdc3] min-h-[200px] shadow-sm">
           {!collusionResult ? (
             <div className="h-full flex flex-col items-center justify-center text-[#d1cdc3] text-sm italic">
               <ShieldCheck size={32} className="mb-2 opacity-20" />
               Waiting for adjudication...
             </div>
           ) : (
             <div className="space-y-4 animate-in fade-in duration-500">
               <div className="flex items-center justify-between border-b border-[#d1cdc3] pb-2">
                 <div className="text-xs uppercase tracking-widest text-[#8B7355]">Consensus Score</div>
                 <div className="font-['Syne'] font-bold text-3xl text-[#1A2E1A]">{collusionResult.consensus_score}</div>
               </div>
               
               <div className="flex gap-4">
                 <div className="flex-1">
                   <div className="text-[10px] uppercase text-[#8B7355] mb-1">Risk Level</div>
                   <div className={clsx(
                     "font-bold uppercase text-sm px-2 py-1 inline-block rounded-sm",
                     collusionResult.collusion_risk === 'low' ? "bg-[#B8F000]/20 text-[#1A2E1A]" : "bg-[#E8603C]/20 text-[#E8603C]"
                   )}>
                     {collusionResult.collusion_risk}
                   </div>
                 </div>
                 <div className="flex-1">
                    <div className="text-[10px] uppercase text-[#8B7355] mb-1">Action</div>
                    <div className="text-xs font-bold underline decoration-dotted text-[#1A2E1A]">{collusionResult.recommendation.replace(/_/g, ' ')}</div>
                 </div>
               </div>

               <div className="bg-[#EEE9DF] p-3 text-xs text-[#1A2E1A] border-l-2 border-[#1A2E1A]">
                 <span className="font-bold block mb-1">AI Reasoning:</span>
                 {collusionResult.reasoning}
               </div>
             </div>
           )}
        </div>
      </div>

    </div>
  );
};

export default DashboardView;