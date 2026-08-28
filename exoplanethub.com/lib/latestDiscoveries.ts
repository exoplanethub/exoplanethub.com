import 'server-only';
import { QueryCommand, type QueryCommandOutput } from '@aws-sdk/lib-dynamodb';
import { documentClient, planetsTableName } from '@/lib/dynamo';

// The sync Lambda writes absent NASA fields as null; disc_year is exempt because it keys
// year-index, and DynamoDB leaves items without it out of the index entirely.
export type LatestDiscovery = {
  pl_name: string;
  hostname: string | null;
  disc_year: number;
  discoverymethod: string | null;
};

export type LatestDiscoveriesResult =
  | { status: 'ok'; planets: LatestDiscovery[] }
  | { status: 'unavailable' };

const FEED_SIZE = 10;

// disc_year is the partition key of year-index, so recency is a walk back through
// discrete years rather than a single descending query.
const LOOKBACK_YEARS = 5;

async function queryYear(year: number, limit: number): Promise<LatestDiscovery[]> {
  const planets: LatestDiscovery[] = [];
  let cursor: QueryCommandOutput['LastEvaluatedKey'];

  do {
    const page: QueryCommandOutput = await documentClient.send(
      new QueryCommand({
        TableName: planetsTableName,
        IndexName: 'year-index',
        KeyConditionExpression: '#disc_year = :year',
        ExpressionAttributeNames: {
          '#disc_year': 'disc_year',
          '#pl_name': 'pl_name',
          '#hostname': 'hostname',
          '#discoverymethod': 'discoverymethod',
        },
        ExpressionAttributeValues: { ':year': year },
        ProjectionExpression: '#pl_name, #hostname, #disc_year, #discoverymethod',
        ScanIndexForward: true,
        Limit: limit - planets.length,
        ExclusiveStartKey: cursor,
      })
    );

    planets.push(...((page.Items ?? []) as LatestDiscovery[]));
    cursor = page.LastEvaluatedKey;
  } while (cursor && planets.length < limit);

  return planets;
}

export async function fetchLatestDiscoveries(): Promise<LatestDiscoveriesResult> {
  const currentYear = new Date().getUTCFullYear();
  const planets: LatestDiscovery[] = [];

  try {
    for (let year = currentYear; year > currentYear - LOOKBACK_YEARS; year--) {
      if (planets.length >= FEED_SIZE) break;
      planets.push(...(await queryYear(year, FEED_SIZE - planets.length)));
    }
  } catch (error) {
    console.error('Error fetching latest discoveries:', error);
    return { status: 'unavailable' };
  }

  return { status: 'ok', planets };
}
