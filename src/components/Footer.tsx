import React, { useState } from 'react';
import { ShieldCheck, Lock, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  const [modalType, setModalType] = useState<'privacy' | 'terms' | 'contact' | null>(null);

  return (
    <>
      <footer className="w-full mt-16 border-t border-purple-500/20 bg-[#0B0614] py-10 px-4 sm:px-8 text-center pb-24 sm:pb-28">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Official PalmPay Logo Badge */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="bg-white rounded-2xl px-3 py-1.5 shadow-lg flex items-center gap-2 border border-white/40">
              <img
                src="/palmpay-logo-png_seeklogo-480404.png"
                alt="Official PalmPay Logo"
                className="h-8 w-auto object-contain"
              />
              <span className="bg-gradient-to-r from-[#FFC107] to-[#FFA000] text-black font-black uppercase text-[10px] px-2 py-0.5 rounded-md shadow-sm">
                Cashback
              </span>
            </div>

            {/* Official License Badge reading "Verified & Licensed by CBN" inside a rounded dark purple pill */}
            <div className="inline-flex items-center gap-2 bg-[#210B3B] border border-purple-400/40 text-purple-200 px-4 py-2 rounded-full shadow-[0_0_20px_rgba(126,29,198,0.25)] text-xs font-bold tracking-wide">
              <ShieldCheck className="w-4 h-4 text-[#FFC107]" />
              <span>Verified &amp; Licensed by CBN</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#A855F7] animate-ping" />
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            PalmPay Cashback provides automated consumer cashback disbursements and gamified rewards under CBN regulatory frameworks. All funds held and transferred are 100% insured.
          </p>

          {/* Text link navigation for "Privacy Policy", "Terms of Service", and "Contact Us" */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-400 font-medium">
            <button
              onClick={() => setModalType('privacy')}
              className="hover:text-white transition-colors underline decoration-slate-600 hover:decoration-white"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              onClick={() => setModalType('terms')}
              className="hover:text-white transition-colors underline decoration-slate-600 hover:decoration-white"
            >
              Terms of Service
            </button>
            <span>•</span>
            <button
              onClick={() => setModalType('contact')}
              className="hover:text-white transition-colors underline decoration-slate-600 hover:decoration-white"
            >
              Contact Us
            </button>
          </div>

          {/* Centered copyright text: "© 2026 PalmPayCashBack. All rights reserved." */}
          <div className="pt-2 text-xs text-slate-400 font-medium">
            © 2026 PalmPayCashBack. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Policy and Info Modals */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="mirror-glass-card max-w-lg w-full rounded-3xl p-6 border border-white/20 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white capitalize">
                {modalType === 'privacy' ? 'Privacy Policy' : modalType === 'terms' ? 'Terms of Service' : 'Contact Us & Compliance Desk'}
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="p-1 rounded-lg bg-white/10 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto text-xs text-slate-300 space-y-3 leading-relaxed pr-1">
              {modalType === 'privacy' && (
                <>
                  <p>
                    Your privacy is of the utmost importance to PalmPay Cashback. We employ bank-grade 256-bit encryption for all identity and transaction telemetry.
                  </p>
                  <p>
                    Data collected (including account email, beneficiary NUBAN, and transaction references) is exclusively utilized to verify automated clearing through Nigerian interbank settlement networks.
                  </p>
                </>
              )}

              {modalType === 'terms' && (
                <>
                  <p>
                    By participating in PalmPay Cashback reward initiatives (including Welcome Bonus, Daily Claims, Spin da' Bottle, and Referral Schemes), users agree to comply with CBN compliance directives.
                  </p>
                  <p>
                    Withdrawal requests exceeding ₦100,000 threshold require an authenticated single-use CashBack Code (₦8,550 clearance protocol fee).
                  </p>
                </>
              )}

              {modalType === 'contact' && (
                <>
                  <p>
                    <strong>PalmPay Official Headquarters:</strong><br />
                    20 Adeyemo Alakija Street, Victoria Island, Lagos, Nigeria.
                  </p>
                  <p>
                    <strong>Electronic Support Desk:</strong><br />
                    support@palmpaycashback.vercel.app<br />
                    24/7 Hotline: +234 (01) 888 7256
                  </p>
                  <p>
                    <strong>Regulatory &amp; Compliance Office:</strong><br />
                    compliance@palmpaycashback.vercel.app
                  </p>
                </>
              )}
            </div>

            <button
              onClick={() => setModalType(null)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#621494] via-[#7E1DC6] to-[#9333EA] text-white font-bold text-xs shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
