import { NextResponse } from 'next/server';
import { scanAllPlanets } from '@/lib/dynamo';
import { PLANET_SUMMARY_FIELDS } from '@/lib/mockPlanets';

// Data changes at most every 6h, so CDN staleness up to an hour is harmless and spares a full Scan per request.
const CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=21600';

export async function GET() {
  try {
    return NextResponse.json(await scanAllPlanets(PLANET_SUMMARY_FIELDS), {
      headers: { 'Cache-Control': CACHE_CONTROL },
    });
  } catch (error) {
    console.error('Error fetching planets:', error);
    return NextResponse.json({ error: 'Failed to fetch planets' }, { status: 500 });
  }
}
