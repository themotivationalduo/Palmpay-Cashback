import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';

export type CelebrationType = 
  | 'success' 
  | 'login' 
  | 'register' 
  | 'bonus' 
  | 'withdrawal' 
  | 'deposit' 
  | 'code' 
  | 'game'
  | 'admin'
  | 'copy';

export interface CelebrationOptions {
  title: string;
  subtitle: string;
  type?: CelebrationType;
  amount?: string | number;
  duration?: number; // Duration in ms before auto-close (default 3800ms)
  confettiIntensity?: 'high' | 'medium' | 'low' | 'none';
  onComplete?: () => void;
}

interface CelebrationContextType {
  celebration: CelebrationOptions | null;
  isOpen: boolean;
  triggerCelebration: (options: CelebrationOptions) => void;
  closeCelebration: () => void;
}

const CelebrationContext = createContext<CelebrationContextType | undefined>(undefined);

// Web Audio synthesizer for celebration chime
const playSuccessFanfare = (type: CelebrationType = 'success') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    
    // Different note sequences based on celebration type
    let notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Major triumph)
    if (type === 'bonus' || type === 'game') {
      notes = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6 (Excited sparkle)
    } else if (type === 'register' || type === 'login') {
      notes = [440.00, 554.37, 659.25, 880.00]; // A4, C#5, E5, A5 (Warm welcome)
    }

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.55);
    });
  } catch (e) {
    // Audio autoplay or web audio not permitted, ignore safely
  }
};

// Launch confetti particles
const launchCelebrationConfetti = (intensity: 'high' | 'medium' | 'low' | 'none' = 'high') => {
  if (intensity === 'none') return;

  const count = intensity === 'high' ? 90 : intensity === 'medium' ? 50 : 25;
  const colors = ['#A855F7', '#FFC107', '#00B875', '#EC4899', '#3B82F6', '#FFFFFF'];

  try {
    confetti({
      particleCount: count,
      spread: intensity === 'high' ? 80 : 55,
      origin: { y: 0.55 },
      colors,
      disableForReducedMotion: true,
      zIndex: 99999
    });

    if (intensity === 'high') {
      setTimeout(() => {
        confetti({
          particleCount: 45,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.65 },
          colors,
          zIndex: 99999
        });
        confetti({
          particleCount: 45,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.65 },
          colors,
          zIndex: 99999
        });
      }, 180);
    }
  } catch (e) {
    // Confetti canvas error fallback
  }
};

export const CelebrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [celebration, setCelebration] = useState<CelebrationOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<any>(null);

  const closeCelebration = useCallback(() => {
    setIsOpen(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (celebration?.onComplete) {
      celebration.onComplete();
    }
  }, [celebration]);

  const triggerCelebration = useCallback((options: CelebrationOptions) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setCelebration(options);
    setIsOpen(true);

    // Play chime sound
    playSuccessFanfare(options.type || 'success');

    // Shoot confetti
    launchCelebrationConfetti(options.confettiIntensity || 'high');

    const duration = options.duration ?? 3800;
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        setIsOpen(false);
        if (options.onComplete) {
          options.onComplete();
        }
      }, duration);
    }
  }, []);

  return (
    <CelebrationContext.Provider
      value={{
        celebration,
        isOpen,
        triggerCelebration,
        closeCelebration,
      }}
    >
      {children}
    </CelebrationContext.Provider>
  );
};

export const useCelebration = () => {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error('useCelebration must be used within a CelebrationProvider');
  }
  return context;
};
