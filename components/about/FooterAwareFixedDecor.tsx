"use client";

import { useEffect, useState, type ReactNode } from "react";

const FOOTER_SELECTOR = "footer[data-site-chrome]";

/** Pixels: hide decor when footer is this far below the viewport bottom (still off-screen). */
const HIDE_BEFORE_FOOTER_PX = 360;

type Props = {
  children: ReactNode;
  className?: string;
};

function footerOverlapsDecorZone(footer: HTMLElement): boolean {
  const r = footer.getBoundingClientRect();
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const intersectsViewport =
    r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  const approachingFromBelow =
    r.top > vh && r.top < vh + HIDE_BEFORE_FOOTER_PX;
  return intersectsViewport || approachingFromBelow;
}

/**
 * Wraps fixed viewport decorations so they are removed from the tree while the footer is in or
 * near the viewport — fixed layers often composite above the site footer despite z-index.
 */
export function FooterAwareFixedDecor({ children, className = "" }: Props) {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const footer = document.querySelector<HTMLElement>(FOOTER_SELECTOR);
    if (!footer) return;

    const sync = () => {
      setHide(footerOverlapsDecorZone(footer));
    };

    const observer = new IntersectionObserver(() => sync(), {
      threshold: 0,
      root: null,
      // Expand the viewport downward so we hide before the footer visually reaches the corner.
      rootMargin: `0px 0px ${HIDE_BEFORE_FOOTER_PX}px 0px`,
    });
    observer.observe(footer);
    sync();

    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  if (hide) {
    return null;
  }

  return <div className={className}>{children}</div>;
}
