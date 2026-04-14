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

/** Cart: brand icons only; app names show on hover via native `title` tooltip. */
export function CartPaymentMethodsStrip() {
  return (
    <div
      className="mb-4 flex items-center gap-3 rounded-xl border border-neutral-200 bg-gradient-to-r from-neutral-50 to-white px-3 py-2.5 shadow-sm"
      role="group"
      aria-label="Accepted payment methods"
    >
      <span
        title="Venmo"
        className="inline-flex rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-neutral-100"
      >
        <VenmoBrandIcon size={28} />
      </span>
      <span
        title="Zelle"
        className="inline-flex rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-neutral-100"
      >
        <ZelleBrandIcon size={28} />
      </span>
    </div>
  );
}
