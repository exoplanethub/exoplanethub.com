// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/planets/route';

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

function scanInputs() {
  return send.mock.calls.map(([command]) => command.input as Record<string, unknown>);
}

beforeEach(() => {
  send.mockReset();
  delete process.env.EXOPLANETS_DATABASE_TABLE;
});

describe('GET /api/planets', () => {
  it('returns the scanned planets', async () => {
    send.mockResolvedValue({ Items: [KEPLER, TRAPPIST] });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([KEPLER, TRAPPIST]);
  });

  it('returns an empty list rather than null when the table is empty', async () => {
    send.mockResolvedValue({});

    await expect((await GET()).json()).resolves.toEqual([]);
  });

  it('scans the table named by EXOPLANETS_DATABASE_TABLE', async () => {
    process.env.EXOPLANETS_DATABASE_TABLE = 'exoplanets-prod';
    send.mockResolvedValue({ Items: [] });

    await GET();

    expect(scanInputs()[0].TableName).toBe('exoplanets-prod');
  });

  it('falls back to the dev table when the variable is unset', async () => {
    send.mockResolvedValue({ Items: [] });

    await GET();

    expect(scanInputs()[0].TableName).toBe('exoplanets-dev');
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

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to fetch planets' });
  });
});

// Unskip with the fix for #5: Scan returns at most 1MB per call, so the route must follow
// LastEvaluatedKey or it silently drops every planet past the first page.
describe.skip('GET /api/planets pagination (#5)', () => {
  it('follows LastEvaluatedKey until the scan is exhausted', async () => {
    send
      .mockResolvedValueOnce({ Items: [KEPLER], LastEvaluatedKey: { pl_name: 'Kepler-22 b' } })
      .mockResolvedValueOnce({ Items: [TRAPPIST] });

    const response = await GET();

    await expect(response.json()).resolves.toEqual([KEPLER, TRAPPIST]);
    expect(send).toHaveBeenCalledTimes(2);
    expect(scanInputs()[1].ExclusiveStartKey).toEqual({ pl_name: 'Kepler-22 b' });
  });
});
