import { NextResponse } from 'next/server';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { documentClient, planetsTableName } from '@/lib/dynamo';

export const revalidate = 21600; // 6 hours in seconds

export async function GET() {
  try {
    const command = new ScanCommand({
      TableName: planetsTableName,
    });

    const response = await documentClient.send(command);
    const planets = response.Items || [];

    return NextResponse.json(planets);
  } catch (error) {
    console.error('Error fetching planets:', error);
    return NextResponse.json({ error: 'Failed to fetch planets' }, { status: 500 });
  }
}
