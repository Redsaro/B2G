import React, { useEffect, useState } from 'react';
import { MOCK_VILLAGES } from '../services/dataService';
import { generateHealthNarrative } from '../services/geminiService';
import { Heart, Users, Calendar } from 'lucide-react';

const HealthMirrorView: React.FC = () => {
  const village = MOCK_VILLAGES[0]; // Demo logic uses first village
  const [narrative, setNarrative] = useState<string>("Listening to community records...");

  useEffect(() => {
    // Generate on mount
    generateHealthNarrative(village.name, village.population, 85, village.casesPrevented)
      .then(setNarrative);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center max-w-2xl mx-auto">
      
      <div className="mb-12">
        <h2 className="text-4xl md:text-5xl font-['Syne'] font-bold text-[#1A2E1A] mb-2">{village.name} Village</h2>
        <div className="text-[#F5A623] font-serif italic text-xl">Health Mirror Report</div>
      </div>

      <div className="bg-white p-8 md:p-12 border-y-4 border-[#F5A623] shadow-lg w-full relative">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#F5A623] text-[#1A2E1A] px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em]">
          Community Update
        </div>
        
        <p className="font-serif text-xl md:text-2xl leading-relaxed text-[#1A2E1A] mb-8">
          "{narrative}"
        </p>

        <div className="grid grid-cols-3 gap-4 border-t border-[#d1cdc3] pt-8">
          <div className="flex flex-col items-center">
            <Heart className="text-[#E8603C] mb-2" size={24} />
            <div className="text-3xl font-['Syne'] font-bold text-[#1A2E1A]">{village.casesPrevented}</div>
            <div className="text-[10px] uppercase tracking-widest text-[#8B7355] mt-1">Illnesses Prevented</div>
          </div>
          <div className="flex flex-col items-center border-l border-[#d1cdc3]">
             <Users className="text-[#3D9970] mb-2" size={24} />
             <div className="text-3xl font-['Syne'] font-bold text-[#1A2E1A]">{village.girlsAttendance}%</div>
             <div className="text-[10px] uppercase tracking-widest text-[#8B7355] mt-1">Girls in School</div>
          </div>
          <div className="flex flex-col items-center border-l border-[#d1cdc3]">
             <Calendar className="text-[#F5A623] mb-2" size={24} />
             <div className="text-3xl font-['Syne'] font-bold text-[#1A2E1A]">90</div>
             <div className="text-[10px] uppercase tracking-widest text-[#8B7355] mt-1">Days Protected</div>
          </div>
        </div>
      </div>

      <div className="mt-12 text-[#8B7355] text-xs max-w-md opacity-70">
        This message is generated automatically based on your community's maintenance records and is designed to be read aloud at village council meetings.
      </div>

    </div>
  );
};

export default HealthMirrorView;