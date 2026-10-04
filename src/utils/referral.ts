/**
 * Referral link utilities for PalmPay Cashback Portal
 */

export const OFFICIAL_DOMAIN = 'https://palmpay-cashback.vercel.app';

/**
 * Returns the official referral URL prefix e.g. https://palmpay-cashback.vercel.app/ref/
 */
export const OFFICIAL_REFERRAL_PREFIX = `${OFFICIAL_DOMAIN}/ref/`;

/**
 * Returns the full official referral URL for a given referral code with the official prefix:
 * https://palmpay-cashback.vercel.app/ref/REFERRAL_CODE
 */
export const getOfficialReferralUrl = (referralCode: string): string => {
  const code = (referralCode || 'PALM2026').trim().toUpperCase();
  return `${OFFICIAL_REFERRAL_PREFIX}${code}`;
};

/**
 * Returns the referral URL for a given referral code.
 * Defaults to the official domain prefix (https://palmpay-cashback.vercel.app/ref/CODE).
 * If useCurrentOrigin is explicitly true and in browser, uses window.location.origin.
 */
export const getReferralUrl = (referralCode: string, useCurrentOrigin = false): string => {
  const code = (referralCode || 'PALM2026').trim().toUpperCase();
  if (useCurrentOrigin && typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}/ref/${code}`;
  }
  return `${OFFICIAL_REFERRAL_PREFIX}${code}`;
};

/**
 * Returns pre-formatted invitation message ready for WhatsApp, SMS, or Telegram sharing.
 */
export const getReferralShareMessage = (referralCode: string, useCurrentOrigin = false): string => {
  const code = (referralCode || 'PALM2026').trim().toUpperCase();
  const link = getReferralUrl(code, useCurrentOrigin);
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
