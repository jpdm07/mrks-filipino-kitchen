import { FacebookIcon } from "@/components/ui/FacebookIcon";
import { SITE } from "@/lib/config";

export function FacebookButton({
  className = "",
  size = 24,
  label,
}: {
  className?: string;
  size?: number;
  label?: string;
}) {
  return (
    <a
      href={SITE.facebookUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[#1877F2] shadow-[0_2px_10px_rgba(0,40,100,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-[#1877F2]/35 hover:shadow-[0_10px_28px_rgba(24,119,242,0.2)] ${className}`}
      aria-label="Visit Mr. K's on Facebook"
    >
      <FacebookIcon size={size} />
      {label ? <span className="ml-2 font-medium">{label}</span> : null}
    </a>
  );
}
