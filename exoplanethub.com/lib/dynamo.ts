import 'server-only';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  type ScanCommandInput,
  type ScanCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import type { Planet } from '@/lib/mockPlanets';

// Omitting credentials entirely lets the SDK default provider chain (IAM role, SSO) take over.
const credentials =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined;

export const documentClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials,
  })
);

export const planetsTableName = process.env.EXOPLANETS_DATABASE_TABLE || 'exoplanets-dev';
export const recordsTableName = process.env.EXOPLANETS_RECORDS_TABLE || 'exoplanet-records-dev';

// The stored item is only a claim that it has Item's shape; callers own that trust.
export async function scanAll<Item>(scan: Omit<ScanCommandInput, 'ExclusiveStartKey'>): Promise<Item[]> {
  const items: Item[] = [];
  let cursor: ScanCommandOutput['LastEvaluatedKey'];

  do {
    const page: ScanCommandOutput = await documentClient.send(
      new ScanCommand({ ...scan, ExclusiveStartKey: cursor })
    );

    items.push(...((page.Items ?? []) as Item[]));
    cursor = page.LastEvaluatedKey;
  } while (cursor);

  return items;
}

// Aliasing every projected name keeps the field list free to grow without hitting a DynamoDB reserved word.
export function scanAllPlanets<Field extends keyof Planet>(
  fields: readonly [Field, ...Field[]]
): Promise<Pick<Planet, Field>[]> {
  return scanAll<Pick<Planet, Field>>({
    TableName: planetsTableName,
    ExpressionAttributeNames: Object.fromEntries(fields.map((field) => [`#${field}`, field])),
    ProjectionExpression: fields.map((field) => `#${field}`).join(', '),
  });
}
