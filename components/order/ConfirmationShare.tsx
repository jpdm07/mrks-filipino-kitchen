"use client";

import { useState } from "react";
import { SITE } from "@/lib/config";

export function ConfirmationShare({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const shareFb = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <button
        type="button"
        onClick={shareFb}
        className="btn btn-facebook btn-sm px-5"
      >
        Share on Facebook
      </button>
      <button
        type="button"
        onClick={copy}
        className="btn btn-outline-dark btn-sm px-5"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
      <a
        href={SITE.facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-outline-dark btn-sm px-5 text-center font-semibold text-[var(--primary)]"
      >
        Facebook page
      </a>
    </div>
  );
}
