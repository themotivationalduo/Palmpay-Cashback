import React, { useState } from 'react';
import { 
  Shield, 
  TrendingUp, 
  Users, 
  ChevronRight, 
  ArrowRight, 
  Star, 
  X, 
  CheckCircle2, 
  Lock,
  Sparkles
} from 'lucide-react';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onOpenTerms?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onGetStarted,
  onOpenTerms
}) => {
  const [selectedFeature, setSelectedFeature] = useState<{
    title: string;
    description: string;
    details: string;
    icon: typeof Shield;
  } | null>(null);

  const features = [
    {
      id: 'security',
      title: 'Bank-grade security',
      description: '256-bit encryption on all data',
      details: 'All financial transmissions and session tokens are protected by bank-level 256-bit TLS/SSL encryption and dual-custody verification. Fully compliant with Central Bank of Nigeria (CBN) standards.',
      icon: Shield
    },
    {
      id: 'payouts',
      title: 'Instant payouts',
      description: 'Withdraw to any bank account',
      details: 'Automated instant disbursals connected directly to PalmPay Disbursal Gateway and NIBSS Instant Payments. Funds credit to any Nigerian bank or PalmPay wallet within seconds.',
      icon: TrendingUp
    },
    {
      id: 'referral',
      title: 'Referral program',
      description: 'Earn ₦2,500 per friend Invited',
      details: 'Invite friends, family, or colleagues with your unique referral link or code. Instantly receive ₦2,500 credited straight to your cashback balance once they activate their account.',
      icon: Users
    }
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-between selection:bg-[#1865D8] selection:text-white">
      {/* Container adapting to screen sizes (mobile optimized, responsive desktop container) */}
      <div className="w-full max-w-md mx-auto px-5 py-6 sm:py-8 flex flex-col justify-between flex-1 min-h-screen">
        
        {/* Main Content Area */}
        <div className="space-y-6 sm:space-y-7">
          
          {/* Top Brand Header */}
          <div className="flex items-center gap-3.5 pt-1">
            <div className="w-12 h-12 rounded-2xl bg-white p-2 flex items-center justify-center shadow-[0_4px_20px_rgba(24,101,216,0.35)] border border-white/20 shrink-0">
              <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
                <g fill="none" stroke="#0066FF" strokeWidth="4.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5.565 29.88l17.44-17.441a1.263 1.263 0 0 1 1.766-.021l7.432 7.089" />
                  <path d="M42.435 18.12L25.007 36.051a1.263 1.263 0 0 1-1.766.021l-7.431-7.088" />
                </g>
                <rect width="5.053" height="5.053" x="21.473" y="21.473" fill="#0066FF" rx="0.632" ry="0.632" transform="rotate(-45 24 24)" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-none font-['Poppins',sans-serif]">
                Palmpay CashBack
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-normal mt-1 leading-none">
                Rewards &amp; Cashback
              </p>
            </div>
          </div>

          {/* Social Proof Badge */}
          <div className="pt-2 sm:pt-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0D223F]/90 border border-blue-500/35 text-[#3B82F6] text-xs sm:text-[13px] font-semibold backdrop-blur-md shadow-sm">
              <Star className="w-3.5 h-3.5 fill-[#3B82F6] text-[#3B82F6]" />
              <span>Trusted by 10,000+ users</span>
            </div>
          </div>

          {/* Hero Headline & Description */}
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-[38px] font-extrabold text-white tracking-tight leading-[1.15] font-['Poppins',sans-serif]">
              Earn cashback on <span className="text-[#3B82F6]">every</span> transaction
            </h2>
            <p className="text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-sm font-normal">
              Send money, pay bills, and earn instant rewards. Your money works harder with Palmpay CashBack.
            </p>
          </div>

          {/* 3 Metric Stat Cards in Row */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-1">
            {/* Stat 1 */}
            <div className="mirror-glass rounded-2xl p-3.5 sm:p-4 bg-[#0D1117]/85 border border-white/5 flex flex-col justify-center shadow-inner hover:border-white/10 transition-colors">
              <span className="text-base sm:text-lg font-bold text-white tracking-tight font-['Poppins',sans-serif]">
                ₦150K
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 mt-1 font-medium leading-tight">
                Sign-up Bonus
              </span>
            </div>

            {/* Stat 2 */}
            <div className="mirror-glass rounded-2xl p-3.5 sm:p-4 bg-[#0D1117]/85 border border-white/5 flex flex-col justify-center shadow-inner hover:border-white/10 transition-colors">
              <span className="text-base sm:text-lg font-bold text-white tracking-tight font-['Poppins',sans-serif]">
                ₦2,500
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 mt-1 font-medium leading-tight">
                Per Referral
              </span>
            </div>

            {/* Stat 3 */}
            <div className="mirror-glass rounded-2xl p-3.5 sm:p-4 bg-[#0D1117]/85 border border-white/5 flex flex-col justify-center shadow-inner hover:border-white/10 transition-colors">
              <span className="text-base sm:text-lg font-bold text-white tracking-tight font-['Poppins',sans-serif]">
                Instant
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 mt-1 font-medium leading-tight">
                Withdrawals
              </span>
            </div>
          </div>

          {/* 3 Feature Rows / Cards */}
          <div className="space-y-2.5 sm:space-y-3 pt-1">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.id}
                  onClick={() => setSelectedFeature(feature)}
                  className="mirror-glass rounded-2xl p-3.5 sm:p-4 bg-[#0D1117]/75 border border-white/5 hover:border-blue-500/40 hover:bg-[#0E1522] transition-all flex items-center justify-between gap-3 group cursor-pointer active:scale-[0.99] shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-[#09182C] border border-blue-500/30 flex items-center justify-center text-[#3B82F6] shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.15)] group-hover:scale-105 group-hover:border-blue-400/50 transition-all">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-[15px] font-semibold text-white group-hover:text-blue-200 transition-colors truncate">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 truncate font-normal">
                        {feature.description}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              );
            })}
          </div>

        </div>

        {/* Bottom CTA Button & Legal Notice */}
        <div className="pt-8 sm:pt-10 pb-2 space-y-3">
          <button
            type="button"
            onClick={onGetStarted}
            className="w-full py-4 px-6 rounded-2xl bg-[#1865D8] hover:bg-[#1E74EE] active:scale-[0.98] text-white font-bold text-base sm:text-[17px] flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(24,101,216,0.45)] transition-all cursor-pointer font-['Poppins',sans-serif]"
          >
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5 text-white" />
          </button>

          <p className="text-center text-[11px] sm:text-xs text-slate-500 font-normal leading-tight">
            By continuing you agree to our{' '}
            <button
              type="button"
              onClick={onOpenTerms ? onOpenTerms : onGetStarted}
              className="text-slate-400 hover:text-white underline underline-offset-2 transition-colors inline"
            >
              Terms &amp; Privacy Policy
            </button>
          </p>
        </div>

      </div>

      {/* Feature Details Modal (Mirror Glass) */}
      {selectedFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="mirror-glass-card max-w-sm w-full rounded-3xl p-6 border border-blue-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.9)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#09182C] border border-blue-500/30 flex items-center justify-center text-[#3B82F6]">
                  <selectedFeature.icon className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white">{selectedFeature.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFeature(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedFeature.details}
            </p>

            <button
              type="button"
              onClick={() => {
                setSelectedFeature(null);
                onGetStarted();
              }}
              className="w-full py-3 rounded-2xl bg-[#1865D8] hover:bg-[#1E74EE] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Explore With PalmPay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
