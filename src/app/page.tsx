import { Hero } from "@/components/home/Hero";
import { MarqueeBand } from "@/components/home/MarqueeBand";
import { NewArrivals } from "@/components/home/NewArrivals";
import { SplitBanner } from "@/components/home/SplitBanner";
import { CampaignSection } from "@/components/home/CampaignSection";
import { EditorialBlock } from "@/components/home/EditorialBlock";
import { ValueProps } from "@/components/home/ValueProps";

/**
 * Home. Rhythm: hero → ticker → new arrivals → collections → campaign grid →
 * manifesto → values (the footer / newsletter is rendered by the root layout).
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <MarqueeBand />
      <NewArrivals />
      <SplitBanner />
      <CampaignSection />
      <EditorialBlock />
      <ValueProps />
    </>
  );
}
