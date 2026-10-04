import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Trophy, RotateCcw, Volume2, VolumeX, ShieldCheck, Flame, ArrowLeft, Wallet, AlertCircle, Plus, ExternalLink } from 'lucide-react';
import { useAuth, PAYSTACK_DEPOSIT_URL } from '../context/AuthContext';
import { useCelebration } from '../context/CelebrationContext';
import confetti from 'canvas-confetti';
import gsap from 'gsap';

interface PrizeSlot {
  label: string;
  amount: number;
  color: string;
  angle: number; // degrees
  isWin: boolean;
}

const PRIZE_SLOTS: PrizeSlot[] = [
  { label: '₦5,500', amount: 5500, color: '#00B875', angle: 0, isWin: true },
  { label: 'Try Again', amount: 0, color: '#EF4444', angle: 45, isWin: false },
  { label: '₦2,500', amount: 2500, color: '#FFC107', angle: 90, isWin: true },
  { label: '₦10,000', amount: 10000, color: '#8B5CF6', angle: 135, isWin: true },
  { label: '₦0', amount: 0, color: '#EF4444', angle: 180, isWin: false },
  { label: '₦1,500', amount: 1500, color: '#3B82F6', angle: 225, isWin: true },
  { label: '₦50,000', amount: 50000, color: '#F59E0B', angle: 270, isWin: true },
  { label: 'Try Again', amount: 0, color: '#EF4444', angle: 315, isWin: false },
];

export const SpinBottleGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user, updateBalance } = useAuth();
  const { triggerCelebration } = useCelebration();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastPrize, setLastPrize] = useState<PrizeSlot | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameResultModal, setGameResultModal] = useState<PrizeSlot | null>(null);
  const [insufficientDepositModal, setInsufficientDepositModal] = useState(false);
  const [gamesPlayed, setGamesPlayed] = useState(12);
  const [totalWon, setTotalWon] = useState(48500);

  const bottleRef = useRef<HTMLDivElement>(null);
  const currentRotationRef = useRef<number>(0);
  const activeTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const depositBal = user?.depositBalance ?? 0;

  // Cleanup GSAP tweens on component unmount
  useEffect(() => {
    return () => {
      if (activeTimelineRef.current) {
        activeTimelineRef.current.kill();
      }
      if (bottleRef.current) {
        gsap.killTweensOf(bottleRef.current);
      }
    };
  }, []);

  const playBeep = (freq: number, duration: number, type: OscillatorType = 'sine') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio fallback
    }
  };

  const playTick = (freq: number, duration: number = 0.035) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio fallback
    }
  };

  const handleSpin = async () => {
    if (spinning) return;

    // Strict Rule: Users can ONLY use deposited balance to play games
    if (depositBal < 1000) {
      setInsufficientDepositModal(true);
      return;
    }

    setSpinning(true);
    setGameResultModal(null);

    // Pick a truly random reward segment across all segments in PRIZE_SLOTS
    const randomIndex = Math.floor(Math.random() * PRIZE_SLOTS.length);
    const selectedPrize = PRIZE_SLOTS[randomIndex];

    // Deduct entry fee ₦1,000 strictly from deposited balance
    await updateBalance(-1000, "Spin da' Bottle Entry Fee", 'game_loss', 'debit', 'deposit');

    // Calculate rotation: at least 6-8 full spins + slot angle
    const minSpins = 6 + Math.floor(Math.random() * 3); // 6 to 8 full spins
    const targetAngle = selectedPrize.angle;
    const currentRot = currentRotationRef.current;
    const currentMod = ((currentRot % 360) + 360) % 360;
    let forwardDelta = targetAngle - currentMod;
    if (forwardDelta <= 0) {
      forwardDelta += 360;
    }
    const finalRotation = currentRot + (minSpins * 360) + forwardDelta;

    // Kill any existing tween
    if (activeTimelineRef.current) {
      activeTimelineRef.current.kill();
    }

    const spinData = {
      rot: currentRot,
    };

    let lastTickAngle = currentRot;

    // GSAP Physical Bottle Spin Timeline
    const tl = gsap.timeline({
      onComplete: async () => {
        currentRotationRef.current = finalRotation;
        setRotation(finalRotation);
        setSpinning(false);
        setLastPrize(selectedPrize);
        setGamesPlayed((p) => p + 1);

        if (selectedPrize.isWin) {
          // Game win! Added to deposited balance
          playBeep(784, 0.25, 'sine');
          setTimeout(() => playBeep(1046, 0.4, 'sine'), 150);
          confetti({
            particleCount: 90,
            spread: 75,
            origin: { y: 0.6 }
          });
          
          triggerCelebration({
            title: `You Won ${selectedPrize.label}! 🏆`,
            subtitle: `Congratulations! ${selectedPrize.label} reward has been credited directly to your Deposited Balance.`,
            type: 'game',
            amount: selectedPrize.label,
            duration: 4000
          });

          await updateBalance(selectedPrize.amount, "Game Win - Spin da' Bottle", 'game_win', 'credit', 'deposit');
          setTotalWon((p) => p + selectedPrize.amount);
        } else {
          // Game loss
          playBeep(220, 0.35, 'sawtooth');
        }

        setGameResultModal(selectedPrize);
      }
    });

    activeTimelineRef.current = tl;

    // Phase 1: High angular acceleration decaying with realistic surface friction (power4.out)
    tl.to(spinData, {
      rot: finalRotation,
      duration: 3.9,
      ease: "power4.out",
      onUpdate: () => {
        const cur = spinData.rot;
        const totalDist = finalRotation - currentRot;
        const remaining = finalRotation - cur;
        const speed = Math.max(0, Math.min(1, remaining / totalDist));

        // Centrifugal 3D wobble & tilt: replicates physical bottle rocking as it rotates fast
        const wobbleX = Math.sin(cur * 0.08) * 8 * speed;
        const wobbleY = Math.cos(cur * 0.08) * 8 * speed;
        const dynamicScale = 1 + (speed * 0.04 * Math.sin(cur * 0.12));

        if (bottleRef.current) {
          bottleRef.current.style.transform = `rotate(${cur}deg) rotateX(${wobbleX}deg) rotateY(${wobbleY}deg) scale(${dynamicScale})`;
        }

        // Mechanical tick sound synced to actual angular travel over the 45-degree sector lines
        if (Math.abs(cur - lastTickAngle) >= 45) {
          lastTickAngle = cur;
          const tickFreq = 380 + Math.round(speed * 280);
          playTick(tickFreq, 0.035);
        }
      }
    });

    // Phase 2: Realistic Physical Glass Recoil & Settling Micro-Bounce
    tl.to(bottleRef.current, {
      transform: `rotate(${finalRotation + 2.2}deg) rotateX(0deg) rotateY(0deg) scale(1)`,
      duration: 0.14,
      ease: "power2.out"
    });
    tl.to(bottleRef.current, {
      transform: `rotate(${finalRotation}deg) rotateX(0deg) rotateY(0deg) scale(1)`,
      duration: 0.28,
      ease: "bounce.out"
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Top Breadcrumb & Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl mirror-glass hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#00B875]" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Deposited Balance Indicator */}
          <div className="mirror-glass px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-[#00B875]" />
            <span>Deposit Bal: ₦{depositBal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Glass Game Arena */}
      <div className="mirror-glass-card rounded-3xl p-4 sm:p-8 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden">
        
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00B875]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-1 relative z-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#FFC107] bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/25">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            GAMIFIED CASH REWARDS
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white font-['Poppins',sans-serif] tracking-tight">
            Spin da' Bottle (Spin &amp; Win)
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
            Spin the official PalmPay royal purple glass bottle to land on instant cash multipliers.
          </p>
          <div className="inline-block pt-1">
            <span className="text-[11px] text-purple-200/90 bg-purple-900/30 border border-purple-500/30 px-3 py-0.5 rounded-full">
              ⚡ Only Deposited Balance is used to spin. Cashback balance is reserved for withdrawal.
            </span>
          </div>
        </div>

        {/* Center Circular Turntable & Spinning Bottle */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 mx-auto my-6 sm:my-8 flex items-center justify-center">
          
          {/* Dial Board with 8 prize segments */}
          <div className="absolute inset-0 rounded-full mirror-glass border-4 border-white/15 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] overflow-hidden">
            {PRIZE_SLOTS.map((slot, index) => {
              const rotationDeg = index * 45;
              const isSelected = lastPrize?.angle === slot.angle;
              return (
                <div
                  key={index}
                  className={`absolute top-0 left-1/2 w-24 -ml-12 sm:w-28 sm:-ml-14 h-1/2 origin-bottom flex flex-col items-center pt-2 sm:pt-4 transition-all duration-300 ${
                    isSelected ? 'scale-110 z-10' : 'opacity-85'
                  }`}
                  style={{ transform: `rotate(${rotationDeg}deg)` }}
                >
                  <span
                    className={`text-[10px] sm:text-xs font-black tracking-tight uppercase px-1.5 sm:px-2 py-0.5 rounded-md shadow-sm border transition-all ${
                      isSelected ? 'ring-2 ring-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' : ''
                    }`}
                    style={{
                      backgroundColor: slot.isWin ? `${slot.color}25` : '#EF444420',
                      color: slot.color,
                      borderColor: `${slot.color}40`
                    }}
                  >
                    {slot.label}
                  </span>
                  <div
                    className={`w-1.5 h-1.5 rounded-full mt-1.5 transition-all ${isSelected ? 'scale-150 shadow-[0_0_8px_white]' : ''}`}
                    style={{ backgroundColor: slot.color }}
                  />
                </div>
              );
            })}
          </div>

          {/* Center Hub Indicator Ring */}
          <div className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#120822]/90 border border-purple-500/30 shadow-2xl flex items-center justify-center z-10 pointer-events-none">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#621494] via-[#7E1DC6] to-[#A855F7] flex items-center justify-center text-white font-bold text-[10px] sm:text-xs shadow-inner">
              PALM
            </div>
          </div>

          {/* The Interactive 3D Spinning PalmPay Royal Purple Glass Bottle (GSAP animated) */}
          <div
            style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
            className="relative z-20 flex items-center justify-center pointer-events-auto"
          >
            <div
              ref={bottleRef}
              className="relative z-20 w-14 sm:w-16 md:w-20 h-44 sm:h-52 md:h-64 flex items-center justify-center cursor-pointer will-change-transform select-none"
              style={{
                transformOrigin: '50% 50%',
                transform: `rotate(${rotation}deg)`,
                transformStyle: 'preserve-3d'
              }}
              onClick={handleSpin}
              title={spinning ? 'Spinning...' : 'Click bottle or button below to spin'}
            >
            <svg viewBox="0 0 100 300" className="w-full h-full drop-shadow-[0_15px_25px_rgba(0,0,0,0.85)]">
              <rect x="42" y="10" width="16" height="15" rx="3" fill="#FFC107" stroke="#FFF" strokeWidth="1" />
              <line x1="42" y1="15" x2="58" y2="15" stroke="#000" strokeWidth="1" />
              <line x1="42" y1="19" x2="58" y2="19" stroke="#000" strokeWidth="1" />

              <path d="M44 25 L56 25 L58 85 L42 85 Z" fill="url(#ppBottleGlass)" />

              <path
                d="M42 85 C32 110, 20 120, 20 150 L20 260 C20 275, 35 285, 50 285 C65 285, 80 275, 80 260 L80 150 C80 120, 68 110, 58 85 Z"
                fill="url(#ppBottleGlass)"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="2"
              />

              <path d="M26 145 L26 260 C26 268, 30 275, 38 277 L38 140 Z" fill="rgba(255, 255, 255, 0.35)" />
              <path d="M47 30 L47 80 L50 80 L50 30 Z" fill="rgba(255, 255, 255, 0.4)" />

              <rect x="25" y="170" width="50" height="60" rx="8" fill="#120822" stroke="#A855F7" strokeWidth="1.5" />
              <circle cx="50" cy="190" r="10" fill="#621494" />
              <text x="50" y="194" textAnchor="middle" fill="#FFF" fontSize="9" fontWeight="bold">P</text>
              <text x="50" y="212" textAnchor="middle" fill="#FFC107" fontSize="8" fontWeight="bold">PALMPAY</text>
              <text x="50" y="222" textAnchor="middle" fill="#FFF" fontSize="6.5">SPIN &amp; WIN</text>

              <defs>
                <linearGradient id="ppBottleGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#A855F7" />
                  <stop offset="30%" stopColor="#7E1DC6" />
                  <stop offset="70%" stopColor="#621494" />
                  <stop offset="100%" stopColor="#3C0B5C" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        </div>

        {/* Action Controls & Spin Trigger */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10 pt-2">
          <button
            onClick={handleSpin}
            disabled={spinning}
            className={`px-8 py-4 rounded-2xl text-base font-extrabold uppercase tracking-wider transition-all duration-200 flex items-center gap-3 shadow-[0_8px_30px_rgba(126,29,198,0.45)] border border-purple-300/40 active:scale-95 ${
              spinning
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed border-slate-600'
                : 'bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white hover:shadow-[0_10px_35px_rgba(126,29,198,0.65)] hover:scale-105'
            }`}
          >
            <RotateCcw className={`w-5 h-5 ${spinning ? 'animate-spin' : ''}`} />
            <span>{spinning ? 'Spinning Bottle...' : 'SPIN DA\' BOTTLE'}</span>
            <span className="bg-black/30 text-[#FFC107] text-xs px-2 py-0.5 rounded-full font-mono normal-case">
              -₦1,000 deposit fee
            </span>
          </button>
        </div>

        {/* Live Bottom Stats Strip */}
        <div className="mt-8 pt-5 border-t border-white/10 grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div className="mirror-glass p-3 rounded-xl border border-white/10">
            <span className="text-[11px] text-slate-400 block">Total Plays</span>
            <span className="text-base sm:text-lg font-bold text-white font-mono">{gamesPlayed}</span>
          </div>
          <div className="mirror-glass p-3 rounded-xl border border-white/10">
            <span className="text-[11px] text-slate-400 block">Total Rewards Won</span>
            <span className="text-base sm:text-lg font-bold text-[#FFC107] font-mono">₦{totalWon.toLocaleString()}</span>
          </div>
          <div className="mirror-glass p-3 rounded-xl border border-white/10">
            <span className="text-[11px] text-slate-400 block">Game Balance</span>
            <span className="text-xs sm:text-sm font-bold text-[#00B875] flex items-center justify-center gap-1 mt-0.5 font-mono">
              ₦{depositBal.toLocaleString()}
            </span>
          </div>
        </div>

      </div>

      {/* Insufficient Deposited Balance Alert Modal */}
      {insufficientDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="mirror-glass-card max-w-md w-full rounded-3xl p-6 sm:p-7 border border-amber-500/40 shadow-2xl text-center space-y-4">
            
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-amber-500/20 border border-amber-500/40 text-[#FFC107] shadow-lg">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/20 text-[#FFC107] border border-amber-500/30">
                DEPOSITED BALANCE REQUIRED
              </span>

              <h3 className="text-xl font-black text-white mt-2 font-['Poppins',sans-serif]">
                Deposit to Play Game
              </h3>

              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                In accordance with platform rules, <strong>users can only use deposited balance to play games</strong>. Your CashBack balance (₦{(user?.balance ?? 0).toLocaleString()}) can only be withdrawn.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 text-xs space-y-1 text-left">
              <div className="flex justify-between text-slate-400">
                <span>Available Deposited Balance:</span>
                <strong className="text-white font-mono">₦{depositBal.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Spin Entry Fee:</span>
                <strong className="text-[#FFC107] font-mono">₦1,000</strong>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <a
                href={PAYSTACK_DEPOSIT_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setInsufficientDepositModal(false)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#008f5a] to-[#00B875] text-white font-bold text-xs sm:text-sm shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Deposit via Paystack (₦500+)</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={() => setInsufficientDepositModal(false)}
                className="w-full py-2.5 rounded-xl mirror-glass hover:bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Dialog Modal */}
      {gameResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="mirror-glass-card max-w-sm w-full rounded-3xl p-6 border border-white/20 shadow-2xl text-center space-y-4">
            
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: gameResultModal.isWin ? '#00B87520' : '#EF444420',
                border: `1px solid ${gameResultModal.color}`
              }}
            >
              {gameResultModal.isWin ? (
                <Trophy className="w-8 h-8 text-[#00B875]" />
              ) : (
                <Sparkles className="w-8 h-8 text-rose-400" />
              )}
            </div>

            <div>
              <span className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                gameResultModal.isWin ? 'bg-emerald-500/20 text-[#00B875] border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}>
                {gameResultModal.isWin ? 'SPIN WINNER!' : 'TRY AGAIN'}
              </span>

              <h3 className="text-2xl font-black text-white mt-2 font-['Poppins',sans-serif]">
                {gameResultModal.isWin ? `Won ${gameResultModal.label}!` : "Bottle missed prize"}
              </h3>

              <p className="text-xs text-slate-300 mt-1 leading-snug">
                {gameResultModal.isWin
                  ? `Your reward of ${gameResultModal.label} has been automatically credited to your Deposited Balance.`
                  : "So close! Give the PalmPay bottle another spin to hit the jackpot!"}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setGameResultModal(null);
                  handleSpin();
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#008f5a] to-[#00B875] text-white font-bold text-sm shadow-md hover:opacity-95 transition-all"
              >
                Spin Again (-₦1,000)
              </button>

              <button
                onClick={() => setGameResultModal(null)}
                className="w-full py-2.5 rounded-xl mirror-glass hover:bg-white/10 text-slate-300 hover:text-white font-semibold text-xs border border-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
