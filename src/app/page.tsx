import { Hero } from "@/components/home/Hero";
import { NewArrivals } from "@/components/home/NewArrivals";
import { SplitBanner } from "@/components/home/SplitBanner";
import { CampaignSection } from "@/components/home/CampaignSection";
import { EditorialBlock } from "@/components/home/EditorialBlock";
import { ValueProps } from "@/components/home/ValueProps";

/**
 * Home page. Section order matches the reference site:
 * hero → new arrivals → split banner → campaign + grid → editorial → values
 * (the global newsletter footer is rendered by the root layout).
 *
 * Each section lives in its own component under `src/components/home/` and is
 * fleshed out by its own feature branch — see TASKS.md, Tanda 2.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <NewArrivals />
      <SplitBanner />
      <CampaignSection />
      <EditorialBlock />
      <ValueProps />
    </>
  );
}
