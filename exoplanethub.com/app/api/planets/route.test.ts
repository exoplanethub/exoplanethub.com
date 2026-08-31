// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PLANET_SUMMARY_FIELDS } from '@/lib/mockPlanets';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class {},
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send }) },
  ScanCommand: class {
    constructor(readonly input: Record<string, unknown>) {}
  },
}));

const KEPLER = { pl_name: 'Kepler-22 b', disc_year: 2011 };
const TRAPPIST = { pl_name: 'TRAPPIST-1 e', disc_year: 2017 };

// Re-evaluates the module graph, so a table name captured at import still reflects env set in the test body.
async function importRouteWithCurrentEnv() {
  vi.resetModules();
  return (await import('@/app/api/planets/route')).GET;
}

function scanInputs() {
  return send.mock.calls.map(([command]) => command.input as Record<string, unknown>);
}

// Resolves the '#alias, #alias' projection back to the attribute names DynamoDB will actually return.
function projectedFields(input: Record<string, unknown>) {
  const names = input.ExpressionAttributeNames as Record<string, string>;
  return (input.ProjectionExpression as string).split(', ').map((alias) => names[alias]);
}

beforeEach(() => {
  send.mockReset();
  delete process.env.EXOPLANETS_DATABASE_TABLE;
});

describe('GET /api/planets', () => {
  it('returns the scanned planets', async () => {
    send.mockResolvedValue({ Items: [KEPLER, TRAPPIST] });
    const GET = await importRouteWithCurrentEnv();

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([KEPLER, TRAPPIST]);
  });

  it('returns an empty list rather than null when the table is empty', async () => {
    send.mockResolvedValue({});
    const GET = await importRouteWithCurrentEnv();

    await expect((await GET()).json()).resolves.toEqual([]);
  });

  it('scans the table named by EXOPLANETS_DATABASE_TABLE', async () => {
    process.env.EXOPLANETS_DATABASE_TABLE = 'exoplanets-prod';
    send.mockResolvedValue({ Items: [] });
    const GET = await importRouteWithCurrentEnv();

    await GET();

    expect(scanInputs()[0].TableName).toBe('exoplanets-prod');
  });

  it('falls back to the dev table when the variable is unset', async () => {
    send.mockResolvedValue({ Items: [] });
    const GET = await importRouteWithCurrentEnv();

    await GET();

    expect(scanInputs()[0].TableName).toBe('exoplanets-dev');
  });
});

describe('GET /api/planets projection', () => {
  it.each([
    ['esi', 'the badge has a score to render'],
    ['pl_orbper', 'the orbital period range filter has a value to compare'],
    ['st_teff', 'the star type filter has a temperature to band'],
  ])('projects %s, so %s', async (field) => {
    send.mockResolvedValue({ Items: [] });
    const GET = await importRouteWithCurrentEnv();

    await GET();

    expect(projectedFields(scanInputs()[0])).toContain(field);
  });

  it('projects exactly the shared summary field list', async () => {
    send.mockResolvedValue({ Items: [] });
    const GET = await importRouteWithCurrentEnv();

    await GET();

    expect(projectedFields(scanInputs()[0])).toEqual([...PLANET_SUMMARY_FIELDS]);
  });

  it('projects every page, not just the first', async () => {
    send
      .mockResolvedValueOnce({ Items: [KEPLER], LastEvaluatedKey: { pl_name: 'Kepler-22 b' } })
      .mockResolvedValueOnce({ Items: [TRAPPIST] });
    const GET = await importRouteWithCurrentEnv();

    await GET();

    expect(projectedFields(scanInputs()[1])).toEqual([...PLANET_SUMMARY_FIELDS]);
  });

  it('lets the CDN serve the scan for an hour and refresh it in the background', async () => {
    send.mockResolvedValue({ Items: [] });
    const GET = await importRouteWithCurrentEnv();

    const response = await GET();

    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=3600, stale-while-revalidate=21600'
    );
  });
});

describe('GET /api/planets failure handling', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('reports 500 without leaking the underlying error', async () => {
    send.mockRejectedValue(new Error('ResourceNotFoundException: no such table'));
    const GET = await importRouteWithCurrentEnv();

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to fetch planets' });
  });
});

describe('GET /api/planets pagination (#5)', () => {
  it('follows LastEvaluatedKey until the scan is exhausted', async () => {
    send
      .mockResolvedValueOnce({ Items: [KEPLER], LastEvaluatedKey: { pl_name: 'Kepler-22 b' } })
      .mockResolvedValueOnce({ Items: [TRAPPIST] });
    const GET = await importRouteWithCurrentEnv();

    const response = await GET();

    await expect(response.json()).resolves.toEqual([KEPLER, TRAPPIST]);
    expect(send).toHaveBeenCalledTimes(2);
    expect(scanInputs()[1].ExclusiveStartKey).toEqual({ pl_name: 'Kepler-22 b' });
  });
});
