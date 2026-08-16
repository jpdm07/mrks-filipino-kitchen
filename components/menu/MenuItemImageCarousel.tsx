"use client";

import { useCallback, useEffect, useState } from "react";
import { MenuPhoto } from "@/components/menu/MenuPhoto";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  urls: string[];
  alt: string;
  sizes?: string;
};

/**
 * Prev/next + dots for menu cards when `menuItemDisplayPhotos` returns 2+ URLs.
 * Parent must be `relative` with a fixed aspect ratio so `fill` images size correctly.
 */
export function MenuItemImageCarousel({
  urls,
  alt,
  sizes = "(max-width:768px) 100vw, 33vw",
}: Props) {
  const list = urls.filter(Boolean);
  const [i, setI] = useState(0);

  useEffect(() => {
    setI((prev) => {
      if (list.length === 0) return 0;
      return Math.min(prev, list.length - 1);
    });
  }, [list.length]);

  const n = list.length;
  const idx = n ? ((i % n) + n) % n : 0;
  const prev = useCallback(() => {
    setI((k) => (k - 1 + n) % n);
  }, [n]);
  const next = useCallback(() => {
    setI((k) => (k + 1) % n);
  }, [n]);

  if (n < 2) return null;

  return (
    <>
      <MenuPhoto
        key={list[idx]}
        src={list[idx]}
        alt={`${alt} — photo ${idx + 1} of ${n}`}
        className="object-cover transition duration-500 group-hover:scale-[1.03]"
        sizes={sizes}
        priority={idx === 0}
      />
      <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-between px-1 sm:px-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            prev();
          }}
          className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60 motion-reduce:transition-none"
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            next();
          }}
          className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60 motion-reduce:transition-none"
          aria-label="Next photo"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <div
        className="pointer-events-none absolute bottom-2 left-0 right-0 z-[2] flex justify-center gap-1.5"
        role="tablist"
        aria-label="Photos"
      >
        {list.map((_, j) => (
          <button
            key={j}
            type="button"
            onClick={() => setI(j)}
            className={`pointer-events-auto h-2 rounded-full transition-all motion-reduce:transition-none ${
              j === idx
                ? "w-5 bg-white"
                : "w-2 bg-white/50 hover:bg-white/70"
            }`}
            aria-label={`Show photo ${j + 1}`}
            aria-current={j === idx ? "true" : undefined}
          />
        ))}
      </div>
    </>
  );
}
