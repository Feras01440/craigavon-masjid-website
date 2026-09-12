/*
 * Optimises the masjid's own photographs (from a local folder) into the
 * self-hosted AVIF/WebP pairs used by the MasjidPhoto component.
 *
 *   node scripts/optimise-masjid-photos.mjs <source-folder>
 *
 * Edit the `photos` list to map source files to the stable names the site
 * uses; outputs land in public/images/masjid at 1600 and 800 wide.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/optimise-masjid-photos.mjs <source-folder>");
  process.exit(1);
}
const out = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "images",
  "masjid",
);
mkdirSync(out, { recursive: true });

const photos = [
  { file: "WhatsApp Image 2026-09-10 at 13.22.58 (1).jpeg", base: "prayer-hall-mihrab" },
  { file: "WhatsApp Image 2026-09-10 at 13.22.57 (5).jpeg", base: "prayer-hall-wide" },
  { file: "WhatsApp Image 2026-09-10 at 13.22.57 (1).jpeg", base: "prayer-hall-minbar" },
  { file: "WhatsApp Image 2026-09-10 at 13.22.58.jpeg", base: "prayer-hall-entrance" },
  { file: "WhatsApp Image 2026-09-10 at 13.22.57 (4).jpeg", base: "shoe-room" },
  { file: "WhatsApp Image 2026-09-10 at 13.22.57 (2).jpeg", base: "wudu-area" },
];

for (const photo of photos) {
  const input = path.join(source, photo.file);
  const meta = await sharp(input).rotate().metadata();
  for (const width of [1600, 800]) {
    const resized = sharp(input).rotate().resize({ width, withoutEnlargement: true });
    await resized
      .clone()
      .avif({ quality: 52 })
      .toFile(path.join(out, `${photo.base}-${width}.avif`));
    await resized
      .clone()
      .webp({ quality: 74 })
      .toFile(path.join(out, `${photo.base}-${width}.webp`));
  }
  console.log(photo.base, `${meta.width}x${meta.height}`, "done");
}
