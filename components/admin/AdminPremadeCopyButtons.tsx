"use client";

export type PremadeCopyOption = {
  id: string;
  label: string;
  blurb: string;
};

export function AdminPremadeCopyButtons({
  options,
  activeId,
  onSelect,
}: {
  options: PremadeCopyOption[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold">Premade copy</p>
      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
        Pick one so you don&apos;t have to write from scratch. You can still edit
        before sending.
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((t) => {
          const active = activeId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                active
                  ? "border-[color:var(--gold-muted)] bg-[color:rgba(212,169,68,0.16)] ring-1 ring-[color:var(--gold-muted)]"
                  : "border-[var(--border)] bg-[var(--bg)] hover:border-[color:var(--gold-muted)]"
              }`}
            >
              <span className="font-semibold text-[color:var(--primary)]">
                {t.label}
              </span>
              <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                {t.blurb}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
