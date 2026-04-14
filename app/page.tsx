import { Suspense } from "react";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturedItems } from "@/components/sections/FeaturedItems";
import { PickupNotice } from "@/components/sections/PickupNotice";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { AboutTeaser } from "@/components/sections/AboutTeaser";
import { SuggestionPoll } from "@/components/sections/SuggestionPoll";
import { CustomOrderCTA } from "@/components/sections/CustomOrderCTA";
import { NewsletterStrip } from "@/components/sections/NewsletterStrip";
import { FacebookCTA } from "@/components/sections/FacebookCTA";
import { UpcomingPickupAvailability } from "@/components/availability/UpcomingPickupAvailability";

export const dynamic = "force-dynamic";

function FeaturedFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-center text-[var(--text-muted)]">
      Loading featured dishes…
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <Suspense fallback={<FeaturedFallback />}>
        <FeaturedItems />
      </Suspense>
      <UpcomingPickupAvailability />
      <PickupNotice />
      <HowItWorks />
      <AboutTeaser />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <SuggestionPoll />
      </div>
      <CustomOrderCTA />
      <NewsletterStrip />
      <FacebookCTA />
    </>
  );
}
