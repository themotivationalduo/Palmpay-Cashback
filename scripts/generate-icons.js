import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

// Svg with white background and precisely centered, proportioned PalmPay hexagon matching Image 2
// In 512x512 canvas:
// Center is (256, 256).
// Hexagon width/height is ~260px (occupying ~51% of canvas width), giving ~126px padding on all sides.
// When Android One UI applies its squircle mask or displays the app icon, it looks exactly like Image 2.
const createIconSvg = (size = 512) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <!-- Solid White Background -->
  <rect width="${size}" height="${size}" fill="#FFFFFF" rx="0" ry="0" />

  <!-- Centered PalmPay Logo Group -->
  <!-- Base size of original path is 48x48. Scale factor = (size * 0.53) / 48 -->
  <g transform="translate(${size * 0.235}, ${size * 0.235}) scale(${(size * 0.53) / 48})">
    <!-- Official PalmPay Rounded Hexagon Base (Vibrant #7212C7 / #7E1DC6) -->
    <path d="M21.157 4.262a5.69 5.69 0 0 1 5.685 0l12.83 7.407a5.69 5.69 0 0 1 2.843 4.924v14.814a5.69 5.69 0 0 1-2.843 4.924l-12.83 7.407a5.69 5.69 0 0 1-5.685 0l-12.83-7.407a5.69 5.69 0 0 1-2.842-4.924V16.593a5.69 5.69 0 0 1 2.842-4.924z" 
          fill="#7512D6" />

    <!-- Official PalmPay Intertwined White Geometric Loops -->
    <g fill="none" stroke="#FFFFFF" stroke-width="4.3" stroke-linecap="round" stroke-linejoin="round">
      <!-- Upper-left loop cutting boundary up-right -->
      <path d="M5.565 29.88l17.44-17.441a1.263 1.263 0 0 1 1.766-.021l7.432 7.089" />
      <!-- Lower-right loop cutting boundary down-left -->
      <path d="M42.435 18.12L25.007 36.051a1.263 1.263 0 0 1-1.766.021l-7.431-7.088" />
    </g>

    <!-- Center Diamond Square Accent -->
    <rect width="5.053" height="5.053" x="21.473" y="21.473" fill="#FFFFFF" rx="0.632" ry="0.632" transform="rotate(-45 24 24)" />
  </g>
</svg>`;
};

// Also an SVG with transparent background for in-app header/brand usage if needed
const createTransparentSvg = (size = 512) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${size}" height="${size}">
  <path d="M21.157 4.262a5.69 5.69 0 0 1 5.685 0l12.83 7.407a5.69 5.69 0 0 1 2.843 4.924v14.814a5.69 5.69 0 0 1-2.843 4.924l-12.83 7.407a5.69 5.69 0 0 1-5.685 0l-12.83-7.407a5.69 5.69 0 0 1-2.842-4.924V16.593a5.69 5.69 0 0 1 2.842-4.924z" 
        fill="#7512D6" />
  <g fill="none" stroke="#FFFFFF" stroke-width="4.3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5.565 29.88l17.44-17.441a1.263 1.263 0 0 1 1.766-.021l7.432 7.089" />
    <path d="M42.435 18.12L25.007 36.051a1.263 1.263 0 0 1-1.766.021l-7.431-7.088" />
  </g>
  <rect width="5.053" height="5.053" x="21.473" y="21.473" fill="#FFFFFF" rx="0.632" ry="0.632" transform="rotate(-45 24 24)" />
</svg>`;
};

async function generate() {
  const svg512 = Buffer.from(createIconSvg(512));
  const svg192 = Buffer.from(createIconSvg(192));
  const svg180 = Buffer.from(createIconSvg(180));

  // 1. Generate pwa-512x512.png
  await sharp(svg512)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ Created pwa-512x512.png');

  // 2. Generate pwa-maskable-512x512.png
  await sharp(svg512)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('✓ Created pwa-maskable-512x512.png');

  // 3. Generate pwa-192x192.png
  await sharp(svg192)
    .resize(192, 192)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ Created pwa-192x192.png');

  // 4. Generate apple-touch-icon.png
  await sharp(svg180)
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Created apple-touch-icon.png');

  // 5. Generate palmpay-icon-badge.png and palmpay-icon-exact.png
  await sharp(svg512)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'palmpay-icon-badge.png'));
  await sharp(svg512)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'palmpay-icon-exact.png'));

  // 6. Write palmpay-logo.svg and icon.svg
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), createIconSvg(512));
  fs.writeFileSync(path.join(publicDir, 'palmpay-logo.svg'), createTransparentSvg(512));
  console.log('✓ Wrote icon.svg and palmpay-logo.svg');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
