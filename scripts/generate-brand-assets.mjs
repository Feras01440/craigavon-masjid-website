/*
 * Regenerates every brand asset from the Association's authorised logo
 * artwork. The white background is lifted to transparency, single-colour
 * variants are tinted for dark surfaces, and the icons that platforms
 * composite onto black (Apple touch icon, maskable icon, favicon) are given
 * an opaque paper ground. Run `node scripts/generate-brand-assets.mjs`.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const root = process.cwd();
const brandDirectory = path.join(root, "public", "brand");
const source = path.join(brandDirectory, "muslim-association-of-craigavon-logo-source.jpg");

const PAPER = { r: 247, g: 243, b: 233 };
const GOLD = { r: 214, g: 172, b: 94 };
const CREAM = { r: 250, g: 245, b: 236 };

await mkdir(brandDirectory, { recursive: true });

const metadata = await sharp(source).metadata();
if (metadata.width !== 958 || metadata.height !== 960) {
  throw new Error("The authorised source artwork changed unexpectedly; generation stopped.");
}
const { width, height } = metadata;

// Alpha mask: white → transparent, artwork → opaque, with a soft ramp so
// antialiased edges survive: alpha = clamp((240 − luminance) × 5).
const mask = await sharp(source)
  .greyscale()
  .median(3)
  .linear(-5, 1200)
  .toColourspace("b-w")
  .toBuffer();

const transparent = await sharp(await sharp(source).removeAlpha().toBuffer())
  .joinChannel(mask)
  .png()
  .toBuffer();

async function tinted(colour) {
  return sharp({ create: { width, height, channels: 3, background: colour } })
    .joinChannel(mask)
    .png()
    .toBuffer();
}

async function onGround(markBuffer, size, ground, markScale) {
  const markSize = Math.round(size * markScale);
  const mark = await sharp(markBuffer).resize(markSize, markSize).png().toBuffer();
  const offset = Math.round((size - markSize) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background: { ...ground, alpha: 1 } },
  })
    .composite([{ input: mark, left: offset, top: offset }])
    .png({ compressionLevel: 9 });
}

const gold = await tinted(GOLD);
const cream = await tinted(CREAM);
const out = (name) => path.join(brandDirectory, name);

await Promise.all([
  // Transparent originals used by the header, manifest and structured data.
  sharp(transparent)
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(out("muslim-association-of-craigavon-logo-512.png")),
  sharp(transparent)
    .resize(192, 192)
    .png({ compressionLevel: 9 })
    .toFile(out("muslim-association-of-craigavon-logo-192.png")),
  sharp(transparent)
    .resize(64, 64)
    .png({ compressionLevel: 9 })
    .toFile(out("muslim-association-of-craigavon-logo-64.png")),
  sharp(transparent)
    .resize(256, 256)
    .webp({ quality: 95 })
    .toFile(out("muslim-association-of-craigavon-logo-256.webp")),
  // Tints for dark pine surfaces (footer, emboss, social card).
  sharp(gold).resize(512, 512).png({ compressionLevel: 9 }).toFile(out("logo-mark-gold-512.png")),
  sharp(gold).resize(960, 960).png({ compressionLevel: 9 }).toFile(out("logo-mark-gold-960.png")),
  sharp(cream).resize(512, 512).png({ compressionLevel: 9 }).toFile(out("logo-mark-cream-512.png")),
  // Opaque icons for platforms that composite onto black.
  (await onGround(transparent, 32, PAPER, 0.92)).toFile(out("favicon-32.png")),
  (await onGround(transparent, 180, PAPER, 0.78)).toFile(out("apple-touch-icon-180.png")),
  (await onGround(transparent, 512, PAPER, 0.58)).toFile(out("maskable-512.png")),
]);

// Social card: pine ground, the gold mark, and the masjid's name.
const cardMark = await sharp(gold).resize(430, 430).png().toBuffer();
const card = Buffer.from(`
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#133a30"/>
        <stop offset="0.6" stop-color="#0d2821"/>
        <stop offset="1" stop-color="#0a1f1a"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.85" cy="0.1" r="0.7">
        <stop offset="0" stop-color="#d3a84e" stop-opacity="0.22"/>
        <stop offset="1" stop-color="#d3a84e" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    <rect width="1200" height="630" fill="url(#glow)"/>
    <rect x="0" y="622" width="1200" height="8" fill="#d3a84e"/>
    <text x="90" y="250" fill="#ecd193" font-family="Georgia, 'Times New Roman', serif" font-size="30" letter-spacing="6">ٱلسَّلَامُ عَلَيْكُمْ</text>
    <text x="90" y="345" fill="#fffdf8" font-family="Georgia, 'Times New Roman', serif" font-size="82">Craigavon Masjid</text>
    <text x="92" y="400" fill="#ecd193" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" letter-spacing="4">MUSLIM ASSOCIATION OF CRAIGAVON</text>
    <text x="92" y="470" fill="#c7d7d0" font-family="Arial, Helvetica, sans-serif" font-size="26">Prayer times · Jumuʿah · Education · Community</text>
  </svg>
`);
await sharp(card)
  .composite([{ input: cardMark, left: 720, top: 100 }])
  .png({ compressionLevel: 9 })
  .toFile(out("social-card.png"));

console.log("Brand assets regenerated in public/brand.");
