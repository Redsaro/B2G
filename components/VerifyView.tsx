import React, { useState, useRef } from 'react';
import { Camera, Check, AlertTriangle, ScanLine, X, Loader2 } from 'lucide-react';
import { runVisionAnalysis } from '../services/geminiService';
import { VerificationResult, Checklist } from '../types';
import clsx from 'clsx';

const VerifyView: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [checklist, setChecklist] = useState<Checklist>({
    door: false,
    water: false,
    clean: false,
    pit: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const base64Data = image.split(',')[1];
      const data = await runVisionAnalysis(base64Data, checklist);
      setResult(data);
    } catch (e) {
      alert("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (key: keyof Checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* LEFT: Input */}
      <div className="space-y-6">
        <div className="bg-white p-6 border border-[#d1cdc3] shadow-sm">
          <h2 className="font-['Syne'] font-bold text-lg mb-4 flex items-center gap-2 text-[#1A2E1A]">
            <span className="bg-[#1A2E1A] text-[#B8F000] text-[10px] px-2 py-0.5 rounded-sm">STEP 1</span>
            Capture Evidence
          </h2>
          
          <div 
            className="group relative h-72 bg-[#1A2E1A] overflow-hidden cursor-pointer flex flex-col items-center justify-center border border-[#d1cdc3]"
            onClick={() => fileInputRef.current?.click()}
          >
            {/* Viewfinder UI Elements */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-[#EEE9DF]/50 group-hover:border-[#B8F000] transition-colors"></div>
            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-[#EEE9DF]/50 group-hover:border-[#B8F000] transition-colors"></div>
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-[#EEE9DF]/50 group-hover:border-[#B8F000] transition-colors"></div>
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-[#EEE9DF]/50 group-hover:border-[#B8F000] transition-colors"></div>
            
            {image ? (
              <>
                <img src={image} alt="Toilet" className="w-full h-full object-cover opacity-80" />
                {loading && (
                   <div className="absolute inset-0 bg-[#1A2E1A]/60 flex flex-col items-center justify-center">
                     <div className="w-full h-0.5 bg-[#B8F000] absolute top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
                     <Loader2 className="animate-spin text-[#B8F000] mb-2" size={48} />
                     <div className="text-[#B8F000] font-mono text-xs uppercase tracking-widest animate-pulse">Processing Vision...</div>
                   </div>
                )}
                {!loading && !result && (
                  <div className="absolute bottom-6 bg-[#1A2E1A]/80 backdrop-blur px-3 py-1 rounded text-[#B8F000] text-xs font-mono border border-[#B8F000]">
                    IMAGE LOADED
                  </div>
                )}
              </>
            ) : (
              <>
                <Camera size={48} className="text-[#8B7355] mb-4 group-hover:text-[#B8F000] transition-colors" />
                <p className="text-xs uppercase tracking-widest text-[#8B7355] group-hover:text-[#EEE9DF] transition-colors">Tap to Activate Scanner</p>
              </>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileUpload}
            />
          </div>
        </div>

        <div className="bg-white p-6 border border-[#d1cdc3] shadow-sm">
           <h2 className="font-['Syne'] font-bold text-lg mb-4 flex items-center gap-2 text-[#1A2E1A]">
            <span className="bg-[#1A2E1A] text-[#B8F000] text-[10px] px-2 py-0.5 rounded-sm">STEP 2</span>
            Submit Checklist
          </h2>
          <div className="space-y-3">
            {Object.keys(checklist).map((key) => {
              const k = key as keyof Checklist;
              return (
                <button 
                  key={key}
                  onClick={() => toggleCheck(k)}
                  className={clsx(
                    "w-full flex items-center justify-between p-4 border transition-all text-sm font-bold uppercase tracking-wider relative overflow-hidden",
                    checklist[k] 
                      ? "bg-[#1A2E1A] border-[#B8F000] text-[#B8F000]" 
                      : "bg-white border-[#d1cdc3] text-[#8B7355] hover:bg-[#EEE9DF]"
                  )}
                >
                  <span className="z-10 relative">{key === 'clean' ? 'Floor Clean' : key === 'pit' ? 'Pit Covered' : key}</span>
                  {checklist[k] && <Check size={16} className="z-10 relative" />}
                  {checklist[k] && <div className="absolute left-0 top-0 h-full w-1 bg-[#1A2E1A]"></div>}
                </button>
              )
            })}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!image || loading}
            className="w-full mt-6 bg-[#B8F000] text-[#1A2E1A] py-4 font-bold uppercase tracking-[0.2em] hover:bg-[#a3d600] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(26,46,26,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            {loading ? "Analyzing..." : "Run AI Verification"}
          </button>
        </div>
      </div>

      {/* RIGHT: Output */}
      <div className="space-y-6">
        {result ? (
          <div className="animate-in slide-in-from-bottom-4 duration-500 fade-in">
            {/* Score Card */}
            <div className="bg-white p-8 border border-[#d1cdc3] relative overflow-hidden shadow-sm mb-6">
               <div className="absolute top-0 right-0 p-4">
                 <div className={clsx(
                   "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm",
                   result.confidence === 'high' ? "bg-[#B8F000]/20 text-[#1A2E1A]" : "bg-[#F5A623]/20 text-[#d97706]"
                 )}>
                   Confidence: {result.confidence}
                 </div>
               </div>
               <div className="text-[10px] uppercase tracking-[0.25em] text-[#8B7355] mb-2">Hygiene Score</div>
               <div className="text-6xl font-['Syne'] font-extrabold text-[#1A2E1A] mb-4">
                 {result.hygiene_score}<span className="text-2xl text-[#d1cdc3] font-light">/100</span>
               </div>
               <p className="text-xs text-[#8B7355] leading-relaxed border-t border-[#d1cdc3] pt-4 font-medium">
                 {result.recommendation}
               </p>
            </div>

            {/* Verification Details */}
            <div className="bg-white p-6 border border-[#d1cdc3] mb-6 shadow-sm">
              <h3 className="font-['Syne'] font-bold text-sm uppercase mb-4 text-[#1A2E1A]">Visual Verification</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(result.visual_verification).map(([key, status]) => (
                  <div key={key} className="flex flex-col p-3 bg-[#f5f2eb] border-l-2 border-transparent hover:border-[#1A2E1A] transition-colors">
                    <span className="text-[10px] uppercase text-[#8B7355] mb-1">{key}</span>
                    <span className={clsx(
                      "text-xs font-bold uppercase tracking-wider flex items-center gap-1",
                      status === 'confirmed' ? "text-[#3D9970]" : status === 'contradicted' ? "text-[#E8603C]" : "text-[#F5A623]"
                    )}>
                      {status === 'confirmed' && <Check size={12} />}
                      {status === 'contradicted' && <X size={12} />}
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risks */}
            {(result.spoofing_risk !== 'low' || result.discrepancies.length > 0) && (
              <div className="bg-[#E8603C]/10 p-6 border-l-4 border-[#E8603C] shadow-sm">
                <div className="flex items-center gap-2 text-[#E8603C] font-bold uppercase tracking-wider text-xs mb-3">
                  <AlertTriangle size={16} /> Risk Analysis
                </div>
                {result.spoofing_risk !== 'low' && (
                   <div className="mb-3 text-xs bg-white/50 p-2 rounded">
                     <span className="font-bold text-[#E8603C]">SPOOFING RISK: {result.spoofing_risk.toUpperCase()}</span>
                     <p className="mt-1 opacity-80 text-[#1A2E1A]">{result.spoofing_reasoning}</p>
                   </div>
                )}
                {result.discrepancies.length > 0 && (
                   <div className="text-xs">
                     <span className="font-bold text-[#1A2E1A]">Detected Discrepancies:</span>
                     <ul className="list-disc pl-4 mt-1 opacity-80 text-[#1A2E1A]">
                       {result.discrepancies.map((d, i) => <li key={i}>{d}</li>)}
                     </ul>
                   </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-[#d1cdc3] p-12 text-center bg-[#f5f2eb]">
            <ScanLine size={48} className="text-[#d1cdc3] mb-4" />
            <div className="text-[#8B7355]">
              <div className="font-serif italic text-xl mb-2 text-[#1A2E1A]">Ready for Analysis</div>
              <p className="text-xs max-w-xs mx-auto">Complete Step 1 and Step 2 to generate a real-time trust & hygiene verification score.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyView;