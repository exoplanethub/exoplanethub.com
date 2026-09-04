// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlanetRecord, RecordsResult, StoredRecord } from '@/lib/records';

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

const REGISTRY_ORDER = [
  'most-earth-like',
  'hottest',
  'largest',
  'smallest',
  'most-massive',
  'shortest-year',
  'nearest',
];

function stored(record_id: string, pl_name: string, value: number): StoredRecord {
  return {
    record_id,
    holder: { pl_name, value },
    since: '2026-08-14T03:00:12',
    previous: [],
    updated_at: '2026-09-01T03:00:12',
  };
}

const EVERY_RECORD: StoredRecord[] = [
  stored('most-earth-like', 'TRAPPIST-1 e', 0.8342),
  stored('hottest', 'KELT-9 b', 4050),
  stored('largest', 'HAT-P-67 b', 23.6),
  stored('smallest', 'Kepler-37 b', 0.3),
  stored('most-massive', 'HD 106906 b', 3170),
  stored('shortest-year', 'KOI-1843.03', 0.1769),
  stored('nearest', 'Proxima Cen b', 1.3012),
];

// Re-evaluates the module graph, so a table name captured at import still reflects env set in the test body.
async function importRecordsWithCurrentEnv() {
  vi.resetModules();
  return (await import('@/lib/records')).fetchRecords;
}

async function fetchStored(items: StoredRecord[]): Promise<RecordsResult> {
  send.mockResolvedValue({ Items: items });
  const fetchRecords = await importRecordsWithCurrentEnv();
  return fetchRecords();
}

function recordsOf(result: RecordsResult): PlanetRecord[] {
  if (result.status !== 'ok') throw new Error(`Expected ok, got ${result.status}`);
  return result.records;
}

function getInputs() {
  return send.mock.calls.map(([command]) => command.input as Record<string, unknown>);
}

beforeEach(() => {
  send.mockReset();
  delete process.env.EXOPLANETS_RECORDS_TABLE;
});

describe('fetchRecords ordering', () => {
  it('returns every tracked record in registry order, whatever order the Scan yields', async () => {
    const records = recordsOf(await fetchStored([...EVERY_RECORD].reverse()));

    expect(records.map((record) => record.id)).toEqual(REGISTRY_ORDER);
  });

  it('carries the stored state through under the registry label and blurb', async () => {
    const [hottest] = recordsOf(
      await fetchStored([
        {
          ...stored('hottest', 'KELT-9 b', 4050),
          previous: [
            { pl_name: 'WASP-33 b', value: 2781, since: '2026-06-01T03:00:00', until: '2026-08-14T03:00:12' },
          ],
        },
      ])
    );

    expect(hottest).toMatchObject({
      id: 'hottest',
      label: 'Hottest',
      holder: { pl_name: 'KELT-9 b', value: 4050 },
      since: '2026-08-14T03:00:12',
      previous: [{ pl_name: 'WASP-33 b', value: 2781 }],
      updated_at: '2026-09-01T03:00:12',
    });
    expect(hottest.blurb).toMatch(/hottest/i);
    expect(hottest).not.toHaveProperty('record_id');
  });
});

describe('fetchRecords registry intersection', () => {
  it('drops a stored id the registry does not know', async () => {
    const records = recordsOf(await fetchStored([stored('coolest', 'Kepler-1654 b', 206), ...EVERY_RECORD]));

    expect(records.map((record) => record.id)).toEqual(REGISTRY_ORDER);
  });

  it('omits a registry id the table has no item for', async () => {
    const records = recordsOf(await fetchStored(EVERY_RECORD.filter((item) => item.record_id !== 'nearest')));

    expect(records.map((record) => record.id)).toEqual(REGISTRY_ORDER.filter((id) => id !== 'nearest'));
  });

  it('reports ok with no records when the table is empty', async () => {
    await expect(fetchStored([])).resolves.toEqual({ status: 'ok', records: [] });
  });
});

describe('fetchRecords formatting', () => {
  it.each([
    ['most-earth-like', 'ESI 83'],
    ['hottest', '4,050 K'],
    ['largest', '23.6 × Earth'],
    ['smallest', '0.3 × Earth'],
    ['most-massive', '3,170 × Earth'],
    ['shortest-year', '0.1769 days'],
    ['nearest', '4.244 light-years away'],
  ])('formats %s as the planet page would', async (id, expected) => {
    const record = recordsOf(await fetchStored(EVERY_RECORD)).find((candidate) => candidate.id === id);
    if (!record) throw new Error(`No record ${id}`);

    expect(record.format(record.holder.value)).toBe(expected);
  });

  it('formats a displaced holder with the same formatter as the current one', async () => {
    const [largest] = recordsOf(await fetchStored([stored('largest', 'HAT-P-67 b', 23.6)]));

    expect(largest.format(2.05)).toBe('2.05 × Earth');
  });

  it('reads a corrupt value as unknown rather than rendering NaN, for every record', async () => {
    const records = recordsOf(await fetchStored(EVERY_RECORD));

    for (const record of records) {
      expect(record.format(Number.NaN), record.id).toBeNull();
    }
  });
});

describe('fetchRecords reads', () => {
  it('follows LastEvaluatedKey until the Scan is exhausted', async () => {
    send
      .mockResolvedValueOnce({ Items: EVERY_RECORD.slice(0, 3), LastEvaluatedKey: { record_id: 'largest' } })
      .mockResolvedValueOnce({ Items: EVERY_RECORD.slice(3) });
    const fetchRecords = await importRecordsWithCurrentEnv();

    const records = recordsOf(await fetchRecords());

    expect(records.map((record) => record.id)).toEqual(REGISTRY_ORDER);
    expect(getInputs().map((input) => input.ExclusiveStartKey)).toEqual([undefined, { record_id: 'largest' }]);
  });

  it('reads the table named by EXOPLANETS_RECORDS_TABLE', async () => {
    process.env.EXOPLANETS_RECORDS_TABLE = 'exoplanet-records-prod';

    await fetchStored([]);

    expect(getInputs()[0].TableName).toBe('exoplanet-records-prod');
  });

  it('falls back to the dev table when the variable is unset', async () => {
    await fetchStored([]);

    expect(getInputs()[0].TableName).toBe('exoplanet-records-dev');
  });
});

describe('fetchRecords failure handling', () => {
  it('reports unavailable instead of throwing when the Scan fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    send.mockRejectedValue(new Error('AccessDeniedException'));
    const fetchRecords = await importRecordsWithCurrentEnv();

    await expect(fetchRecords()).resolves.toEqual({ status: 'unavailable' });
  });

  it('reports unavailable when a later page fails, rather than a partial ok', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    send
      .mockResolvedValueOnce({ Items: EVERY_RECORD.slice(0, 3), LastEvaluatedKey: { record_id: 'largest' } })
      .mockRejectedValueOnce(new Error('ProvisionedThroughputExceededException'));
    const fetchRecords = await importRecordsWithCurrentEnv();

    await expect(fetchRecords()).resolves.toEqual({ status: 'unavailable' });
  });
});
