import { siVenmo, siZelle } from "simple-icons";

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

/** Compact cart strip: both marks + short copy. */
export function CartPaymentMethodsStrip() {
  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-gradient-to-r from-neutral-50 to-white px-3 py-2.5 shadow-sm"
      role="note"
    >
      <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
        We accept
      </span>
      <span className="flex items-center gap-2 rounded-lg bg-white px-2 py-1 shadow-sm ring-1 ring-neutral-100">
        <VenmoBrandIcon size={26} />
        <span className="text-xs font-semibold text-neutral-800">Venmo</span>
      </span>
      <span className="flex items-center gap-2 rounded-lg bg-white px-2 py-1 shadow-sm ring-1 ring-neutral-100">
        <ZelleBrandIcon size={26} />
        <span className="text-xs font-semibold text-neutral-800">Zelle</span>
      </span>
      <span className="min-w-0 flex-1 text-[11px] leading-snug text-neutral-600">
        Card checkout isn&apos;t available — you&apos;ll pay on the next step after
        checkout with your order number.
      </span>
    </div>
  );
}
