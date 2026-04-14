import Link from "next/link";

export function AboutTeaser() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div className="flex justify-center">
          <svg
            viewBox="0 0 200 200"
            className="h-48 w-48 text-[var(--gold)] md:h-56 md:w-56"
            aria-hidden
          >
            {[...Array(8)].map((_, i) => {
              const a = (i / 8) * Math.PI * 2;
              const x1 = 100 + Math.cos(a) * 30;
              const y1 = 100 + Math.sin(a) * 30;
              const x2 = 100 + Math.cos(a) * 85;
              const y2 = 100 + Math.sin(a) * 85;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              );
            })}
            <circle cx="100" cy="100" r="28" fill="var(--primary)" />
          </svg>
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text)]">
            Our Story
          </h2>
          <p className="mt-4 leading-relaxed text-[var(--text-muted)]">
            <strong>Mr. K&apos;s Filipino Kitchen</strong> is our family pickup
            kitchen in Cypress. The name is for our son, Mr. K. His parent runs
            the stove here. She came to Houston in 2008, far from friends and
            family, and could not find Filipino food that truly felt like home
            until she put in the years to cook it herself. Our heritage, our
            neighbors, and the generations ahead are why we share it now.
          </p>
          <Link
            href="/about"
            className="btn btn-primary btn-sm px-6 mt-6"
          >
            Read Our Full Story
          </Link>
        </div>
      </div>
    </section>
  );
}
