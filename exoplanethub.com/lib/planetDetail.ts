import 'server-only';
import { cache } from 'react';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { documentClient, planetsTableName } from '@/lib/dynamo';
import type { Planet } from '@/lib/mockPlanets';

// cache() shares one GetItem between generateMetadata and the page it titles.
// A read failure throws instead of resolving null, so only a genuine miss can become a cached 404.
export const getPlanetDetail = cache(async (planetName: string): Promise<Planet | null> => {
  const { Item } = await documentClient.send(
    new GetCommand({
      TableName: planetsTableName,
      Key: { pl_name: planetName },
    })
  );

  return (Item as Planet | undefined) ?? null;
});
