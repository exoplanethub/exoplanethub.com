import 'server-only';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
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

// Aliasing every projected name keeps the field list free to grow without hitting a DynamoDB reserved word.
export async function scanAllPlanets<Field extends keyof Planet>(
  fields: readonly [Field, ...Field[]]
): Promise<Pick<Planet, Field>[]> {
  const expressionAttributeNames = Object.fromEntries(fields.map((field) => [`#${field}`, field]));
  const projectionExpression = fields.map((field) => `#${field}`).join(', ');

  const planets: Pick<Planet, Field>[] = [];
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

    planets.push(...((page.Items ?? []) as Pick<Planet, Field>[]));
    cursor = page.LastEvaluatedKey;
  } while (cursor);

  return planets;
}
