import { mkdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const root = process.cwd();
const brandDirectory = path.join(root, "public", "brand");
const source = path.join(brandDirectory, "muslim-association-of-craigavon-logo-source.jpg");

await mkdir(brandDirectory, { recursive: true });

const sourceMetadata = await sharp(source).metadata();
if (sourceMetadata.width !== 958 || sourceMetadata.height !== 960) {
  throw new Error("The authorised Facebook source asset changed unexpectedly; generation stopped.");
}

const pngSizes = [512, 192, 64, 32];
await Promise.all(
  pngSizes.map((size) =>
    sharp(source)
      .resize(size, size, { fit: "contain", background: "#ffffff", withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: false })
      .toFile(
        path.join(
          brandDirectory,
          size === 32 ? "favicon-32.png" : `muslim-association-of-craigavon-logo-${size}.png`,
        ),
      ),
  ),
);

await sharp(source)
  .resize(256, 256, { fit: "contain", background: "#ffffff", withoutEnlargement: true })
  .webp({ quality: 88, effort: 6 })
  .toFile(path.join(brandDirectory, "muslim-association-of-craigavon-logo-256.webp"));

const socialLogo = await sharp(source)
  .resize(300, 300, { fit: "contain", background: "#ffffff", withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toBuffer();
const socialBackground = Buffer.from(`
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#173a31"/>
    <rect x="76" y="90" width="8" height="450" rx="4" fill="#e0bf85"/>
    <text x="126" y="238" fill="#e0bf85" font-family="Arial, sans-serif" font-size="27" font-weight="700" letter-spacing="2">COMMUNITY WEBSITE</text>
    <text x="126" y="320" fill="#ffffff" font-family="Arial, sans-serif" font-size="54" font-weight="700">Muslim Association</text>
    <text x="126" y="388" fill="#ffffff" font-family="Arial, sans-serif" font-size="54" font-weight="700">of Craigavon</text>
    <text x="126" y="462" fill="#d9e5df" font-family="Arial, sans-serif" font-size="25">Prayer, visiting and community information</text>
    <rect x="824" y="164" width="312" height="312" rx="12" fill="#ffffff" stroke="#e0bf85" stroke-width="6"/>
  </svg>
`);
await sharp(socialBackground)
  .composite([{ input: socialLogo, left: 830, top: 170 }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(brandDirectory, "social-card.png"));
