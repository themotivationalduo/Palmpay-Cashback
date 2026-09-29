import React, { useState } from 'react';
import { Download, Smartphone, X, Share, PlusSquare, CheckCircle2, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Suppress if already running in standalone mode
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  if (variant === 'banner') {
    return (
      <>
        <div className={`p-3.5 rounded-2xl bg-gradient-to-r from-[#4A0C72]/80 via-[#621494]/80 to-[#120B20]/90 border border-purple-500/35 flex items-center justify-between gap-3 shadow-lg ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00B875]/20 border border-[#00B875]/40 flex items-center justify-center text-[#00B875] shrink-0">
              <Smartphone className="w-5 h-5 text-[#00B875]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-white">
                <span>Install PalmPay App</span>
                <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-[#FFC107]/20 text-[#FFC107] border border-[#FFC107]/30">
                  OFFICIAL PWA
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80">Add to home screen for instant 1-tap access &amp; real-time alerts.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstallClick}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00B875] to-[#02E680] text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 transition-all shrink-0"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Install</span>
          </button>
        </div>

        {/* Instructions Modal */}
        {showGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="mirror-glass-card max-w-sm w-full rounded-3xl p-6 border border-purple-500/30 shadow-2xl relative space-y-4 text-white">
              <button
                onClick={() => setShowGuideModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#621494] to-[#00B875] p-0.5 mx-auto mb-3 shadow-lg flex items-center justify-center">
                  <div className="w-full h-full bg-[#0B0614] rounded-[14px] flex items-center justify-center">
                    <Smartphone className="w-7 h-7 text-[#00B875]" />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white">
                  Install PalmPay CashBack App
                </h3>
                <p className="text-xs text-purple-200/80 mt-1">
                  Enjoy native app speed, full-screen view, and instant Cashback alerts.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/50 border border-white/10 text-xs space-y-3">
                {isIOS ? (
                  <>
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-purple-500/20 text-[#00B875] shrink-0 mt-0.5">
                        <Share className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-white block">1. Tap Share Button</strong>
                        <span className="text-slate-300 text-[11px]">Tap the Safari Share icon at the bottom or top of your browser.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-purple-500/20 text-[#FFC107] shrink-0 mt-0.5">
                        <PlusSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-white block">2. Add to Home Screen</strong>
                        <span className="text-slate-300 text-[11px]">Scroll down the list and select "Add to Home Screen".</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-purple-500/20 text-[#00B875] shrink-0 mt-0.5">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-white block">1. Chrome / Edge Menu</strong>
                        <span className="text-slate-300 text-[11px]">Tap the browser menu (⋮) in the top right corner.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-purple-500/20 text-[#FFC107] shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-white block">2. Install App</strong>
                        <span className="text-slate-300 text-[11px]">Select "Install app" or "Add to Home Screen".</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#621494] to-[#7E1DC6] text-white font-semibold text-xs shadow-md transition-colors"
              >
                Got It, Close Guide
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00B875]/20 via-[#00B875]/30 to-[#02E680]/20 text-[#00B875] border border-[#00B875]/40 hover:bg-[#00B875] hover:text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${className}`}
      >
        <Smartphone className="w-3.5 h-3.5 text-[#00B875]" />
        <span>Install App</span>
      </button>

      {/* Instructions Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="mirror-glass-card max-w-sm w-full rounded-3xl p-6 border border-purple-500/30 shadow-2xl relative space-y-4 text-white">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#621494] to-[#00B875] p-0.5 mx-auto mb-3 shadow-lg flex items-center justify-center">
                <div className="w-full h-full bg-[#0B0614] rounded-[14px] flex items-center justify-center">
                  <Smartphone className="w-7 h-7 text-[#00B875]" />
                </div>
              </div>

              <h3 className="text-lg font-bold text-white">
                Install PalmPay CashBack App
              </h3>
              <p className="text-xs text-purple-200/80 mt-1">
                Add PalmPay to your home screen for full standalone app access.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 text-xs space-y-3">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-purple-500/20 text-[#00B875] shrink-0 mt-0.5">
                      <Share className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-white block">1. Tap Share Button</strong>
                      <span className="text-slate-300 text-[11px]">Tap the Safari Share icon at the bottom of your screen.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-purple-500/20 text-[#FFC107] shrink-0 mt-0.5">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-white block">2. Add to Home Screen</strong>
                      <span className="text-slate-300 text-[11px]">Scroll down and select "Add to Home Screen".</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-purple-500/20 text-[#00B875] shrink-0 mt-0.5">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-white block">1. Browser Menu</strong>
                      <span className="text-slate-300 text-[11px]">Tap the Chrome or Edge menu (⋮) in the top right.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-purple-500/20 text-[#FFC107] shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-white block">2. Install App</strong>
                      <span className="text-slate-300 text-[11px]">Select "Install app" or "Add to Home Screen".</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#621494] to-[#7E1DC6] text-white font-semibold text-xs shadow-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
