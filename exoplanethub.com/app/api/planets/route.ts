import { NextResponse } from 'next/server';
import { ScanCommand, type ScanCommandOutput } from '@aws-sdk/lib-dynamodb';
import { documentClient, planetsTableName } from '@/lib/dynamo';
import { PLANET_SUMMARY_FIELDS, type PlanetSummary } from '@/lib/mockPlanets';

// Aliasing every projected name keeps the field list free to grow without hitting a DynamoDB reserved word.
const expressionAttributeNames = Object.fromEntries(
  PLANET_SUMMARY_FIELDS.map((field) => [`#${field}`, field])
);
const projectionExpression = PLANET_SUMMARY_FIELDS.map((field) => `#${field}`).join(', ');

// Data changes at most every 6h, so CDN staleness up to an hour is harmless and spares a full Scan per request.
const CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=21600';

async function scanAllPlanets(): Promise<PlanetSummary[]> {
  const planets: PlanetSummary[] = [];
  let cursor: ScanCommandOutput['LastEvaluatedKey'];

  do {
    const page: ScanCommandOutput = await documentClient.send(
      new ScanCommand({
        TableName: planetsTableName,
        ExpressionAttributeNames: expressionAttributeNames,
        ProjectionExpression: projectionExpression,
        ExclusiveStartKey: cursor,
      })
    );

    planets.push(...((page.Items ?? []) as PlanetSummary[]));
    cursor = page.LastEvaluatedKey;
  } while (cursor);

  return planets;
}

export async function GET() {
  try {
    return NextResponse.json(await scanAllPlanets(), {
      headers: { 'Cache-Control': CACHE_CONTROL },
    });
  } catch (error) {
    console.error('Error fetching planets:', error);
    return NextResponse.json({ error: 'Failed to fetch planets' }, { status: 500 });
  }
}
