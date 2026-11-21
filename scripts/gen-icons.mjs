// Gera os ícones PWA a partir de scripts/icon.svg usando sharp.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'icons');
mkdirSync(out, { recursive: true });

const svg = await import('node:fs').then(fs => fs.readFileSync(join(root, 'scripts', 'icon.svg')));

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.png', size: 64 }
];

for (const t of targets) {
  const pad = t.maskable ? Math.round(t.size * 0.12) : 0;
  const inner = t.size - pad * 2;
  const layer = await sharp(svg).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: t.size, height: t.size, channels: 4, background: { r: 15, g: 157, b: 140, alpha: 1 } } })
    .composite([{ input: layer, top: pad, left: pad }])
    .png()
    .toFile(join(out, t.name));
  console.log('✓', t.name, `${t.size}x${t.size}`);
}
console.log('Ícones gerados em public/icons/');
