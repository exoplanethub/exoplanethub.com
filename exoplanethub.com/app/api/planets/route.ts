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

function determinePlanetType(radius: number): string {
  if (!radius) return 'Unknown';
  if (radius < 1.25) return 'Rocky';
  if (radius < 2) return 'Super Earth';
  if (radius < 6) return 'Neptune-like';
  return 'Gas Giant';
}

export async function GET() {
  try {
    const command = new ScanCommand({
      TableName: process.env.EXOPLANETS_DATABASE_TABLE || 'exoplanets-dev',
    });

    const response = await docClient.send(command);
    const data = response.Items || [];

    const planets = data
      .filter(p => p.pl_rade && p.pl_eqt && p.sy_dist)
      .map((p) => ({
        id: p.pl_name,
        name: p.pl_name,
        habitabilityScore: 0,
        distanceLightYears: p.sy_dist ? parseFloat((p.sy_dist * 3.262).toFixed(2)) : 0,
        radius: p.pl_rade ? parseFloat(p.pl_rade.toFixed(2)) : 0,
        temperature: p.pl_eqt ? Math.round(p.pl_eqt) : 0,
        type: determinePlanetType(p.pl_rade),
        star: p.hostname || 'Unknown',
        discovered: p.disc_year || 2000,
        imageUrl: '',
      }));

    return NextResponse.json(planets);
  } catch (error) {
    console.error('Error fetching planets:', error);
    return NextResponse.json({ error: 'Failed to fetch planets' }, { status: 500 });
  }
}
