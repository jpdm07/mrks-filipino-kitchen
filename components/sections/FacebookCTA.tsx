import Link from "next/link";
import { FacebookIcon } from "@/components/ui/FacebookIcon";
import { SITE } from "@/lib/config";

export function FacebookCTA() {
  return (
    <section className="mx-auto max-w-xl px-4 py-16 text-center">
      <FacebookIcon size={48} className="mx-auto text-[#1877F2]" />
      <h2 className="mt-4 font-[family-name:var(--font-playfair)] text-2xl font-bold">
        Follow Us on Facebook
      </h2>
      <Link
        href={SITE.facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-facebook mt-6 px-8"
      >
        Visit Our Facebook Page
      </Link>
    </section>
  );
}
