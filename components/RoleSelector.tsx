import React, { useState, useEffect } from 'react';
import { Role } from '../types';
import { User, Activity, Users, TrendingUp } from 'lucide-react';

interface RoleSelectorProps {
  onSelect: (role: Role) => void;
}

const AIStatusBadge = () => {
  const [status, setStatus] = useState<{ connected: boolean; model: string; error?: string } | null>(null);

  useEffect(() => {
    import('../services/geminiService')
      .then((mod) => {
        mod.checkConnectionStatus()
          .then(setStatus)
          .catch(() => setStatus({ connected: false, model: 'Error', error: 'Check failed' }));
      })
      .catch(() => setStatus({ connected: false, model: 'Error', error: 'Import failed' }));
  }, []);

  if (!status) {
    return (
      <span className="flex items-center gap-1.5 text-[#EEE9DF]/30">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse" />
        AI: Checking...
      </span>
    );
  }

  return (
    <span className={`flex items-center gap-1.5 font-bold ${status.connected ? 'text-[#B8F000]' : 'text-[#E8603C]'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status.connected ? 'bg-[#B8F000]' : 'bg-[#E8603C]'}`} />
      {status.connected
        ? `AI: Llama 4 Scout · ${status.model.replace('meta-llama/', '').slice(0, 14)}`
        : `AI: ${status.error || 'Offline'}`}
    </span>
  );
};

const RoleSelector: React.FC<RoleSelectorProps> = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-[#1A2E1A] text-[#EEE9DF] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(184,240,0,0.1)_0%,transparent_70%)] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(139,115,85,0.15)_0%,transparent_70%)] pointer-events-none"></div>

      {/* Network Status Bar */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center border-b border-[#EEE9DF]/10 bg-[#1A2E1A]/80 backdrop-blur-sm z-20">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B8F000] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B8F000]"></span>
          </span>
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#EEE9DF]/70">SanMap Network Active</span>
        </div>
        <div className="flex gap-6 text-[10px] uppercase tracking-widest text-[#EEE9DF]/40 items-center">
          <span className="hidden md:inline">3 Active Clusters</span>
          <span className="hidden md:inline">Last Sync: 2m ago</span>
          <AIStatusBadge />
        </div>
      </div>

      <div className="z-10 max-w-5xl w-full mt-12">
        <div className="mb-16">
          <span className="text-[#B8F000]/40 text-[10px] font-mono italic tracking-widest mb-8 block">
            v3.0 · mvp build · sdg 6.2
          </span>
          <h1 className="text-6xl md:text-8xl font-extrabold leading-[0.95] tracking-tight mb-6 font-['Syne']">
            San<span className="text-[#B8F000]">Map</span>
          </h1>
          <p className="font-serif italic text-xl md:text-2xl text-[#EEE9DF]/55 max-w-xl leading-relaxed border-l-2 border-[#B8F000] pl-6">
            The Rural Sanitation Trust Protocol — converting verified functionality into tradeable Impact Credits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Cards */}
          <RoleCard
            role="CHW"
            icon={<User size={32} />}
            title="CHW / Auditor"
            desc="Submit field reports. Verify facilities with AI Vision."
            color="text-[#B8F000]"
            onClick={() => onSelect('CHW')}
          />
          <RoleCard
            role="NGO"
            icon={<Activity size={32} />}
            title="NGO Partner"
            desc="Monitor trust scores. Adjudicate collusion risks."
            color="text-[#F5A623]"
            onClick={() => onSelect('NGO')}
          />
          <RoleCard
            role="COMMUNITY"
            icon={<Users size={32} />}
            title="Community"
            desc="View health impact. Understand protection."
            color="text-[#EEE9DF]"
            onClick={() => onSelect('COMMUNITY')}
          />
          <RoleCard
            role="INVESTOR"
            icon={<TrendingUp size={32} />}
            title="Investor"
            desc="Analyze risk signals. Purchase impact credits."
            color="text-[#E8603C]"
            onClick={() => onSelect('INVESTOR')}
          />
        </div>
      </div>
    </div>
  );
};

const RoleCard = ({ role, icon, title, desc, color, onClick }: any) => (
  <button
    onClick={onClick}
    className="bg-[#243424] p-8 text-left hover:bg-[#2A402A] transition-all duration-300 group relative overflow-hidden border border-transparent hover:border-[#EEE9DF]/20 hover:scale-[1.02] hover:shadow-2xl"
  >
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
      {icon}
    </div>
    <div className={`${color} text-[10px] font-bold tracking-[0.2em] uppercase mb-4`}>{role}</div>
    <div className="text-[#EEE9DF] mb-4 group-hover:translate-x-1 transition-transform duration-300">{icon}</div>
    <h3 className="text-[#EEE9DF] text-lg font-bold font-['Syne'] mb-2">{title}</h3>
    <p className="text-[#EEE9DF]/60 text-xs leading-relaxed">{desc}</p>

    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#B8F000] to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
  </button>
);

export default RoleSelector;