import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

export const revalidate = 21600; // 6 hours in seconds

export async function GET() {
  try {
    const command = new ScanCommand({
      TableName: process.env.EXOPLANETS_DATABASE_TABLE || 'exoplanets-dev',
    });

    const response = await docClient.send(command);
    const planets = response.Items || [];

    return NextResponse.json(planets);
  } catch (error) {
    console.error('Error fetching planets:', error);
    return NextResponse.json({ error: 'Failed to fetch planets' }, { status: 500 });
  }
}
