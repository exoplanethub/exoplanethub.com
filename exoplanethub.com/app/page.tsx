import Hero from "@/components/home/Hero";
import LatestDiscoveries from "@/components/home/LatestDiscoveries";

export const revalidate = 21600; // 6 hours in seconds

export default function Home() {
  return (
    <>
      <Hero />
      <LatestDiscoveries />
    </>
  );
}
