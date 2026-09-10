/*
 * The masjid's own photographs, pre-optimised into AVIF/WebP pairs at 1600
 * and 800 wide by scripts/optimise-masjid-photos.mjs and served from
 * public/images/masjid. Alt text is required: every photo is content.
 */
const photos = {
  "prayer-hall-mihrab": { width: 1600, height: 1200 },
  "prayer-hall-wide": { width: 1600, height: 1200 },
  "prayer-hall-minbar": { width: 1600, height: 1200 },
  "prayer-hall-entrance": { width: 1600, height: 1200 },
  "shoe-room": { width: 1600, height: 1200 },
  "wudu-area": { width: 1200, height: 1600 },
} as const;

export type MasjidPhotoName = keyof typeof photos;

export function MasjidPhoto({
  name,
  alt,
  sizes = "100vw",
  priority = false,
  className,
}: {
  name: MasjidPhotoName;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const { width, height } = photos[name];
  const base = `/images/masjid/${name}`;
  return (
    <picture className={className}>
      <source
        type="image/avif"
        srcSet={`${base}-800.avif 800w, ${base}-1600.avif 1600w`}
        sizes={sizes}
      />
      <img
        src={`${base}-1600.webp`}
        srcSet={`${base}-800.webp 800w, ${base}-1600.webp 1600w`}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
      />
    </picture>
  );
}
