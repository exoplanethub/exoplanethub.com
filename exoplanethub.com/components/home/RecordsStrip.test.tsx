import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DisplacedHolder, StoredRecord } from '@/lib/records';
import RecordsStrip, { RecordsStripList } from '@/components/home/RecordsStrip';

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

vi.mock('next/server', () => ({ connection: async () => {} }));

const FIRST_SYNC = '2026-08-14T03:00:12';
const LATER_SYNC = '2026-09-01T03:00:12';

function stored(
  record_id: string,
  pl_name: string,
  value: number,
  { since = FIRST_SYNC, previous = [] }: { since?: string; previous?: DisplacedHolder[] } = {}
): StoredRecord {
  return { record_id, holder: { pl_name, value }, since, previous, updated_at: since };
}

const WASP_33B: DisplacedHolder = {
  pl_name: 'WASP-33 b',
  value: 2781,
  since: '2026-06-01T03:00:00',
  until: LATER_SYNC,
};

const KEPLER_13AB: DisplacedHolder = {
  pl_name: 'Kepler-13 A b',
  value: 2750,
  since: '2026-05-01T03:00:00',
  until: WASP_33B.since,
};

const EVERY_BASELINE: StoredRecord[] = [
  stored('most-earth-like', 'TRAPPIST-1 e', 0.8342),
  stored('hottest', 'KELT-9 b', 4050),
  stored('largest', 'HAT-P-67 b', 23.6),
  stored('smallest', 'Kepler-37 b', 0.3),
  stored('most-massive', 'HD 106906 b', 3170),
  stored('shortest-year', 'KOI-1843.03', 0.1769),
  stored('nearest', 'Proxima Cen b', 1.3012),
];

async function renderStored(items: StoredRecord[]) {
  send.mockResolvedValue({ Items: items });
  render(await RecordsStripList());
}

function entryLabels() {
  return screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
}

function entry(label: string) {
  return screen.getByRole('heading', { level: 3, name: label }).closest('li') as HTMLElement;
}

beforeEach(() => {
  send.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('RecordsStrip shell', () => {
  it('names the section and links to the full records page whatever the data does', () => {
    render(<RecordsStrip />);

    expect(screen.getByRole('region', { name: 'Records' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See every record' })).toHaveAttribute('href', '/records');
  });
});

describe('RecordsStripList ordering', () => {
  it('shows three records, most recently changed first', async () => {
    await renderStored([
      ...EVERY_BASELINE.slice(0, 6),
      stored('nearest', 'Proxima Cen b', 1.3012, { since: LATER_SYNC, previous: [WASP_33B] }),
    ]);

    expect(entryLabels()).toEqual(['Nearest to us', 'Most Earth-like', 'Hottest']);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('keeps list semantics explicitly, since the stylesheet strips the markers', async () => {
    await renderStored(EVERY_BASELINE);

    expect(screen.getByRole('list')).toHaveAttribute('role', 'list');
  });

  it('breaks ties on registry order, not on the order the table returned', async () => {
    await renderStored([...EVERY_BASELINE].reverse());

    expect(entryLabels()).toEqual(['Most Earth-like', 'Hottest', 'Largest']);
  });

  it('shows every record when fewer than three are tracked', async () => {
    await renderStored([stored('hottest', 'KELT-9 b', 4050)]);

    expect(entryLabels()).toEqual(['Hottest']);
  });
});

describe('RecordsStripList entries', () => {
  it('links the holder to its planet page and shows the value through the registry formatter', async () => {
    await renderStored(EVERY_BASELINE);

    const hottest = entry('Hottest');
    expect(within(hottest).getByRole('link', { name: 'KELT-9 b' })).toHaveAttribute(
      'href',
      '/planet/KELT-9%20b'
    );
    expect(hottest).toHaveTextContent('4,050 K');
    expect(entry('Most Earth-like')).toHaveTextContent('ESI 83');
  });

  it('shows a baseline as holder and value only, never as a change', async () => {
    await renderStored(EVERY_BASELINE);

    const hottest = entry('Hottest');
    expect(hottest).not.toHaveTextContent(/took the record/i);
    expect(within(hottest).getAllByRole('link')).toHaveLength(1);
  });

  it('says who a changed record was taken from, and when, linking the displaced holder too', async () => {
    await renderStored([stored('hottest', 'KELT-9 b', 4050, { since: LATER_SYNC, previous: [WASP_33B] })]);

    const hottest = entry('Hottest');
    expect(hottest).toHaveTextContent('Took the record from WASP-33 b on September 1, 2026');
    expect(within(hottest).getByRole('link', { name: 'WASP-33 b' })).toHaveAttribute(
      'href',
      '/planet/WASP-33%20b'
    );
  });

  it('names the most recently displaced holder when the record has fallen more than once', async () => {
    await renderStored([
      stored('hottest', 'KELT-9 b', 4050, { since: LATER_SYNC, previous: [WASP_33B, KEPLER_13AB] }),
    ]);

    const hottest = entry('Hottest');
    expect(hottest).toHaveTextContent('Took the record from WASP-33 b on September 1, 2026');
    expect(hottest).not.toHaveTextContent('Kepler-13 A b');
    expect(within(hottest).getAllByRole('link')).toHaveLength(2);
  });

  it('dates the change by when the displaced holder lost it, not by the current holder', async () => {
    await renderStored([
      stored('hottest', 'KELT-9 b', 4050, { since: 'not a date', previous: [WASP_33B] }),
    ]);

    expect(entry('Hottest')).toHaveTextContent('Took the record from WASP-33 b on September 1, 2026');
  });

  it('still names the displaced holder when the change date cannot be read', async () => {
    await renderStored([
      stored('hottest', 'KELT-9 b', 4050, {
        since: LATER_SYNC,
        previous: [{ ...WASP_33B, until: 'not a date' }],
      }),
    ]);

    const hottest = entry('Hottest');
    expect(hottest).toHaveTextContent(/Took the record from WASP-33 b$/);
    expect(hottest).not.toHaveTextContent(/Invalid|null/);
  });

  it('omits the value rather than printing NaN when the stored value cannot be formatted', async () => {
    await renderStored([stored('largest', 'HAT-P-67 b', Number.NaN)]);

    const largest = entry('Largest');
    expect(within(largest).getByRole('link', { name: 'HAT-P-67 b' })).toBeInTheDocument();
    expect(largest).not.toHaveTextContent(/null|NaN/);
  });
});

describe('RecordsStripList when records cannot be shown', () => {
  it('matches the Latest Discoveries notice when the table cannot be read', async () => {
    send.mockRejectedValue(new Error('AccessDeniedException'));
    render(await RecordsStripList());

    expect(screen.getByText(/records are unavailable right now/i)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('says so rather than rendering nothing when the table is empty', async () => {
    await renderStored([]);

    expect(screen.getByText(/no records to show yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
