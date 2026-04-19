import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FooterAwareFixedDecor } from "@/components/about/FooterAwareFixedDecor";
import { FILIPINO_CULTURE_FAQ } from "@/lib/filipino-culture-faq";
import {
  CULTURE_DECOR_IMAGE_SRC,
  nextImageSharpnessProps,
} from "@/lib/site-visuals";

export const metadata: Metadata = {
  title: "Filipino Culture & Trivia | Mr. K's Filipino Kitchen",
  description:
    "Friendly FAQ about Filipino food and culture—pancit birthdays, silog, sawsawan, and more. Learn a little before you order pickup in Cypress, TX.",
  openGraph: {
    title: "Filipino Culture & Trivia | Mr. K's Filipino Kitchen",
    description:
      "Short answers about Filipino food traditions, language, and table culture—perfect if you're new to the cuisine.",
  },
};

export default function CulturePage() {
  const decorSrc = CULTURE_DECOR_IMAGE_SRC;
  const decorSharp = nextImageSharpnessProps(decorSrc);
  return (
    <div className="pattern-bg relative min-h-[min(100vh,1200px)]">
      <FooterAwareFixedDecor className="pointer-events-none fixed bottom-0 left-0 z-[1] h-[min(46vh,360px)] w-[min(92vw,360px)] bg-[var(--bg-section)] sm:h-[min(58vh,560px)] sm:w-[min(640px,50vw)]">
        <div className="relative h-full w-full" aria-hidden>
          <Image
            src={decorSrc}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 55vw, 960px"
            className="object-cover object-left object-bottom opacity-[0.36]"
            {...decorSharp}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to left, rgb(247, 242, 234) 0%, rgba(247, 242, 234, 0.9) 32%, rgba(247, 242, 234, 0.22) 62%, transparent 85%)",
            }}
          />
        </div>
      </FooterAwareFixedDecor>

      <div className="relative z-[2] mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
          For curious eaters
        </p>
        <h1 className="mt-2 text-center font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text)] sm:text-4xl">
          Filipino culture & trivia
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-[var(--text-muted)]">
          A small FAQ about food, language, and customs—nothing academic, just
          things guests often ask. Traditions differ by family and region; think
          of this as a friendly doorway, not the final word.
        </p>

        <div className="mt-10 space-y-3">
          {FILIPINO_CULTURE_FAQ.map((item) => (
            <details
              key={item.question}
              className="group rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-[var(--shadow-sm)] transition-[box-shadow] open:shadow-[var(--shadow-md)]"
            >
              <summary className="cursor-pointer list-none rounded-sm font-semibold text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-3">
                  <span>{item.question}</span>
                  <span
                    className="shrink-0 text-[var(--primary)] transition-transform group-open:rotate-180"
                    aria-hidden
                  >
                    ▼
                  </span>
                </span>
              </summary>
              <p className="mt-3 border-t border-[var(--border)] pt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                {item.answer}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-12 rounded-[var(--radius)] border border-[var(--gold)]/35 bg-[var(--gold)]/10 px-5 py-6 text-center">
          <p className="text-sm font-medium text-[var(--text)]">
            Hungry yet?{" "}
            <Link
              href="/menu"
              className="font-bold text-[var(--primary)] underline decoration-[var(--primary)]/35 underline-offset-4 hover:decoration-[var(--primary)]"
            >
              Browse the menu
            </Link>{" "}
            or{" "}
            <Link
              href="/about"
              className="font-bold text-[var(--primary)] underline decoration-[var(--primary)]/35 underline-offset-4 hover:decoration-[var(--primary)]"
            >
              read our story
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
