export interface BankOption {
  name: string;
  code: string;
  slug?: string;
  id?: number;
}

export interface AccountResolutionResult {
  success: boolean;
  accountName?: string;
  accountNumber?: string;
  message?: string;
  verifiedBy?: string;
}

// Fallback high-reliability Nigerian banks if offline
export const DEFAULT_NIGERIAN_BANKS: BankOption[] = [
  { name: 'PalmPay', code: '999991', slug: 'palmpay' },
  { name: 'OPay Digital Services Limited (OPay)', code: '999992', slug: 'opay' },
  { name: 'Kuda Bank', code: '50211', slug: 'kuda-bank' },
  { name: 'Moniepoint Microfinance Bank', code: '50515', slug: 'moniepoint-mfb-ng' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058', slug: 'guaranty-trust-bank' },
  { name: 'Access Bank', code: '044', slug: 'access-bank' },
  { name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
  { name: 'United Bank For Africa (UBA)', code: '033', slug: 'united-bank-for-africa' },
  { name: 'First Bank of Nigeria', code: '011', slug: 'first-bank-of-nigeria' },
  { name: 'Fidelity Bank', code: '070', slug: 'fidelity-bank' },
  { name: 'Stanbic IBTC Bank', code: '221', slug: 'stanbic-ibtc-bank' },
  { name: 'Sterling Bank', code: '232', slug: 'sterling-bank' },
  { name: 'Union Bank of Nigeria', code: '032', slug: 'union-bank-of-nigeria' },
  { name: 'Wema Bank (ALAT)', code: '035', slug: 'wema-bank' },
  { name: 'First City Monument Bank (FCMB)', code: '214', slug: 'first-city-monument-bank' },
  { name: 'Ecobank Nigeria', code: '050', slug: 'ecobank-nigeria' },
  { name: 'TAJ Bank', code: '302', slug: 'taj-bank' },
  { name: 'Jaiz Bank', code: '301', slug: 'jaiz-bank' },
  { name: 'VFD Microfinance Bank', code: '566', slug: 'vfd-mfb' },
  { name: 'FairMoney Microfinance Bank', code: '51318', slug: 'fairmoney-mfb' }
];

export function deduplicateBanks(banks: BankOption[]): BankOption[] {
  const seen = new Set<string>();
  const list: BankOption[] = [];
  for (const b of banks) {
    const key = `${(b.code || '').trim()}-${(b.name || '').trim()}`;
    if (!seen.has(key) && !seen.has((b.code || '').trim())) {
      seen.add(key);
      seen.add((b.code || '').trim());
      list.push(b);
    }
  }
  return list;
}

/**
 * Fetches all Nigerian banks using Paystack API via server proxy
 */
export async function fetchPaystackBanks(): Promise<BankOption[]> {
  try {
    const response = await fetch('/api/paystack/banks');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const result = await response.json();
    if (result && result.status && Array.isArray(result.data) && result.data.length > 0) {
      return deduplicateBanks(result.data);
    }
    return deduplicateBanks(DEFAULT_NIGERIAN_BANKS);
  } catch (error) {
    console.warn('Could not fetch banks from /api/paystack/banks, using defaults:', error);
    return deduplicateBanks(DEFAULT_NIGERIAN_BANKS);
  }
}

/**
 * Resolves account holder full name for a given account number and bank code using Paystack API
 */
export async function resolvePaystackAccount(
  accountNumber: string,
  bankCode: string
): Promise<AccountResolutionResult> {
  const cleanNumber = accountNumber.trim().replace(/\D/g, '');
  const cleanCode = bankCode.trim();

  if (!cleanNumber || cleanNumber.length < 10) {
    return {
      success: false,
      message: 'Account number must be 10 digits.'
    };
  }

  if (!cleanCode) {
    return {
      success: false,
      message: 'Please select a destination bank first.'
    };
  }

  try {
    const url = `/api/paystack/resolve?account_number=${encodeURIComponent(cleanNumber)}&bank_code=${encodeURIComponent(cleanCode)}`;
    const response = await fetch(url);
    const result = await response.json();

    if (result && result.status && result.data?.account_name) {
      return {
        success: true,
        accountName: result.data.account_name,
        accountNumber: result.data.account_number || cleanNumber,
        verifiedBy: result.data.verified_by || 'Paystack Verified'
      };
    } else {
      return {
        success: false,
        message: result?.message || 'account not found, insert correct account number'
      };
    }
  } catch (error: any) {
    console.warn('Account resolution error:', error);
    return {
      success: false,
      message: 'account not found, insert correct account number'
    };
  }
}
