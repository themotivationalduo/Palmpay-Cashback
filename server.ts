import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY || '';

app.use(express.json());

// In-memory cache for bank list
interface BankItem {
  name: string;
  code: string;
  slug: string;
  id?: number;
  active?: boolean;
}

let cachedBanks: BankItem[] | null = null;
let lastBanksFetchTime = 0;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

// Priority ordering for popular Nigerian fintechs and major commercial banks
const PRIORITY_BANK_NAMES = [
  'palmpay',
  'opay',
  'kuda',
  'moniepoint',
  'guaranty trust',
  'gtbank',
  'access bank',
  'zenith bank',
  'united bank for africa',
  'first bank of nigeria',
  'fidelity bank',
  'stanbic ibtc',
  'sterling bank',
  'union bank of nigeria',
  'wema bank',
  'first city monument bank',
  'ecobank',
  'taj bank',
  'jaiz bank',
  'vfd microfinance bank',
  'fairmoney'
];

function deduplicateBanks(banks: BankItem[]): BankItem[] {
  const seen = new Set<string>();
  const unique: BankItem[] = [];
  for (const b of banks) {
    const key = `${(b.code || '').trim()}-${(b.name || '').trim()}`;
    if (!seen.has(key) && !seen.has(b.code)) {
      seen.add(key);
      seen.add(b.code);
      unique.push(b);
    }
  }
  return unique;
}

function sortBanksWithPriority(banks: BankItem[]): BankItem[] {
  const uniqueBanks = deduplicateBanks(banks);
  const priorityList: BankItem[] = [];
  const regularList: BankItem[] = [];

  uniqueBanks.forEach((b) => {
    const nameLower = b.name.toLowerCase();
    const isPriority = PRIORITY_BANK_NAMES.some((p) => nameLower.includes(p));
    if (isPriority) {
      priorityList.push(b);
    } else {
      regularList.push(b);
    }
  });

  // Sort priority items based on position in PRIORITY_BANK_NAMES
  priorityList.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aIdx = PRIORITY_BANK_NAMES.findIndex((p) => aName.includes(p));
    const bIdx = PRIORITY_BANK_NAMES.findIndex((p) => bName.includes(p));
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  regularList.sort((a, b) => a.name.localeCompare(b.name));

  return [...priorityList, ...regularList];
}

// 1. Fetch Banks List from Paystack API
app.get('/api/paystack/banks', async (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (cachedBanks && now - lastBanksFetchTime < CACHE_TTL_MS) {
      return res.json({ status: true, data: cachedBanks, cached: true });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (PAYSTACK_PUBLIC_KEY) {
      headers['Authorization'] = `Bearer ${PAYSTACK_PUBLIC_KEY}`;
    }

    const response = await fetch('https://api.paystack.co/bank?country=nigeria&use_cursor=false&perPage=100', {
      method: 'GET',
      headers
    });

    const result: any = await response.json();

    if (result && result.status && Array.isArray(result.data)) {
      const formatted = result.data.map((b: any) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        slug: b.slug,
        active: b.active
      }));

      cachedBanks = sortBanksWithPriority(formatted);
      lastBanksFetchTime = now;
      return res.json({ status: true, data: cachedBanks });
    } else {
      // Fallback standard Nigerian banks list if Paystack is unreachable
      const fallbackList: BankItem[] = sortBanksWithPriority([
        { name: 'PalmPay', code: '999991', slug: 'palmpay' },
        { name: 'OPay Digital Services Limited (OPay)', code: '999992', slug: 'opay' },
        { name: 'Kuda Bank', code: '50211', slug: 'kuda-bank' },
        { name: 'Moniepoint Microfinance Bank', code: '50515', slug: 'moniepoint-mfb-ng' },
        { name: 'Guaranty Trust Bank', code: '058', slug: 'guaranty-trust-bank' },
        { name: 'Access Bank', code: '044', slug: 'access-bank' },
        { name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
        { name: 'United Bank For Africa', code: '033', slug: 'united-bank-for-africa' },
        { name: 'First Bank of Nigeria', code: '011', slug: 'first-bank-of-nigeria' },
        { name: 'Fidelity Bank', code: '070', slug: 'fidelity-bank' },
        { name: 'Stanbic IBTC Bank', code: '221', slug: 'stanbic-ibtc-bank' }
      ]);
      return res.json({ status: true, data: fallbackList, fallback: true });
    }
  } catch (error: any) {
    console.error('Error fetching banks from Paystack:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch bank list from Paystack',
      error: error.message
    });
  }
});

// 2. Resolve Account Name using Paystack API with PAYSTACK_SECRET_KEY
app.get('/api/paystack/resolve', async (req: Request, res: Response) => {
  const accountNumber = (req.query.account_number as string || '').trim().replace(/\D/g, '');
  const bankCode = (req.query.bank_code as string || '').trim();

  if (!accountNumber || accountNumber.length < 10) {
    return res.status(400).json({
      status: false,
      message: 'A valid 10-digit NUBAN account number is required.'
    });
  }

  if (!bankCode) {
    return res.status(400).json({
      status: false,
      message: 'Bank code is required.'
    });
  }

  const secretKey = (
    process.env.PAYSTACK_SECRET_KEY ||
    process.env.PAYSTACK_SECRET ||
    process.env.PAYSTACK_KEY ||
    process.env.VITE_PAYSTACK_SECRET_KEY ||
    process.env.PAYSTACK_PUBLIC_KEY ||
    process.env.VITE_PAYSTACK_PUBLIC_KEY ||
    ''
  ).trim();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (secretKey) {
      headers['Authorization'] = `Bearer ${secretKey}`;
    }

    const paystackUrl = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`;
    
    const response = await fetch(paystackUrl, {
      method: 'GET',
      headers
    });

    const result: any = await response.json();

    if (result && result.status && result.data && result.data.account_name) {
      return res.json({
        status: true,
        data: {
          account_number: result.data.account_number || accountNumber,
          account_name: result.data.account_name,
          bank_id: result.data.bank_id,
          verified_by: 'Paystack Verified'
        }
      });
    } else {
      return res.json({
        status: false,
        message: result?.message || 'Could not resolve account holder name with the selected bank. Please check the account number and bank.',
        raw: result
      });
    }
  } catch (error: any) {
    console.error('[Paystack Resolve Error]:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to communicate with Paystack resolution gateway.',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    paystack_configured: Boolean(PAYSTACK_PUBLIC_KEY),
    timestamp: new Date().toISOString()
  });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PalmPay Server] Running on http://0.0.0.0:${PORT} (Paystack integration active)`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server start error:', err);
});
