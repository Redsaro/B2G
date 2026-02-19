import React, { useState } from 'react';
import { Role } from '../types';
import { ArrowLeft, Info, X } from 'lucide-react';
import clsx from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
  role: Role;
  onBack: () => void;
}

const ROLE_DESCRIPTIONS: Record<string, { title: string; description: string; key_metrics: string[] }> = {
  'CHW': {
    title: 'Field Verification Mode',
    description: 'Use this interface to capture facility photos and submit ground-truth data. The AI Vision system will cross-reference your checklist against the image to detect discrepancies.',
    key_metrics: ['Photo Clarity', 'Checklist Accuracy', 'Spoofing Risk']
  },
  'NGO': {
    title: 'Trust & Operations Center',
    description: 'Monitor village clusters, analyze hygiene trends, and adjudicate flagged reports. Use the Collusion Adjudicator to resolve conflicting submissions.',
    key_metrics: ['Trust Score', 'ODF Status', 'Collusion Risk']
  },
  'COMMUNITY': {
    title: 'Health Mirror Display',
    description: 'A simplified, high-contrast view designed for village public displays. It translates complex data into a plain-language narrative about community health achievements.',
    key_metrics: ['Illnesses Prevented', 'Girls Attendance', 'Protected Days']
  },
  'INVESTOR': {
    title: 'Impact Credit Market',
    description: 'Financial terminal for analyzing sanitation infrastructure as an asset class. View volatility indices and real-time credit pricing for disbursement decisions.',
    key_metrics: ['Credit Price (INR)', 'Volatility Index', 'Risk Rating']
  }
};

const Layout: React.FC<LayoutProps> = ({ children, role, onBack }) => {
  const isLanding = role === 'LANDING';
  const isCommunity = role === 'COMMUNITY';
  const [showHelp, setShowHelp] = useState(false);

  const helpContent = ROLE_DESCRIPTIONS[role];

  return (
    <div className={clsx(
      "min-h-screen flex flex-col font-mono relative transition-colors duration-500",
      isCommunity ? "bg-[#EEE9DF] text-[#1A2E1A]" : "bg-[#EEE9DF] text-[#1A2E1A]"
    )}>
      {/* Header */}
      {!isLanding && (
        <header className={clsx(
          "px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm transition-colors",
          isCommunity ? "bg-[#F5A623] text-[#1A2E1A]" : "bg-[#1A2E1A] text-[#EEE9DF]"
        )}>
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="hover:bg-white/10 p-2 rounded-full transition-colors group" aria-label="Go Back">
              <ArrowLeft size={20} className={clsx(
                "group-hover:-translate-x-1 transition-transform",
                isCommunity ? "text-[#1A2E1A]" : "text-[#B8F000]"
              )} />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight font-['Syne']">San<span className={isCommunity ? "text-white" : "text-[#B8F000]"}>Map</span></h1>
              <div className="text-[10px] uppercase tracking-widest opacity-60">{role} VIEW</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={clsx(
              "hidden md:block text-[10px] uppercase tracking-widest px-3 py-1 font-bold rounded-sm",
              isCommunity ? "bg-[#1A2E1A] text-[#F5A623]" : "bg-[#B8F000] text-[#1A2E1A]"
            )}>
              Llama 4 Scout
            </div>
            <button
              onClick={() => setShowHelp(true)}
              className="hover:bg-white/10 p-2 rounded-full transition-colors opacity-70 hover:opacity-100"
            >
              <Info size={20} />
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${isLanding ? 'p-0' : 'p-6 max-w-6xl mx-auto w-full'}`}>
        {children}
      </main>

      {/* Footer */}
      {!isLanding && (
        <footer className="py-8 text-center text-[10px] uppercase tracking-widest text-[#8B7355] border-t border-[#d1cdc3] mt-12 bg-[#EEE9DF]">
          SanMap MVP · SDG 6.2 · Powered by Llama 4 Scout
        </footer>
      )}

      {/* Help Modal */}
      {showHelp && helpContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A2E1A]/80 backdrop-blur-sm p-4">
          <div className="bg-[#EEE9DF] max-w-md w-full border-t-4 border-[#B8F000] shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-[#8B7355] hover:text-[#1A2E1A]"
            >
              <X size={20} />
            </button>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#1A2E1A] font-bold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#B8F000] rounded-full"></span> Guide
            </div>
            <h3 className="font-['Syne'] font-bold text-2xl mb-4 text-[#1A2E1A]">{helpContent.title}</h3>
            <p className="text-sm text-[#8B7355] leading-relaxed mb-6 font-sans">
              {helpContent.description}
            </p>

            <div className="bg-white p-4 rounded-sm border border-[#d1cdc3]">
              <div className="text-[10px] uppercase tracking-widest text-[#1A2E1A] font-bold mb-2">Key Metrics</div>
              <ul className="space-y-2">
                {helpContent.key_metrics.map((metric, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-[#8B7355]">
                    <div className="w-1.5 h-1.5 bg-[#B8F000] rounded-full" />
                    {metric}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;