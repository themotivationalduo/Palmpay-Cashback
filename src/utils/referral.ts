/**
 * Referral link utilities for PalmPay Cashback Portal
 */

export const OFFICIAL_DOMAIN = 'https://palmpay-cashback.vercel.app';

/**
 * Returns the full referral URL for a given referral code.
 * Prefers the current window origin when running in browser, with fallback to official domain.
 */
export const getReferralUrl = (referralCode: string): string => {
  const code = (referralCode || 'PALM2026').trim().toUpperCase();
  let base = OFFICIAL_DOMAIN;
  if (typeof window !== 'undefined' && window.location.origin) {
    base = window.location.origin;
  }
  return `${base}/ref/${code}`;
};

/**
 * Returns pre-formatted invitation message ready for WhatsApp, SMS, or Telegram sharing.
 */
export const getReferralShareMessage = (referralCode: string): string => {
  const code = (referralCode || 'PALM2026').trim().toUpperCase();
  const link = getReferralUrl(code);
  return `🎉 Claim ₦150,000 PalmPay Cashback bonus instantly!\n\nCreate your free account on the official PalmPay Cashback Portal with my VIP invitation code: ${code}\n\n👉 Click to claim: ${link}`;
};

/**
 * Parses and extracts a referral code from the current URL if present.
 * Supports /ref/:code, /ref/:code/, ?ref=:code, ?referral=:code.
 */
export const extractReferralCodeFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    // 1. Check path matching /ref/CODE
    const pathname = window.location.pathname;
    const pathMatch = pathname.match(/\/ref\/([^/?#]+)/i);
    if (pathMatch && pathMatch[1]) {
      const parsed = decodeURIComponent(pathMatch[1]).trim().toUpperCase();
      if (parsed) return parsed;
    }

    // 2. Check search parameters
    const params = new URLSearchParams(window.location.search);
    const queryCode = params.get('ref') || params.get('referral') || params.get('code');
    if (queryCode) {
      const parsed = decodeURIComponent(queryCode).trim().toUpperCase();
      if (parsed) return parsed;
    }
  } catch (err) {
    console.warn('Error extracting referral code from URL:', err);
  }

  return null;
};
