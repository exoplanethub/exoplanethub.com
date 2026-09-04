import Hero from "@/components/home/Hero";
import RecordsStrip from "@/components/home/RecordsStrip";
import LatestDiscoveries from "@/components/home/LatestDiscoveries";

export default function Home() {
  return (
    <main>
      <Hero />
      <RecordsStrip />
      <LatestDiscoveries />
    </main>
  );
}
