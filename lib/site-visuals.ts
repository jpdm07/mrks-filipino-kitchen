/**
 * Full-bleed hero, Open Graph image, and culture-page decor.
 *
 * Default hero matches the menu photo at `public/images/sinigang.jpg`.
 * Override with `NEXT_PUBLIC_HERO_FULLBLEED_IMAGE` (e.g. another `/images/...` path).
 * For local hero files, JPEG/WebP at least ~1920–2400px wide for best results.
 */

/** Same folder as other menu card assets (`public/images/`). */
const DEFAULT_HERO_IMAGE = "/images/sinigang.jpg";

/**
 * Culture FAQ corner — local file (previous default Unsplash URL 404’d).
 * Set `NEXT_PUBLIC_CULTURE_DECOR_IMAGE` to any `public/` path or `https://…` image.
 */
const DEFAULT_CULTURE_DECOR = "/images/pancit.jpg";

export const HERO_FULLBLEED_IMAGE_SRC =
  process.env.NEXT_PUBLIC_HERO_FULLBLEED_IMAGE?.trim() || DEFAULT_HERO_IMAGE;

/** Facebook / iMessage / etc. link preview; optional override so OG can differ from homepage hero. */
export const OPEN_GRAPH_IMAGE_SRC =
  process.env.NEXT_PUBLIC_OG_IMAGE?.trim() || HERO_FULLBLEED_IMAGE_SRC;

export const CULTURE_DECOR_IMAGE_SRC =
  process.env.NEXT_PUBLIC_CULTURE_DECOR_IMAGE?.trim() || DEFAULT_CULTURE_DECOR;

/** Local files skip the image optimizer to avoid extra JPEG softness on upload. */
export function nextImageSharpnessProps(src: string): {
  quality: number;
  unoptimized: boolean;
} {
  const local = src.startsWith("/");
  return { quality: local ? 100 : 92, unoptimized: local };
}
