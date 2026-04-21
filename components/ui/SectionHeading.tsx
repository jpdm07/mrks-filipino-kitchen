export function SectionHeading({
  title,
  subtitle,
  className = "",
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`text-center ${className}`}>
      <h2 className="font-playfair text-3xl font-black text-[color:var(--primary)] md:text-4xl">
        {title}
      </h2>
      <div
        className="mx-auto mt-4 flex max-w-xs items-center justify-center gap-2 md:max-w-sm"
        aria-hidden
      >
        <span className="h-px flex-1 rounded-full bg-[color:var(--gold-muted)]" />
        <span className="text-[color:var(--gold)]">✦</span>
        <span className="h-px flex-1 rounded-full bg-[color:var(--gold-muted)]" />
      </div>
      {subtitle ? (
        <p className="mt-4 font-cormorant text-lg italic text-[color:var(--text-muted)]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
