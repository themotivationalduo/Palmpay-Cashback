import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svg = `
<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient matching uploaded image -->
    <radialGradient id="bgGlow" cx="50%" cy="58%" r="62%">
      <stop offset="0%" stop-color="#082b57" stop-opacity="0.9" />
      <stop offset="42%" stop-color="#03152f" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#010610" stop-opacity="1" />
    </radialGradient>

    <!-- Neon Glow Filters -->
    <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Dark Background -->
  <rect width="1280" height="720" fill="url(#bgGlow)" />

  <!-- Center Watermark: PalmPay Hexagon Outline -->
  <g transform="translate(640, 360) scale(4.5)" opacity="0.075">
    <path d="M-36 -21 L0 -42 L36 -21 L36 21 L0 42 L-36 21 Z" fill="none" stroke="#38bdf8" stroke-width="4.5" stroke-linejoin="round" />
    <path d="M-18 -10 L18 -10 L10 12 L-10 12 Z" fill="#38bdf8" />
  </g>

  <!-- Left Icon: Glowing Circular "NP" Badge -->
  <g transform="translate(165, 302)" filter="url(#neonGlow)">
    <circle cx="0" cy="0" r="28" fill="none" stroke="#258bf5" stroke-width="3" opacity="0.85" />
    <circle cx="0" cy="0" r="23" fill="#041838" opacity="0.9" />
    <text x="0" y="7.5" font-family="'Poppins', 'Inter', sans-serif" font-size="20" font-weight="900" fill="#38bdf8" text-anchor="middle" letter-spacing="1">NP</text>
  </g>

  <!-- Center Headline: "Get ₦150,000 Cashback Instantly !" -->
  <g transform="translate(640, 314)">
    <text text-anchor="middle" font-family="'Poppins', 'Inter', sans-serif" font-size="44" font-weight="800">
      <tspan fill="#FFFFFF">Get </tspan>
      <tspan fill="#2F80ED">₦150,000</tspan>
      <tspan fill="#FFFFFF"> Cashback Instantly !</tspan>
    </text>
    <!-- Underline bar beneath ₦150,000 -->
    <path d="M-315 14 L335 14" stroke="#2F80ED" stroke-width="3" stroke-linecap="round" opacity="0.95" />
  </g>

  <!-- Right Icon: Glowing Cyan Credit Card with Curved Exchange Arrows -->
  <g transform="translate(1115, 302)" filter="url(#neonGlow)">
    <!-- Credit Card Body -->
    <rect x="-24" y="-17" width="44" height="30" rx="5" fill="#031633" stroke="#258bf5" stroke-width="2.5" />
    <line x1="-24" y1="-7" x2="20" y2="-7" stroke="#258bf5" stroke-width="2.5" />
    <rect x="-17" y="1" width="9" height="6" rx="1" fill="#38bdf8" />

    <!-- Curved Circular Exchange Sync Arrows -->
    <path d="M22 -11 C 33 -7, 36 6, 25 17" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" />
    <path d="M28 -13 L22 -11 L24 -5" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

    <path d="M-22 13 C -33 9, -36 -4, -25 -15" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" />
    <path d="M-28 15 L-22 13 L-24 7" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
  </g>

  <!-- Subtitle Paragraph -->
  <g transform="translate(640, 396)">
    <text text-anchor="middle" font-family="'Inter', sans-serif" font-size="20.5" font-weight="400">
      <tspan x="0" dy="0" fill="#CBD5E1">Create your free account now and receive <tspan fill="#38bdf8" font-weight="600">₦150,000 cashback</tspan></tspan>
      <tspan x="0" dy="28" fill="#CBD5E1">bonus instantly. No strings attached. Start spending today !</tspan>
    </text>
  </g>

  <!-- Bottom CTA Button: "Start Earning Now" -->
  <g transform="translate(640, 642)">
    <rect x="-135" y="-23" width="270" height="46" rx="13" fill="#1D70B8" filter="url(#softGlow)" />
    <text x="0" y="6" text-anchor="middle" font-family="'Poppins', 'Inter', sans-serif" font-size="15.5" font-weight="700" fill="#FFFFFF">Start Earning Now</text>
  </g>
</svg>
`;

async function generate() {
  fs.writeFileSync('public/link-preview.svg', svg.trim());
  await sharp(Buffer.from(svg))
    .png({ quality: 100 })
    .toFile('public/link-preview.png');
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 95 })
    .toFile('public/link-preview.jpg');
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 95 })
    .toFile('public/og-image.jpg');
  console.log('Successfully generated public/link-preview.jpg, public/og-image.jpg, and public/link-preview.svg!');
}

generate().catch(console.error);
