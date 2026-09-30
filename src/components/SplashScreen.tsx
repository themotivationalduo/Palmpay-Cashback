import React, { useEffect, useState } from 'react';
import { PalmPayIcon } from './PalmPayLogo';
import { ShieldCheck, Award } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  minDuration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, minDuration = 2800 }) => {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Increment progress smoothly to simulate active loading
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Smooth logarithmic-like progress increment for natural feel
        const diff = Math.max(1, (100 - prev) * 0.12);
        return Math.min(100, prev + diff);
      });
    }, 100);

    // Complete loading after minDuration
    const timeout = setTimeout(() => {
      setProgress(100);
      setFadeOut(true);
      const finishTimeout = setTimeout(() => {
        onFinish();
      }, 500); // Matches transition-all duration-500
      return () => clearTimeout(finishTimeout);
    }, minDuration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onFinish, minDuration]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#0B0614] flex flex-col justify-between items-center py-12 px-6 select-none transition-all duration-500 ease-out ${
        fadeOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#7E1DC6]/15 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[4000ms]" />
      <div className="absolute bottom-1/4 left-1/3 w-60 h-60 bg-[#FFC107]/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Top spacing / blank */}
      <div className="h-4" />

      {/* Central Brand Emblem */}
      <div className="flex flex-col items-center text-center space-y-6 relative z-10">
        {/* Logo Icon with glowing ring */}
        <div className="relative group">
          <div className="absolute -inset-4 bg-gradient-to-tr from-[#7E1DC6] to-[#FFC107] rounded-full opacity-30 blur-xl group-hover:opacity-40 transition-opacity duration-500" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-md flex items-center justify-center shadow-2xl animate-pulse">
            <PalmPayIcon className="w-16 h-16 sm:w-20 sm:h-20" />
          </div>
        </div>

        {/* Wordmark and App Name */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2.5">
            <span className="font-black tracking-tight text-white text-3xl sm:text-4xl font-['Poppins',sans-serif] lowercase">
              palm<span className="text-[#A855F7]">pay</span>
            </span>
            <span className="bg-gradient-to-r from-[#FFC107] to-[#FFA000] text-black font-black uppercase text-[10px] sm:text-xs px-2 py-0.5 rounded-md shadow-lg tracking-wider">
              Cashback
            </span>
          </div>
          <p className="text-xs sm:text-sm text-purple-300/70 font-medium tracking-wide">
            Instant Rewards &amp; Seamless Withdrawals
          </p>
        </div>
      </div>

      {/* Footer loading indicators & certification */}
      <div className="w-full max-w-xs flex flex-col items-center space-y-8 relative z-10">
        {/* Progress bar container */}
        <div className="w-full space-y-2.5">
          <div className="flex justify-between items-center text-[10px] font-bold tracking-wider text-purple-300/60 uppercase">
            <span>Loading workspace</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
            <div
              className="h-full bg-gradient-to-r from-[#7E1DC6] via-[#A855F7] to-[#FFC107] rounded-full transition-all duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Security & CBN Badges */}
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold text-slate-300 tracking-wide bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <ShieldCheck className="w-4 h-4 text-[#00B875]" />
            <span>NDIC Insured • Licensed by CBN</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-[9px] text-purple-400/60 font-medium tracking-wide">
            <Award className="w-3.5 h-3.5" />
            <span>Official PalmPay Loyalty Platform</span>
          </div>
        </div>
      </div>
    </div>
  );
};
