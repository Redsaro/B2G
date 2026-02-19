import React, { useState, useEffect } from 'react';
import { MOCK_VILLAGES, getTrustRating, getCreditPrice, calculateImpactCredits } from '../services/dataService';
import { generateInvestorSignal } from '../services/geminiService';
import { InvestorSignalResult, Village } from '../types';
import {
  TrendingUp, Activity, DollarSign, AlertCircle, CheckCircle2,
  ArrowRight, X, Printer, Clock, ShieldCheck, Zap
} from 'lucide-react';
import clsx from 'clsx';

// ── Disburse Confirmation Modal ─────────────────────────────────────────────────

interface DisburseModalProps {
  village: Village;
  signal: InvestorSignalResult;
  credits: number;
  creditPrice: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const DisburseModal: React.FC<DisburseModalProps> = ({ village, signal, credits, creditPrice, onConfirm, onCancel }) => {
  const [step, setStep] = useState<'confirm' | 'processing' | 'done'>('confirm');
  const totalValue = Math.round(credits * creditPrice);
  const txId = `SAN-${Date.now().toString(36).toUpperCase()}`;

  const handleConfirm = () => {
    setStep('processing');
    setTimeout(() => setStep('done'), 2400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A2E1A]/80 backdrop-blur-sm p-4">
      <div className="bg-[#EEE9DF] max-w-md w-full border-t-4 border-[#B8F000] shadow-2xl relative">

        {/* ── Step: Confirm ── */}
        {step === 'confirm' && (
          <div className="p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#8B7355] font-bold mb-1">Disbursement Request</div>
                <h3 className="font-['Syne'] font-bold text-2xl text-[#1A2E1A]">{village.name}</h3>
                <div className="text-xs text-[#8B7355]">{village.district} District</div>
              </div>
              <button onClick={onCancel} className="text-[#8B7355] hover:text-[#1A2E1A] mt-1"><X size={20} /></button>
            </div>

            {/* Summary table */}
            <div className="bg-white border border-[#d1cdc3] divide-y divide-[#f0ece4] text-sm">
              {[
                ['Trust Rating', <span className="font-bold" style={{ color: signal.risk_rating === 'AAA' || signal.risk_rating === 'AA' ? '#3D9970' : '#F5A623' }}>{signal.risk_rating}</span>],
                ['Credit Price', `₹${creditPrice.toLocaleString('en-IN')} / unit`],
                ['Credits Releasing', `${credits} units`],
                ['Volatility Index', `${signal.volatility_index} σ`],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between px-4 py-2.5">
                  <span className="text-[#8B7355] text-xs uppercase tracking-wider">{label}</span>
                  <span className="font-bold text-[#1A2E1A]">{value}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-3 bg-[#1A2E1A]">
                <span className="text-[#B8F000] text-xs uppercase tracking-wider font-bold">Total Release</span>
                <span className="font-['Syne'] font-bold text-xl text-[#B8F000]">₹{totalValue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <p className="text-[10px] text-[#8B7355] leading-relaxed">
              Funds will be released to the village escrow wallet. This action is recorded on the SanMap Glass Vault ledger and is irreversible.
            </p>

            <div className="flex gap-3">
              <button onClick={onCancel} className="flex-1 border border-[#d1cdc3] py-3 text-xs font-bold uppercase tracking-wider text-[#8B7355] hover:bg-[#f5f2eb] transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirm} className="flex-1 bg-[#1A2E1A] text-[#B8F000] py-3 text-xs font-bold uppercase tracking-wider hover:bg-[#2A402A] transition-colors flex items-center justify-center gap-2">
                <Zap size={14} /> Confirm Release
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Processing ── */}
        {step === 'processing' && (
          <div className="p-12 flex flex-col items-center gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-[#B8F000]/20 animate-ping" />
              <div className="absolute inset-0 rounded-full border-4 border-[#B8F000] border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <div className="font-['Syne'] font-bold text-lg text-[#1A2E1A] mb-1">Broadcasting Transaction</div>
              <div className="text-xs text-[#8B7355] animate-pulse">Signing on Glass Vault ledger…</div>
            </div>
          </div>
        )}

        {/* ── Step: Receipt ── */}
        {step === 'done' && (
          <div className="p-8 space-y-6">
            <div className="flex flex-col items-center text-center gap-2 pb-4 border-b border-[#d1cdc3]">
              <div className="w-12 h-12 rounded-full bg-[#3D9970]/15 flex items-center justify-center mb-1">
                <CheckCircle2 className="text-[#3D9970]" size={28} />
              </div>
              <div className="font-['Syne'] font-bold text-2xl text-[#1A2E1A]">Disbursement Confirmed</div>
              <div className="text-xs text-[#8B7355]">Funds released to village escrow wallet</div>
            </div>

            {/* Receipt */}
            <div className="bg-white border border-[#d1cdc3] font-mono text-xs divide-y divide-[#f0ece4]">
              {[
                ['Transaction ID', txId],
                ['Village', `${village.name}, ${village.district}`],
                ['Amount', `₹${totalValue.toLocaleString('en-IN')}`],
                ['Credits', `${credits} units @ ₹${creditPrice}/unit`],
                ['Risk Rating', signal.risk_rating],
                ['Timestamp', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
                ['Status', '✓ SETTLED'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between px-4 py-2">
                  <span className="text-[#8B7355]">{k}</span>
                  <span className="font-bold text-[#1A2E1A] text-right max-w-[55%]">{v}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 border border-[#d1cdc3] py-3 text-xs font-bold uppercase tracking-wider text-[#8B7355] hover:bg-[#f5f2eb] transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={14} /> Print Receipt
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 bg-[#1A2E1A] text-[#B8F000] py-3 text-xs font-bold uppercase tracking-wider hover:bg-[#2A402A] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Transaction History Log ─────────────────────────────────────────────────────

interface TxRecord {
  id: string;
  village: string;
  district: string;
  amount: number;
  rating: string;
  timestamp: string;
}

const TX_KEY = 'SanMap_disbursements';

const loadTxLog = (): TxRecord[] => {
  try { return JSON.parse(localStorage.getItem(TX_KEY) || '[]'); } catch { return []; }
};
const saveTx = (tx: TxRecord) => {
  const log = loadTxLog();
  log.unshift(tx);
  localStorage.setItem(TX_KEY, JSON.stringify(log.slice(0, 20))); // keep last 20
};

// ── Main Component ──────────────────────────────────────────────────────────────

const InvestorView: React.FC = () => {
  const [selectedVillageId, setSelectedVillageId] = useState<string>(MOCK_VILLAGES[0].id);
  const [signal, setSignal] = useState<InvestorSignalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [txLog, setTxLog] = useState<TxRecord[]>(loadTxLog);

  const village = MOCK_VILLAGES.find(v => v.id === selectedVillageId) || MOCK_VILLAGES[0];
  const avg = Math.round(village.hygieneScoreHistory.reduce((a, b) => a + b, 0) / village.hygieneScoreHistory.length);
  const trustRating = getTrustRating(village.lastScore, village.volatilityIndex);
  const creditPrice = getCreditPrice(trustRating);
  const credits = calculateImpactCredits(village.population, avg, village.volatilityIndex);

  useEffect(() => {
    const fetchSignal = async () => {
      setLoading(true);
      setSignal(null);
      try {
        const res = await generateInvestorSignal(village.name, village.hygieneScoreHistory, avg, village.volatilityIndex);
        setSignal(res);
      } catch (e) {
        console.error('Failed to fetch investor signal', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSignal();
  }, [selectedVillageId]);

  const handleDisburse = () => {
    // Record in local ledger
    const tx: TxRecord = {
      id: `SAN-${Date.now().toString(36).toUpperCase()}`,
      village: village.name,
      district: village.district,
      amount: Math.round(credits * creditPrice),
      rating: trustRating,
      timestamp: new Date().toISOString(),
    };
    saveTx(tx);
    setTxLog(loadTxLog());
    setShowModal(false);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">

      {/* Header */}
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
            Calculating Volatility &amp; Risk...
          </div>
        </div>
      ) : signal ? (
        <div className="grid md:grid-cols-2 gap-6">

          {/* Price Card */}
          <div className="bg-[#1A2E1A] text-[#EEE9DF] p-8 relative overflow-hidden min-h-[300px] flex flex-col justify-between group">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#B8F000] blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
            <div>
              <div className="flex items-center justify-between text-[#B8F000] mb-6">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em]">Credit Price (INR)</span>
                </div>
                <span className="text-[9px] font-mono bg-[#B8F000]/10 px-2 py-0.5 border border-[#B8F000]/20">⚡ Llama 4 Scout</span>
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
                  <div className="text-sm font-bold uppercase">{signal['30_day_forecast']}</div>
                </div>
                <div className="text-4xl font-['Syne'] font-bold text-[#EEE9DF]/20">{village.lastScore}</div>
              </div>
            </div>
          </div>

          {/* Risk Card */}
          <div className="bg-white border border-[#d1cdc3] p-8 flex flex-col justify-between">
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
                  <p className="font-serif italic text-lg text-[#1A2E1A] leading-snug">"{signal.investment_signal}"</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Disburse Action Footer ── */}
          <div className="md:col-span-2 bg-[#f5f2eb] border border-[#1A2E1A] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex gap-4 items-start">
              {signal.disbursement_ready ? (
                <CheckCircle2 className="text-[#3D9970] shrink-0 mt-1" size={24} />
              ) : (
                <AlertCircle className="text-[#E8603C] shrink-0 mt-1" size={24} />
              )}
              <div>
                <h4 className="font-['Syne'] font-bold text-lg text-[#1A2E1A]">
                  {signal.disbursement_ready ? 'Qualified for Disbursement' : 'Review Required'}
                </h4>
                <p className="text-xs text-[#8B7355] max-w-lg leading-relaxed mt-1">
                  {signal.disbursement_ready
                    ? `Trust score and volatility metrics meet the threshold. ${credits} impact credits ready to release at ₹${creditPrice}/unit — total ₹${(credits * creditPrice).toLocaleString('en-IN', { maximumFractionDigits: 0 })}.`
                    : 'Current volatility index exceeds safety parameters for automatic disbursement. Manual auditor override required.'}
                </p>
              </div>
            </div>
            <button
              disabled={!signal.disbursement_ready}
              onClick={() => setShowModal(true)}
              className="bg-[#1A2E1A] text-[#B8F000] px-8 py-4 font-bold uppercase tracking-[0.2em] hover:bg-[#2A402A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-3 shrink-0 group"
            >
              <span>Disburse Funds</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      ) : (
        <div className="h-96 flex items-center justify-center border border-[#d1cdc3] bg-white border-dashed">
          <p className="text-[#8B7355] text-sm">Select a cluster to analyze investment risk.</p>
        </div>
      )}

      {/* ── Transaction History ── */}
      {txLog.length > 0 && (
        <div className="bg-white border border-[#d1cdc3] shadow-sm">
          <div className="px-6 py-4 border-b border-[#f0ece4] flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-[#1A2E1A] uppercase tracking-wider">
              <ShieldCheck size={16} />
              Glass Vault Ledger
            </div>
            <span className="text-[10px] text-[#8B7355]">{txLog.length} transaction{txLog.length > 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-[#f9f8f5]">
            {txLog.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-6 py-3 hover:bg-[#f9f8f5] transition-colors">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={14} className="text-[#3D9970] flex-shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-[#1A2E1A]">{tx.village}, {tx.district}</div>
                    <div className="text-[10px] font-mono text-[#8B7355] flex items-center gap-1.5">
                      <Clock size={9} /> {new Date(tx.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      <span className="ml-2 text-[#B8F000] bg-[#1A2E1A] px-1">{tx.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-['Syne'] font-bold text-[#3D9970]">₹{tx.amount.toLocaleString('en-IN')}</div>
                  <div className="text-[9px] font-mono text-[#8B7355]">{tx.id}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && signal && (
        <DisburseModal
          village={village}
          signal={signal}
          credits={credits}
          creditPrice={creditPrice}
          onConfirm={handleDisburse}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default InvestorView;