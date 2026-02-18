import React, { useState, useEffect } from 'react';
import { MOCK_VILLAGES } from '../services/dataService';
import { generateInvestorSignal } from '../services/geminiService';
import { InvestorSignalResult, Village } from '../types';
import { TrendingUp, Activity, DollarSign, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

const InvestorView: React.FC = () => {
  const [selectedVillageId, setSelectedVillageId] = useState<string>(MOCK_VILLAGES[0].id);
  const [signal, setSignal] = useState<InvestorSignalResult | null>(null);
  const [loading, setLoading] = useState(false);

  const village = MOCK_VILLAGES.find(v => v.id === selectedVillageId) || MOCK_VILLAGES[0];

  useEffect(() => {
    const fetchSignal = async () => {
      setLoading(true);
      setSignal(null);
      try {
        const avg = Math.round(village.hygieneScoreHistory.reduce((a, b) => a + b, 0) / village.hygieneScoreHistory.length);
        const res = await generateInvestorSignal(
          village.name, 
          village.hygieneScoreHistory, 
          avg, 
          village.volatilityIndex
        );
        setSignal(res);
      } catch (e) {
        console.error("Failed to fetch investor signal", e);
      } finally {
        setLoading(false);
      }
    };

    fetchSignal();
  }, [selectedVillageId]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-['Syne'] font-bold text-[#1A2E1A]">Impact Credit Market</h2>
          <p className="text-xs text-[#8B7355] mt-1">Real-time risk pricing for sanitation infrastructure.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-widest text-[#8B7355] font-bold">Select Cluster:</label>
          <select 
            className="bg-white border border-[#d1cdc3] px-3 py-2 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-[#1A2E1A] text-[#1A2E1A]"
            value={selectedVillageId}
            onChange={(e) => setSelectedVillageId(e.target.value)}
          >
            {MOCK_VILLAGES.map(v => (
              <option key={v.id} value={v.id}>{v.name} ({v.district})</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center border border-[#d1cdc3] bg-white">
          <Activity className="animate-pulse text-[#1A2E1A] mb-4" size={32} />
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B7355] animate-pulse">
            Calculating Volatility & Risk...
          </div>
        </div>
      ) : signal ? (
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Main Price Card */}
          <div className="bg-[#1A2E1A] text-[#EEE9DF] p-8 relative overflow-hidden md:col-span-1 min-h-[300px] flex flex-col justify-between group">
             {/* Abstract Background Element */}
             <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#B8F000] blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
             
             <div>
               <div className="flex items-center gap-2 text-[#B8F000] mb-6">
                 <DollarSign size={16} />
                 <span className="text-[10px] font-bold uppercase tracking-[0.25em]">Credit Price (INR)</span>
               </div>
               <div className="text-7xl font-['Syne'] font-bold tracking-tighter mb-2">
                 ₹{signal.credit_price_inr}
               </div>
               <div className={clsx(
                 "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                 signal.trend.includes('improving') ? "bg-[#B8F000]/20 text-[#B8F000]" : "bg-[#E8603C]/20 text-[#E8603C]"
               )}>
                  <TrendingUp size={12} />
                  {signal.trend.replace(/_/g, ' ')}
               </div>
             </div>

             <div className="border-t border-[#EEE9DF]/10 pt-4 mt-8">
               <div className="flex justify-between items-end">
                 <div>
                   <div className="text-[10px] uppercase text-[#EEE9DF]/50 mb-1">30-Day Forecast</div>
                   <div className="text-sm font-bold uppercase">{signal["30_day_forecast"]}</div>
                 </div>
                 <div className="text-right">
                    <div className="text-4xl font-['Syne'] font-bold text-[#EEE9DF]/20">{village.lastScore}</div>
                 </div>
               </div>
             </div>
          </div>

          {/* Risk Analysis Card */}
          <div className="bg-white border border-[#d1cdc3] p-8 flex flex-col justify-between md:col-span-1">
             <div>
               <div className="flex justify-between items-start mb-8">
                  <div>
                     <div className="text-[10px] uppercase tracking-widest text-[#8B7355] mb-1">Risk Rating</div>
                     <div className={clsx(
                       "text-6xl font-['Syne'] font-bold",
                       ['AAA', 'AA', 'A'].includes(signal.risk_rating) ? "text-[#3D9970]" : 
                       ['BBB', 'BB', 'B'].includes(signal.risk_rating) ? "text-[#F5A623]" : "text-[#E8603C]"
                     )}>
                       {signal.risk_rating}
                     </div>
                  </div>
                  <div className="text-right bg-[#f5f2eb] p-3 rounded">
                     <div className="text-[10px] uppercase tracking-widest text-[#8B7355] mb-1">Volatility Index</div>
                     <div className="text-xl font-mono font-bold text-[#1A2E1A]">{signal.volatility_index}</div>
                  </div>
               </div>
               
               <div className="space-y-4">
                 <div className="bg-[#f5f2eb] p-4 border-l-2 border-[#1A2E1A]">
                    <div className="text-[10px] uppercase tracking-widest text-[#8B7355] mb-2">Fund Manager Signal</div>
                    <p className="font-serif italic text-lg text-[#1A2E1A] leading-snug">
                      "{signal.investment_signal}"
                    </p>
                 </div>
               </div>
             </div>
          </div>

          {/* Action Footer */}
          <div className="md:col-span-2 bg-[#f5f2eb] border border-[#1A2E1A] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="flex gap-4 items-start">
               {signal.disbursement_ready ? (
                 <CheckCircle2 className="text-[#3D9970] shrink-0 mt-1" size={24} />
               ) : (
                 <AlertCircle className="text-[#E8603C] shrink-0 mt-1" size={24} />
               )}
               <div>
                 <h4 className="font-['Syne'] font-bold text-lg text-[#1A2E1A]">
                   {signal.disbursement_ready ? "Qualified for Disbursement" : "Review Required"}
                 </h4>
                 <p className="text-xs text-[#8B7355] max-w-lg leading-relaxed mt-1">
                   {signal.disbursement_ready 
                     ? `Trust score and volatility metrics meet the threshold for immediate micro-credit release at the rate of ₹${signal.credit_price_inr}/unit.`
                     : "Current volatility index exceeds safety parameters for automatic disbursement. Manual auditor override required."}
                 </p>
               </div>
             </div>

             <button 
               disabled={!signal.disbursement_ready}
               className="bg-[#1A2E1A] text-[#B8F000] px-8 py-4 font-bold uppercase tracking-[0.2em] hover:bg-[#2A402A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shrink-0"
             >
               Disburse Funds <ArrowRight size={16} />
             </button>
          </div>

        </div>
      ) : (
        <div className="h-96 flex items-center justify-center border border-[#d1cdc3] bg-white border-dashed">
          <p className="text-[#8B7355] text-sm">Select a cluster to analyze investment risk.</p>
        </div>
      )}
    </div>
  );
};

export default InvestorView;