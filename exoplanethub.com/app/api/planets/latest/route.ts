import { NextResponse } from 'next/server';
import { fetchLatestDiscoveries } from '@/lib/latestDiscoveries';

export async function GET() {
  const result = await fetchLatestDiscoveries();

  if (result.status === 'unavailable') {
    return NextResponse.json(
      { error: 'Failed to fetch latest discoveries' },
      { status: 503 }
    );
  }

  return NextResponse.json(result.planets);
}
