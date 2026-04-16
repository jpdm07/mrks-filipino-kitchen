/**
 * Full-bleed hero, Open Graph image, and culture-page decor.
 * Defaults use ~2400px-wide Unsplash sources so large screens stay sharp.
 *
 * To use your own `public/images/...` files, set env in `.env.local` (see `.env.example`).
 * For local heroes, export JPEG/WebP at least ~1920–2400px wide for best results.
 */

/**
 * Lumpia / spring rolls on a plate (Unsplash — described as lumpia with veg).
 * Hero & OG default. Override with `NEXT_PUBLIC_HERO_FULLBLEED_IMAGE` (e.g. `/images/lumpia.jpg`).
 */
const SHARP_HERO_STOCK =
  "https://images.unsplash.com/photo-1695712641388-87c0f9c2d36e?w=2400&q=90&auto=format&fit=crop";

/**
 * Culture FAQ corner — local file (previous default Unsplash URL 404’d).
 * Set `NEXT_PUBLIC_CULTURE_DECOR_IMAGE` to any `public/` path or `https://…` image.
 */
const DEFAULT_CULTURE_DECOR = "/images/pancit.jpg";

export const HERO_FULLBLEED_IMAGE_SRC =
  process.env.NEXT_PUBLIC_HERO_FULLBLEED_IMAGE?.trim() || SHARP_HERO_STOCK;

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
