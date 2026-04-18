import { siCashapp, siVenmo, siZelle } from "simple-icons";

type IconProps = {
  className?: string;
  size?: number;
  /** Use brand color fill (default true). */
  colored?: boolean;
};

/** Venmo mark — path from Simple Icons (MIT), for recognition only. */
export function VenmoBrandIcon({
  className = "",
  size = 28,
  colored = true,
}: IconProps) {
  const fill = colored ? `#${siVenmo.hex}` : "currentColor";
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Venmo</title>
      <path fill={fill} d={siVenmo.path} />
    </svg>
  );
}

/** Zelle mark — path from Simple Icons (MIT), for recognition only. */
export function ZelleBrandIcon({
  className = "",
  size = 28,
  colored = true,
}: IconProps) {
  const fill = colored ? `#${siZelle.hex}` : "currentColor";
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Zelle</title>
      <path fill={fill} d={siZelle.path} />
    </svg>
  );
}

/** Cash App mark — path from Simple Icons (MIT), for recognition only. */
export function CashAppBrandIcon({
  className = "",
  size = 28,
  colored = true,
}: IconProps) {
  const fill = colored ? `#${siCashapp.hex}` : "currentColor";
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Cash App</title>
      <path fill={fill} d={siCashapp.path} />
    </svg>
  );
}

/** Cart: payment marks with labels (checkout has full instructions). */
export function CartPaymentMethodsStrip() {
  return (
    <div className="mb-4 rounded-xl border border-[var(--border)] bg-gradient-to-r from-[var(--gold-light)]/35 to-white px-3 py-3 text-center shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Accepted forms of payment
      </p>
      <div
        className="flex flex-wrap items-center justify-center gap-4"
        role="group"
        aria-label="Accepted payment methods: Venmo, Zelle, and Cash App"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-[var(--border)]">
            <VenmoBrandIcon size={28} />
          </span>
          <span className="text-sm font-semibold text-[var(--text)]">Venmo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-[var(--border)]">
            <ZelleBrandIcon size={28} />
          </span>
          <span className="text-sm font-semibold text-[var(--text)]">Zelle</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-[var(--border)]">
            <CashAppBrandIcon size={28} />
          </span>
          <span className="text-sm font-semibold text-[var(--text)]">
            Cash App
          </span>
        </div>
      </div>
    </div>
  );
}
