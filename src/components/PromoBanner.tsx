import React from 'react';
import { Sparkles, ArrowRight, Zap, TrendingUp } from 'lucide-react';
import { PalmPayIcon } from './PalmPayLogo';

interface PromoBannerProps {
  onExplore: () => void;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({ onExplore }) => {
  return (
    <div className="relative w-full mirror-glass-card rounded-3xl p-5 sm:p-7 border border-purple-500/25 overflow-hidden specular-shine shadow-xl">
      {/* Background atmospheric glows */}
      <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-purple-700/20 via-purple-900/10 to-transparent pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-44 h-44 bg-[#FFC107]/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left Copy Section */}
        <div className="flex-1 space-y-3">
          <div className="inline-flex items-center gap-2 bg-purple-600/25 text-purple-200 border border-purple-400/30 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
            <Zap className="w-3.5 h-3.5 fill-[#FFC107] text-[#FFC107]" />
            PALMPAY EXCLUSIVE VAULT REWARDS
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight font-['Poppins',sans-serif]">
            Earn while you spend. <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] via-[#C084FC] to-[#FFC107]">
              Smile while you grow.
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-purple-200/80 max-w-xl leading-relaxed">
            Every daily transaction unlocks automated cashback perks, multiplier spin tokens, and instant bank transfers directly to your verified PalmPay account.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onExplore}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white text-xs sm:text-sm font-bold shadow-[0_4px_20px_rgba(126,29,198,0.4)] hover:shadow-[0_6px_25px_rgba(126,29,198,0.6)] transition-all flex items-center gap-2 group active:scale-95 border border-purple-300/30"
            >
              <span>Boost Your Cashback</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex items-center gap-3 text-xs text-purple-200/70 font-medium pl-1">
              <span className="flex items-center gap-1 text-[#FFC107]">
                <TrendingUp className="w-3.5 h-3.5" /> 99.8% Success Rate
              </span>
              <span>•</span>
              <span>Instant Clearing</span>
            </div>
          </div>
        </div>

        {/* Right Cheerful Visual Layout */}
        <div className="relative shrink-0 flex items-center justify-center">
          {/* Circular badge container showcasing smartphone app user */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-3xl bg-gradient-to-b from-purple-900/30 to-purple-950/20 p-3 mirror-glass border border-purple-500/30 shadow-2xl flex items-center justify-center">
            
            {/* SVG Visual of cheerful mobile user with cashback coins */}
            <div className="relative w-full h-full flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {/* Background glow circle */}
                <circle cx="100" cy="100" r="75" fill="#621494" fillOpacity="0.25" />
                
                {/* Smartphone Device Frame in PalmPay dark & violet */}
                <rect x="65" y="25" width="70" height="135" rx="14" fill="#140924" stroke="#7E1DC6" strokeWidth="2.5" />
                <rect x="70" y="35" width="60" height="110" rx="8" fill="#1E0D36" />
                
                {/* Screen UI Elements */}
                <rect x="76" y="45" width="48" height="12" rx="4" fill="#621494" />
                <rect x="76" y="64" width="30" height="6" rx="2" fill="#FFC107" />
                <circle cx="100" cy="95" r="18" fill="#7E1DC6" fillOpacity="0.3" stroke="#A855F7" strokeWidth="1.5" />
                <text x="100" y="100" textAnchor="middle" fill="#FFC107" fontSize="14" fontWeight="bold">₦</text>
                
                {/* User Avatar Silhouette */}
                <circle cx="100" cy="155" r="16" fill="#FFC107" />
                <path d="M80 190 C80 175, 120 175, 120 190 Z" fill="#7E1DC6" />
                
                {/* Floating Coin 1 */}
                <g className="animate-bounce" style={{ animationDuration: '2.5s' }}>
                  <circle cx="45" cy="65" r="15" fill="#FFC107" stroke="#FFF" strokeWidth="1.5" />
                  <text x="45" y="70" textAnchor="middle" fill="#000" fontSize="12" fontWeight="bold">₦</text>
                </g>

                {/* Floating PalmPay Hexagon */}
                <g className="animate-bounce" style={{ animationDuration: '3s', animationDelay: '0.8s' }}>
                  <circle cx="155" cy="85" r="13" fill="#621494" stroke="#A855F7" strokeWidth="1.5" />
                  <text x="155" y="90" textAnchor="middle" fill="#FFF" fontSize="10" fontWeight="bold">P</text>
                </g>
              </svg>

              {/* Floating Pill Tag */}
              <div className="absolute -bottom-2 -left-2 bg-[#140924]/90 backdrop-blur-md px-3 py-1 rounded-xl border border-purple-500/40 text-[11px] font-bold text-purple-200 shadow-lg flex items-center gap-1.5">
                <PalmPayIcon className="w-4 h-4" size={16} />
                <span className="text-[#FFC107]">+₦150,000 Bonus</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

