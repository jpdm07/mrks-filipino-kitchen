const steps = [
  {
    emoji: "🍽️",
    title: "Browse the Menu",
    body: "Explore lumpia, pancit, flan, tocino, and more.",
  },
  {
    emoji: "📝",
    title: "Place Your Order",
    body: "Choose sizes, add samples if you like, and check out.",
  },
  {
    emoji: "🚗",
    title: "Pick Up Fresh",
    body: "We confirm your pickup window. You pick up in Cypress, TX.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-center font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text)]">
        How It Works
      </h2>
      <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.title}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-[var(--shadow)] transition duration-300 hover:-translate-y-1 hover:border-[rgba(0,56,168,0.18)] hover:shadow-[var(--shadow-lg)]"
          >
            <span className="text-4xl" aria-hidden>
              {s.emoji}
            </span>
            <h3 className="mt-3 font-[family-name:var(--font-playfair)] text-xl font-bold">
              {s.title}
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
