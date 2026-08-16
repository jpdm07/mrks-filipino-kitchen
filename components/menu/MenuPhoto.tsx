"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { resolvePublicMenuPhotoSrc } from "@/lib/menu-photo-url";
import { nextImageSharpnessProps } from "@/lib/site-visuals";

type Props = {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
  menuItemId?: string | null;
  displayName?: string | null;
  priority?: boolean;
};

/**
 * Menu / cart photo that skips broken empty srcs, stale renamed files, and
 * Next optimizer failures on local kitchen photos.
 */
export function MenuPhoto({
  src,
  alt,
  sizes,
  className,
  menuItemId,
  displayName,
  priority,
}: Props) {
  const [failed, setFailed] = useState(false);
  const resolved = resolvePublicMenuPhotoSrc(src, menuItemId, displayName);
  useEffect(() => {
    setFailed(false);
  }, [resolved]);
  if (!resolved || failed) {
    return (
      <div
        className="absolute inset-0 bg-[var(--bg-section)]"
        aria-hidden
      />
    );
  }
  const sharp = nextImageSharpnessProps(resolved);
  return (
    <Image
      src={resolved}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      priority={priority}
      quality={sharp.quality}
      unoptimized={sharp.unoptimized || /^https?:\/\//i.test(resolved)}
      onError={() => setFailed(true)}
    />
  );
}
