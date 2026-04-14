import { Car } from "lucide-react";

export function PickupBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/20 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-md transition hover:border-white/70 hover:bg-white/30">
      <Car className="h-5 w-5 shrink-0" aria-hidden />
      Pickup Only · Cypress, TX 77433
    </span>
  );
}
