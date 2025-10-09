import ExploreClient from './ExploreClient';
import { Planet } from '@/lib/mockPlanets';

async function getPlanets(): Promise<Planet[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/planets`, {
    next: { revalidate: 21600 }
  });
  return res.json();
}

export default async function ExplorePage() {
  const planets = await getPlanets();

  return <ExploreClient planets={planets} />;
}
