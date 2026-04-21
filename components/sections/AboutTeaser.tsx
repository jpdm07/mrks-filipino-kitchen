import Link from "next/link";
import { PhilippineSun } from "@/components/PhilippineSun";

export function AboutTeaser() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div className="flex justify-center">
          <PhilippineSun size={192} color="var(--gold)" decorative />
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
